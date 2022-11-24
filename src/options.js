import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import cli from './cli.js';
import fws from 'fixed-width-string';
import sqlite3 from 'sqlite3';
import sql from './sqlite.js';

// Config
const SEP_PAD = 68;
const DATA_PATH = './data/';
const CLIENT_PATH = './clients/';
const OUTPUT_PATH = './output/';

class Options {
	constructor () {
		this.loadOptions ();
	}

	loadOptions () {
		this.SHOW_JSON = false;
		this.SHOW_JSON_PRETTY = false;
	}

	async askSync (types, prevOpt) {
		if (Object.keys(types).length === 0) return [];
		return new Promise((resolve, reject) => {
			this.ask(resolve, types, prevOpt);
		});
	}

	async ask (cb, types, prevOpt) {
		prevOpt || (prevOpt = {});
		if (Object.keys(types).length === 0) return [];

		const prompts = [];
		const defaults = {};

		if (types.dbFile) {
			prompts.push({
				type: 'rawlist',
				name: 'dbFile',
				message: 'Select database file:',
				pageSize: 30,
				choices: this.getFileList({path: OUTPUT_PATH, ext: '.db', showNew: 'New Database' }),
				when: async (answers) => !prevOpt.onServer
			});
			prompts.push({
				type: 'input',
				name: 'dbFileNew',
				message: 'New DB File Name:',
				when: (answers) => !prevOpt.onServer && answers.dbFile === 'new'
			});
		}

		if (types.fieldsFile) {
			prompts.push({
				type: types.fieldsFile?.single ? 'rawlist' : 'checkbox',
				name: 'fieldsFile',
				message: 'Select file from fields table:',
				pageSize: 30,
				validate: (input) => input.length !== 0,
				choices: async (answers) => await this.getFieldFiles({ dbFile: answers.dbFile || prevOpt.dbFile }),
				when: async (answers) => {
					const choices = await prompts.find(p => p.name === 'fieldsFile').choices(answers);
					if (prevOpt.selectAll || choices.length === 1) {
						defaults.fieldsFile = choices.map(v => v.value);
						return false;
					}
					return !prevOpt.onServer;
				}
			});
		}

		if (types.csvFile) {
			prompts.push({
				type: 'checkbox',
				name: 'csvFile',
				message: 'Select csv file:',
				pageSize: 30,
				validate: (input) => input.length !== 0,
				choices: this.getFileList({path: DATA_PATH, ext: '.csv', showNew: false}),
				when: async (answers) => !prevOpt.onServer
			});
		}

		if (types.sortBy) {
			prompts.push({
				type: 'checkbox',
				name: 'sortBy',
				message: 'Sort By:',
				choices: [
					{ value: 'name', name: 'Name' },
					{ value: 'position', name: 'Position' }
				],
				validate: (input) => input.length !== 0,
				when: async () => {
					const choices = await prompts.find(p => p.name === 'sortBy').choices;
					if (prevOpt.selectAll) {
						defaults.sortBy = choices.map(v => v.value);
						return false;
					}
					return !prevOpt.onServer;
				}
			});
		}

		if (types.tunnel) {
			prompts.push({
				type: 'list',
				name: 'tunnel',
				message: 'Start web tunnel:',
				choices: [
					{ value: false, name: 'No' },
					{ value: true, name: 'Yes' }
				],
				when: async () => {
					if (prevOpt.selectAll) {
						defaults.tunnel = false;
						return false;
					}
					return true;
				}
			});
		}

		// Not Used
		if (types.maxRows) {
			prompts.push({
				type: 'list',
				name: 'maxRows',
				message: 'Whole file or part?',
				choices: [
					{ value: 0, name: fws('All Records', 14, { align: 'right' }) },
					{ value: 100, name: fws('100 Records', 14, { align: 'right' }) },
					{ value: 1000, name: fws('1,000 Records', 14, { align: 'right' }) },
					{ value: 100000, name: fws('10,000 Records', 14, { align: 'right' }) }
				],
			});
		}

		if (types.clientConfig) {
			prompts.push({
				type: 'rawlist',
				name: 'clientConfig',
				message: 'What client is this for?',
				pageSize: 20,
				choices: this.getClientList(),
				filter: async (val) => {
                    return await this.getClintConfig(val);
                },
				when: async () => {
					const choices = await prompts.find(p => p.name === 'clientConfig').choices.filter(c => c.type !== 'separator');
					if (prevOpt.selectAll || choices.length === 1) {
						defaults.clientConfig = await this.getClintConfig(choices[0]);
						return false;
					}
					return !prevOpt.onServer;
				}
			});
		}

		if (types.outFile1) {
			prompts.push({
				type: 'rawlist',
				name: 'outFile1',
				message: 'Select File 1:',
				pageSize: 20,
				choices: async (answers) => await this.getOutputList({ clientConfig: answers.clientConfig || prevOpt.clientConfig || defaults.clientConfig })
			});
		}

		if (types.outFile2) {
			prompts.push({
				type: 'rawlist',
				name: 'outFile2',
				message: 'Select File 2:',
				pageSize: 20,
				choices: async (answers) => await this.getOutputList({ clientConfig: answers.clientConfig || prevOpt.clientConfig || defaults.clientConfig })
			});
		}

		if (prompts.length > 0) {
			inquirer.prompt(prompts).then(async (answers) => {
				if (answers.dbFileNew) {
					answers.dbFile = answers.dbFileNew = `${OUTPUT_PATH}${answers.dbFileNew}`;
				}

				// Print Defaults
				for (const property in defaults) {
					if (defaults.hasOwnProperty(property)) {
						console.log(` ${cli.yellow(`[Default] `)} ${cli.orange(property)}: ${ cli.blue(defaults[property].name || defaults[property]) }`);
					}
				}

				// Apply Defaults
				answers = { ...defaults, ...answers };

				cb(answers);
			});
		}
	}

	async getFieldFiles (opt) {
		const db = new sqlite3.Database(opt.dbFile);
		const results = await sql.all(db, `SELECT DISTINCT(file) FROM fields ORDER BY file;`);
		db.close();
		return results.map(r => { return { value: r.file, name: r.file.replace('./data/', '') }; });
	}

	getClientList () {
		const files = fs.readdirSync(CLIENT_PATH)
			.filter(f => f.endsWith('.js'))
			.map(f => `${CLIENT_PATH}${f}`);	
		return [
			new inquirer.Separator(cli.orange.underline(fws('Clients:', SEP_PAD))),
			...files
		];
	}

	// TODO Combine w/ getClientList
	getFileList (opt) {
		const files = fs.readdirSync(opt.path)
			.filter(f => f.endsWith(opt.ext))
			.map(f => { return { value: `${opt.path}${f}`, name: f }; });
		if (opt.showNew) 
			files.push({ value: 'new', name: opt.showNew });	
		return [
			new inquirer.Separator(cli.orange.underline(fws('Files:', SEP_PAD))),
			...files
		];
	}

	async getOutputList (opt) {
		const { clientConfig } = opt;
		
		const files = fs.readdirSync(OUTPUT_PATH)
			.filter(f => f.endsWith('name.txt'))
			.map(f => { return {
					value: `${OUTPUT_PATH}${f}`,
					name: `${ fws(clientConfig.parseFileTypeName(f),18) } => ${f}`
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name));	
		return [
			new inquirer.Separator(cli.orange.underline(fws('Files:', SEP_PAD))),
			...files
		];
	}

	generateOutputFile (originalFile, file) {
		return `${OUTPUT_PATH}${path.basename(originalFile || '')}.${file}`;
	}

	async getClintConfig (client) {
		if (!!client) {
			const { config } = await import(`.${client}`); // Go back one dir
			return config;
		} else {
			console.log(cli.red('ERROR'), cli.yellow('Client config not found'));
			process.exit(1);
		}
	}
}

export default new Options;