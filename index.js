import inquirer from 'inquirer';
import cli from './src/cli.js';
import fws from 'fixed-width-string';
import Task from './task.js';

// Tasks
import LoadFields from './load_fields.js';
import EvalFields from './eval_fields.js';
import CreateCustomFields from './create_custom_fields.js';
import CreateGroups from './create_groups.js';
import EnhanceJSON from './enhance_json.js';
import Compare from './compare.js';
import WriteFieldsCsv from './write_fields_csv.js';
import WriteFieldsJson from './write_fields_json.js';
import WriteFieldsTxt from './write_fields_txt.js';
import WriteGroupsCsv from './write_groups_csv.js';
import WriteObjectJson from './write_object_json.js';
import Server from './Server.js';

// Config
const TASK_PAD = 21;
const SEP_PAD = 68;

export default class Index extends Task {
	static get meta () { return import.meta; }

	async run (opt) {
		const {
		} = opt;

        let taskNum = 1;
        const pad = (t) => (taskNum++ <= 0) ? fws(' ' + t, TASK_PAD) : fws(t, TASK_PAD-1); // Keps list aligned w/ 2 digit list numbers
        let taskChoices = [
            new inquirer.Separator(cli.orange.underline(fws('All:', SEP_PAD))),
            { value: 'All',                 name: `${pad('All')} => Run All Processing and Output Tasks`, default: true },
            { value: 'All Processing',      name: `${pad('All Processing')} => Run All Processing Tasks` },
            { value: 'All Output',          name: `${pad('All Output')} => Run All Output Tasks` },
            new inquirer.Separator(cli.orange.underline(fws('Processing:', SEP_PAD))),
            { value: LoadFields,            name: `${pad('Load Fields')} => Load csv to sqlite` },
            { value: EvalFields,            name: `${pad('Eval Fields')} => Eval data and set field flags` },
            { value: CreateCustomFields,    name: `${pad('Create Custom Fields')} => Deconstruct header names to nested fields` },
            { value: CreateGroups,          name: `${pad('Create Groups')} => Run rules to assign groups` },
            new inquirer.Separator(cli.orange.underline(fws('Actions:', SEP_PAD))),
            { value: EnhanceJSON,           name: `${pad('Enhance JSON')} => Load JSON from clipboard and apply enhancements` },
            { value: Compare,               name: `${pad('Compare')} => Compare field output of two runs` },
            new inquirer.Separator(cli.orange.underline(fws('Output:', SEP_PAD))),
            { value: WriteFieldsCsv,        name: `${pad('Write Fields Csv')} => Generates CSV file for fields` },
            { value: WriteFieldsJson,       name: `${pad('Write Fields Json')} => Generates JSON file for fields` },
            { value: WriteFieldsTxt,        name: `${pad('Write Fields Txt')} => Generates TXT file for fields` },
            { value: WriteGroupsCsv,        name: `${pad('Write Groups Csv')} => Generates CSV file for groups` },
            { value: WriteObjectJson,       name: `${pad('Write Object Json')} => Generates JSON file for a stored object` },
            new inquirer.Separator(cli.orange.underline(fws('Run:', SEP_PAD))),
            { value: Server,                name: `${pad('Server')} => Run Web UI Server` },
            { value: Task,                  name: `${pad('Task')} => For Testing` },
        ];

        // Get users selection
        console.clear();
        inquirer.prompt([
            {
                type: 'checkbox',
                pageSize: 30,
                name: 'task',
                message: 'What tasks would you like to run?',
                choices: taskChoices,
                validate: (input) => input.length !== 0,
                filter(val) {
                    let tasks = [];
                    val.forEach(t => {
                       if (t === 'All')
                           tasks = tasks.concat([LoadFields, EvalFields, CreateCustomFields, 
                                                    CreateGroups, WriteFieldsCsv, WriteFieldsTxt,
                                                    WriteGroupsCsv, WriteObjectJson]);
                        else if (t === 'All Processing')
                            tasks = tasks.concat([LoadFields, EvalFields, CreateCustomFields, CreateGroups]);
                        else if (t === 'All Output')
                            tasks = tasks.concat([WriteFieldsCsv, WriteFieldsTxt, WriteGroupsCsv, WriteObjectJson]);
                       else
                           if (tasks.indexOf(t) === -1) tasks.push(t);
                    });
                    return tasks;
                }
            },
            {
                type: 'list',
                pageSize: 2,
                name: 'selectAll',
                message: 'Use select all when possible:',
                choices: [
                    { value: true, name: 'Yes (Recomended, runs task for all files in database)' },
                    { value: false, name: 'No' }
                ],
                //when: (answers) => answers.task.some(t => t === LoadFields)
            }
        ]).then(async (answers) => {
            let prevOpt = {};

            for(let i = 0; i < answers.task.length; i++) {
                if (answers.selectAll) prevOpt.selectAll = true;
                prevOpt = await answers.task[i].initialize(prevOpt);
            }

            if (!answers.task.some(t => t.name === Server.name)) {
                console.log(`\n${cli.yellow.underline('  Finished  ')}`);
                process.exit(0);
            }
        });
    }
}

// Start app if file is run from CLI
Index.runWhenMain();