import fs from 'fs';
import cli from '../src/cli.js';
import Options from '../src/options.js';
import Asset from '../src/asset.js';
import Task from './task.js';

export default class WriteObjectJson extends Task {
    static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
			dbFile: true,
            fieldsFile: true, 
			clientConfig: true,
            readOnly: true
		}; 
	}

	async run (opt) {
		const {
			db,
			fieldsFile,
			clientConfig,
			fromServer,
			id
		} = opt;
		if(!opt.obj) opt.obj = [];

		let calcedId = await Asset.calcIdIfNull({ db, id });
		let calcedFile = [await Asset.getFileById({ db, id: calcedId })] || fieldsFile;

		for (var i = 0; i < calcedFile.length; i++) {
			const file = calcedFile[i];
			const ffp = new FieldFileProcessor({ db, file, clientConfig, fromServer, id: calcedId, spinner: this.spinner });
			const obj = await ffp.start();
			opt.obj.push(obj);
		}
	}
}

class FieldFileProcessor {
	constructor (opt) {
		this.db = opt.db;
		this.file = opt.file;
		this.clientConfig = opt.clientConfig;
		this.fromServer = opt.fromServer;
		this.id = opt.id;
		this.spinner = opt.spinner;
	}

	async start () {
		const {
			db,
			file,
			clientConfig,
			spinner,
			fromServer,
			id
		} = this;

		const outFile = Options.generateOutputFile(file, `object.json`);

		spinner.start(`Generating ${cli.blue(outFile)} File`);

		const tree = await Asset.getById({
			db,
			assetFile: file,
			clientConfig,
			linkedId: id,
			file,
			enhance: fromServer === undefined
		});
		
		if (!fromServer)
			fs.writeFileSync(outFile, JSON.stringify(tree, null, 2));

		spinner.succeed();

		return JSON.stringify(tree);
	}
}

// Start app if file is run from CLI
WriteObjectJson.runWhenMain();