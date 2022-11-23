import fs from 'fs';
import sql from '../src/sqlite.js';
import cli from '../src/cli.js';
import Options from '../src/options.js';
import Task from './task.js';

export default class WriteFieldsJson extends Task {
    static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
			dbFile: true,
            fieldsFile: true, 
            readOnly: true
		}; 
	}

	async run (opt) {
		const {
			db,
			fieldsFile
		} = opt;

		for (var i = 0; i < fieldsFile.length; i++) {
			const file = fieldsFile[i];
			const ffp = new FieldFileProcessor({ db, file, spinner: this.spinner });
			await ffp.start();
		}
	}
	
}

class FieldFileProcessor {
	constructor (opt) {
		this.db = opt.db;
		this.file = opt.file;
		this.spinner = opt.spinner;
	}

	async start () {
		const {
			db,
			file,
			spinner
		} = this;

		const outFile = Options.generateOutputFile(file, 'fields.json');

		spinner.start(`Generating ${cli.blue(outFile)} File`);

		const fields = await sql.all(db, `SELECT * FROM fields WHERE file = $1 AND type = 'field' ORDER BY position`, [file]);
		
		const output = {};

		for(let i = 0; i < fields.length; i++) {
			fields[i].other_groups = JSON.parse(fields[i].other_groups).filter(g => g !== 'Other Fields');
			output[fields[i].full_name] = { ...fields[i] };
		}
		
		//Options.SHOW_JSON && jsome(output);
		//Options.SHOW_JSON_PRETTY && console.log(prettyjson.render(output));
		
		fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
		
		spinner.succeed();
	}
}

// Start app if file is run from CLI
WriteFieldsJson.runWhenMain();