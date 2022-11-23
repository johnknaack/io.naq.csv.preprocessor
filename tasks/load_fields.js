import fs from 'fs';
import sql from '../src/sqlite.js';
import fastCsv from 'fast-csv';
import cli from '../src/cli.js';
import Task from './task.js';

export default class LoadFields extends Task {
	static get meta () { return import.meta; }

	static get requirements () { 
		return { 
			dbFile: true,
			csvFile: true,
			clientConfig: true
		}; 
	}

	async run (opt) {
		const {
			db,
			csvFile,
			clientConfig
		} = opt;

		for (var i = 0; i < csvFile.length; i++) {
			const file = csvFile[i];
			const fp = new CsvFileProcessor({ 
				db,
				file,
				clientConfig,
				startFresh: i === 0, 
				maxRows: 0,
				spinner: this.spinner 
			});
			await fp.start();
		}
	}
}

class CsvFileProcessor {
	constructor (opt) {
		this.db = opt.db;
		this.file = opt.file;
		this.clientConfig = opt.clientConfig;
		this.startFresh = opt.startFresh;
		this.maxRows = opt.maxRows;
		this.spinner = opt.spinner;

		this.fields = {};
		this.msg = (count) => `Loading ${ cli.blue(count) } records from ${ cli.blue(this.file) }`;
	}

	async start () {
		const {
			db,
			startFresh,
			clientConfig
		} = this;

		// Preformance Settings
		db.run('PRAGMA journal_mode = OFF;');
		db.run('PRAGMA synchronous = 0;');
		db.run('PRAGMA cache_size = 1000000;');
		db.run('PRAGMA locking_mode = EXCLUSIVE;');
		db.run('PRAGMA temp_store = MEMORY;`);');

		// Create tables
		if (startFresh) {
			this.spinner.start('Starting Fresh: Droping and Creating Tables');
			db.serialize(() => {
				db.run('begin transaction');
				db.run(`DROP TABLE IF EXISTS fields;`);
				db.run(`
					CREATE TABLE fields
					(
						file      				MEDIUMTEXT,
						id 						INTEGER PRIMARY KEY AUTOINCREMENT, 
						name   					MEDIUMTEXT,
						full_name   			MEDIUMTEXT,
						type        			MEDIUMTEXT,
						position    			INT,
						group_name       		MEDIUMTEXT,
						other_groups       		MEDIUMTEXT,
						parent_id				INT,
						top_id					INT,
						could_be_comma_array    BOOL,
						is_id   				BOOL,
						has_url                 BOOL,
						has_image_url        	BOOL,
						has_multiline          	BOOL,
						always_empty      		BOOL,
						always_url              BOOL,
						always_number			BOOL
					)
				`);
				db.run(`DROP TABLE IF EXISTS field_values;`);
				db.run(`
					CREATE TABLE field_values
					(
						file      				MEDIUMTEXT,
						field_id  	    		INTEGER,
						row  	    			INTEGER,
						id 						INTEGER PRIMARY KEY AUTOINCREMENT,
						name   					MEDIUMTEXT,
						full_name   			MEDIUMTEXT,
						value        			MEDIUMTEXT
					)
				`);
				db.run(`CREATE INDEX field_id_value_idx ON field_values (field_id, value);`);
				db.run(`CREATE INDEX file_full_name_value_idx ON field_values (file, full_name, value);`);
				db.run(`CREATE INDEX full_name_value_idx ON field_values (full_name, value);`);
				db.run('commit');
			});
			this.spinner.succeed();
		}

		let headers = await this.processHeaders();
		await this.processRows({ headers });
	}

	async processHeaders () {
		const {
			file,
			clientConfig
		} = this;

		this.spinner.start(`Processing Headers from ${ cli.blue(file) }`);

		let headerList;
		let seen = {};
		return new Promise((resolve, reject) => {
			const readableStream = fs.createReadStream(file);
			fastCsv.parseStream(readableStream, {
				delimiter: ',',
				headers: headers => headerList = headers.map(h => { 
					if (seen[h] === undefined) {
						seen[h] = 2;
					} else {
						h = `${h} ${seen[h]++}`;
					}
					return clientConfig.headerTranslate(h);
				}),
				maxRows: 1
			}).on('error', (error) => {
				console.log('error', error);
			}).on('headers', async (row) => {
				await this.insertFields({ row, cb: () => {
					this.spinner.succeed();
					resolve(headerList) 
				}});
			});	
		});
	}

	async processRows (opt) {
		const {
			file,
			maxRows
		} = this;
		const {
			headers
		} = opt;

		let rowNumber = 0;
		const readableStream = fs.createReadStream(file);
		this.spinner.start();
		
		return new Promise((resolve, reject) => {
			fastCsv.parseStream(readableStream, {
				delimiter: ',',
				headers,
				renameHeaders: true,
				maxRows: maxRows
			}).on('error', (error) => {
				console.log('error', error);
			}).on('data', async (row) => {
				await this.insertFieldValues({ row, rowNumber: rowNumber++ });
				if (rowNumber % 10 === 0) 
					this.spinner.text = this.msg(rowNumber);
			}).on('end', () => {
				this.spinner.succeed(this.msg(rowNumber));
				resolve();
			});
		});
	}

	// Insert field info into fields table
	async insertFields (opt) {
		const {
			db, 
			file, 
			fields
		} = this;
		const { 
			row, 
			cb 
		} = opt;

		await db.serialize(async () => {
			db.run('begin transaction');
			for(let i = 0; i < row.length; i++) {
				const fieldName = row[i];
				const name = this.getName(fieldName).trim();
				const full_name = fieldName.trim();
				const id = await sql.run(db, `INSERT INTO fields (file, name, full_name, type, position) VALUES (?, ?, ?, ?, ?)`,
					[file, name, full_name, 'field', i],
					(error) => {
						if (error)
							console.log('error', error);
					});	
				fields[full_name] = { id, full_name, name };
			}
			db.run('commit');
			cb();
		});
	}

	// Insert values into field_values table
	async insertFieldValues (opt) {
		const { 
			db, 
			file, 
			fields, 
		} = this;
		const { 
			row, 
			rowNumber 
		} = opt;

		db.serialize(() => {
			db.run('begin transaction');
			var stmt = db.prepare('INSERT INTO field_values (file, field_id, row, name, full_name, value) VALUES (?, ?, ?, ?, ?, ?)');
			for (const key in row) {
				if (row.hasOwnProperty(key)) {
					if (row[key].length > 16777215)
						console.log('error', 'data to large for MEDIUMTEXT');
					stmt.run([file, fields[key.trim()].id, rowNumber, this.getName(key).trim(), key.trim(), row[key]]);
				}
			}
			stmt.finalize();
			db.run('commit');
		});
	}

	// Get last section of full_name
	getName (fullName) {
		const split = fullName.split(' > ');
		return split[split.length - 1].trim();
	}
}

// Start app if file is run from CLI
LoadFields.runWhenMain();