import sql from './src/sqlite.js';
import cli from './src/cli.js';
import Task from './task.js';

export default class CreateCustomFields extends Task {
	static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
			dbFile: true,
			fieldsFile: true
		}; 
	}

	async run (opt) {
		const {
			db,
			fieldsFile
		} = opt;

		for (var i = 0; i < fieldsFile.length; i++) {
			const file = fieldsFile[i];
			const ffp = new FieldFileProcessor({ 
				db,
				file,
				spinner: this.spinner 
			});
			await ffp.start();
		}
	}
}

class FieldFileProcessor {
	constructor (opt) {
		this.db = opt.db;
		this.file = opt.file;
		this.spinner = opt.spinner;

		this.newCustomFields = 0;
		this.tree = { childFields: { } };
		this.delimiter = ' > ';
		this.msg = (count) => `Parsing ${ cli.blue(count) } fields from ${ cli.blue(this.file.replace('./data/', '').substring(0, 35)) } to create custom field types`;
	}

	async start () {
		const {
			db,
			file
		} = this;

		this.spinner.start();

		await sql.run(db, `DELETE FROM fields WHERE file = $1 AND type ='customField';`, [file]);
		const fields = await sql.all(db, `SELECT * FROM fields WHERE file = $1 AND type ='field'`, [file]);
	
		for(let i = 0; i < fields.length; i++) {
			await this.appendToTree(db, fields[i]);
			this.spinner.text = this.msg(i);
		}
	
		this.spinner.succeed();
	}

	// Deconstruct full_name and create custom fields
	async appendToTree(db, row) {
		const split = row.full_name.split(this.delimiter);
		let top;

		await split.reduce(async (promise, prop, i) => {
			return promise.then(async (obj) => {
				if (obj.childFields[prop] === undefined) {
					if (i === split.length -1) {
						// Update parent id
						await sql.run(
							db,
							`UPDATE fields SET parent_id = $1, top_id = $2 WHERE id = $3`, 
							[obj.id, top?.id, row.id]
						);
						obj.childFields[prop] = {
							...row,
							type: 'field',
							id: row.id,
							parent: obj.id,
							top_id: top?.id,
						};
					} else {
						this.newCustomFields++;
						
						let prefix = '';
						if (!!obj?.full_name) {
							prefix = `${obj.full_name} > `;
						}

						// Add custom field to DB
						let id = await sql.run(
							db,
							`INSERT INTO fields (file, name, full_name, type, position, parent_id, top_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
							[row.file, prop, prefix + prop, 'customField', row.position, obj.id, top?.id]
						);

						obj.childFields[prop] = {
							name: prop,
							full_name: prefix + prop,
							type: 'customField',
							id: id,
							parent: obj.id,
							top_id: top?.id,
							childFields: { }
						};
						if (!top) {
							top = obj.childFields[prop];
						}
					}
				} else {
					if (!top) {
						top = obj.childFields[prop];
					}
				}
				
				return obj.childFields[prop];
			});
		}, Promise.resolve(this.tree));
	}
}

// Start app if file is run from CLI
CreateCustomFields.runWhenMain();