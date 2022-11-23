import fs from 'fs';
import fastCsv from 'fast-csv';
import sql from '../src/sqlite.js';
import cli from '../src/cli.js';
import Options from '../src/options.js';
import Task from './task.js';

export default class WriteFieldsCsv extends Task {
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

		const outFile = Options.generateOutputFile(file, 'fields.csv');

		spinner.start(`Generating ${cli.blue(outFile)} File`);

		// Prep CSV
		const csvStream = fastCsv.format({ headers: false });
		const writeStream = fs.createWriteStream(outFile);
		csvStream.pipe(writeStream); //.on('end', () => process.exit());
		
		// Get Fields
		const fields = await sql.all(db, `SELECT * FROM fields WHERE file = $1 AND type = 'field' ORDER BY position`, [file]);
		
		let rows = [];
		for(let i = 0; i < fields.length; i++) {
			this.set(rows, 0, i, fields[i].full_name);
			this.set(rows, 1, i, fields[i].group_name);
			this.set(rows, 2, i, JSON.parse(fields[i].other_groups).filter(g => g !== 'Other Fields').join(', '));

			this.set(rows,  3, i, (fields[i].could_be_comma_array ? '[could_be_comma_array]' : ''));
			this.set(rows,  4, i, (fields[i].is_id ? '[is_id]' : ''));
			this.set(rows,  5, i, (fields[i].has_url ? '[has_url]' : ''));
			this.set(rows,  6, i, (fields[i].has_image_url ? '[has_image_url]' : ''));
			this.set(rows,  7, i, (fields[i].has_multiline ? '[has_multiline]' : ''));
			this.set(rows,  8, i, (fields[i].always_empty ? '[always_empty]' : ''));
			this.set(rows,  9, i, (fields[i].always_url ? '[always_url]' : ''));
			this.set(rows, 10, i, (fields[i].always_number ? '[always_number]' : ''));
		}
		
		// Write Fields
		for(let i = 0; i < rows.length; i++) {
			csvStream.write(rows[i]);
		}

		csvStream.end();
		spinner.succeed();
	}

	set(rows, row, col, val) {
		if (!rows[row]) rows[row] = [];
		rows[row][col] = val;
	}
}

// Start app if file is run from CLI
WriteFieldsCsv.runWhenMain();