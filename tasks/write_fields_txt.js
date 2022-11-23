import fs from 'fs';
import sql from './src/sqlite.js';
import cli from './src/cli.js';
import Options from './src/options.js';
import fws from 'fixed-width-string';
import Task from './task.js';

export default class WriteFieldsTxt extends Task {
    static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
			dbFile: true,
            fieldsFile: true,
			sortBy: true, 
            readOnly: true
		}; 
	}

	async run (opt) {
		const {
			db,
			fieldsFile,
			sortBy
		} = opt;

		for (var i = 0; i < fieldsFile.length; i++) {
			const file = fieldsFile[i];
			for (var j = 0; j < sortBy.length; j++) {
				const ffp = new FieldFileProcessor({ db, file, sortBy: sortBy[j], spinner: this.spinner });
				await ffp.start();
			}
		}
	}
	
}

class FieldFileProcessor {
	constructor (opt) {
		this.db = opt.db;
		this.file = opt.file;
		this.sortBy = opt.sortBy;
		this.spinner = opt.spinner;
	}

	async start () {
		const {
			db,
			file,
			sortBy,
			spinner
		} = this;

		//const sortBy = { position: 'position', full_name: 'full_name' }[arg1] || 'position';

		const outFile = Options.generateOutputFile(file, `fields_list_by_${sortBy}.txt`);

		spinner.start(`Generating ${cli.blue(outFile)} File Sorted By ${sortBy}`);

		// Open file stream
		const fileStream = fs.createWriteStream(outFile, { });
		const wl = (line) => fileStream.write(`${line}\n`);
	
		// Get Fields
		const fields = await sql.all(db, `SELECT * FROM fields WHERE file = $1 AND type = 'field' ORDER BY ${sortBy}`, [file]);
		
		for(let i = 0; i < fields.length; i++) {
			wl(`${fws(fields[i].full_name, 80)} ${fws(fields[i].group_name, 40)}, ${fws((fields[i].always_empty ? '[always_empty]' : ''), 20)}`);
		}
		
		fileStream.end();
		spinner.succeed();
	}
}

// Start app if file is run from CLI
WriteFieldsTxt.runWhenMain();