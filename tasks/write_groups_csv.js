import fs from 'fs';
import fastCsv from 'fast-csv';
import sql from '../src/sqlite.js';
import cli from '../src/cli.js';
import Options from '../src/options.js';
import Task from './task.js';

// Config TODO
const WITH_FLAGS = false;

export default class WriteGRoupsCsv extends Task {
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
			clientConfig
		} = opt;

		for (var i = 0; i < fieldsFile.length; i++) {
			const file = fieldsFile[i];
			const ffp = new FieldFileProcessor({ db, file, clientConfig, spinner: this.spinner });
			await ffp.start();
		}
	}
}

class FieldFileProcessor {
	constructor (opt) {
		this.db = opt.db;
		this.file = opt.file;
		this.clientConfig = opt.clientConfig;
		this.spinner = opt.spinner;
	}

	async start () {
		const {
			db,
			file,
			clientConfig,
			spinner
		} = this;

		const outFile = Options.generateOutputFile(file, `groups.csv`);

		spinner.start(`Generating ${cli.blue(outFile)} File`);

		const csvStream = fastCsv.format({ headers: false });
		var writeStream = fs.createWriteStream(outFile);
		csvStream.pipe(writeStream); //.on('end', () => process.exit());
		
		const fields = await sql.all(db, `SELECT * FROM fields WHERE file = $1 AND parent_id IS NULL ORDER BY position`, [file]);
		
		// Short list by group order in config and then by name
		fields.sort((a, b) => ((clientConfig.groupOrder[a.group_name] || 98) - (clientConfig.groupOrder[b.group_name] || 98)) || (a.group_name.localeCompare(b.group_name)));
		
		const GROUP_COLUMNS = WITH_FLAGS ? 4 : 1;
		let rows = [[],[],[]];
		let curGroup;
		let column = -GROUP_COLUMNS;
		let groupCount = 0;
		for(let i = 0; i < fields.length; i++) {
			if (fields[i].group_name !== curGroup) {
				curGroup = fields[i].group_name;
				groupCount = 0;
				column += GROUP_COLUMNS;
				
				rows[groupCount][column] = fields[i].group_name;
				WITH_FLAGS && (rows[groupCount][column + 1] = 'Flags');
				WITH_FLAGS && (rows[groupCount][column + 2] = 'Posible Groups');
			}
			if (!rows[++groupCount]) 
				rows[groupCount] = [];
			
			rows[groupCount][column] = fields[i].full_name;
			WITH_FLAGS && (rows[groupCount][column + 1] = (fields[i].always_empty ? '[Always Empty]' : '') + (fields[i].could_be_comma_array ? '[Could Be Comma Seperated]' : ''));
			WITH_FLAGS && (rows[groupCount][column + 2] = JSON.parse(fields[i].other_groups).filter(g => g !== 'Other Fields').join(', '));
		}
		
		for(let i = 0; i < rows.length; i++) {
			csvStream.write(rows[i]);
		}
		
		csvStream.end();
		spinner.succeed();
	}
}

// Start app if file is run from CLI
WriteGRoupsCsv.runWhenMain();