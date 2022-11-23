import fws from 'fixed-width-string';
import chalk from 'chalk';
import sql from './src/sqlite.js';
import Options from './src/options.js';
import cli from './src/cli.js';
import Task from './task.js';

export default class CreateGroups extends Task {
	static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
			dbFile: true ,
			fieldsFile: true,
			clientConfig: true
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
		this.msg = (count) => `Parsing ${cli.blue(count)} fields for grouping`;
	}

	async start () {
		const {
			db,
			file,
			clientConfig,
			spinner
		} = this;

		spinner.start();

		const fields = await sql.all(db, `SELECT * FROM fields WHERE file = $1 AND parent_id IS NULL ORDER BY position`, [file]);
		
		let longestName = 0;
		for(let i = 0; i < fields.length; i++) {
			const groups = this.findGroupNames(fields[i]);
			fields[i].group_name = groups[0];
			fields[i].groups = groups;

			// Update group_names for field and all children
			await sql.run(
				db,
				`UPDATE fields SET group_name = $1, other_groups = $2 WHERE id = $3 OR top_id = $3`, 
				[fields[i].group_name, JSON.stringify(fields[i].groups), fields[i].id]
			);
			
			// Report status
			longestName = Math.max(longestName, fields[i].full_name.length);
			spinner.text = this.msg(i);
		}

		if (Options.SHOW_JSON || Options.SHOW_JSON_PRETTY) {
			// Short list by group order in config and then by name
			fields.sort((a, b) => ((clientConfig.groupOrder[a.group_name] || 98) - (clientConfig.groupOrder[b.group_name] || 98)) || (a.group_name.localeCompare(b.group_name)));
			
			let curGroup;
			let groupCount = 0;
			for(let i = 0; i < fields.length; i++) {
				if (fields[i].group_name !== curGroup) {
					(!!curGroup) && console.log(chalk.blue(`[ GROUP COUNT: ${groupCount} ]`));
					
					const hColor = (fields[i].group_name === 'Other Fields') ? 'red' : 'blue';
					console.log(chalk.underline[hColor](`\n## ${fields[i].group_name} ##`));
					
					curGroup = fields[i].group_name;
					groupCount = 0;
				}
				groupCount++;
				console.log(
					'[' + fws(fields[i].position, 4, { align: 'right' }) + ']',
					fws(fields[i].full_name, longestName),
					fws(((fields[i].always_empty) ? (chalk.red('[Always Empty]')) : '') +
					((fields[i].could_be_comma_array) ? (chalk.green('[Could Be Comma Seperated]')) : ''), 30),
					fields[i].groups.filter(g=>g !== 'Other Fields')
					
				);
				
				// TODO Print nested names
			}
			console.log(chalk.blue(`[ GROUP COUNT: ${groupCount} ]`));
		}
		
		spinner.succeed();
	}

	findGroupNames (field) {
		const { clientConfig } = this;

		const fileType = clientConfig.parseFileType(field.file);
		if (!clientConfig.files[fileType]) clientConfig.files[fileType] = [];
		return [
			...clientConfig.files[fileType].map(f => f(field)),
			...clientConfig.files.all.map(f => f(field)),
			'Other Fields' // Default
		].filter(g => !!g);
	}
}


// Start app if file is run from CLI
CreateGroups.runWhenMain();