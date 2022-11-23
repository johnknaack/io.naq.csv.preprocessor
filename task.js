import sqlite3 from 'sqlite3';
import ora from 'ora';
import cli from './src/cli.js';
import Options from './src/options.js';
import { program } from 'commander';

export default class Task {
    static get meta () { return import.meta; }

    static get requirements () {
        // If running Task directly, and not a subclass, test all prompts
        if (this.name === Task.name) {
            return { 
                dbFile: true,
                csvFile: true,
                fieldsFile: true,
                outFile1: true,
                outFile2: true,
                sortBy: true,
                clientConfig: true,
                tunnel: true
            };
        } else {
            return {};
        }
	}

    constructor () {
        // Create Spinner
        this.spinner = ora({
            prefixText: () => ` [${(new Date()).toLocaleTimeString()}]`
        });
    }

    static async initialize (prevOpt) {
        !prevOpt && (prevOpt = {});
        console.log(cli.cyan.underline(cli.pad(`\n Running ${this.name}`, 68)));

        const req = this.requirements;
        const { readOnly, noDB } = req;

        // Set Requirements
        program.option('--dbFile <string>');
        program.option('--csvFile <string>');
        program.option('--fieldsFile <string>');
        program.option('--outFile1 <string>');
        program.option('--outFile2 <string>');
        program.option('--sortBy <string>');
        program.option('--clientConfig <string>');
        program.option('--tunnel <string>');
        program.parse();
        const args = program.opts();
        
        args.fieldsFile && (args.fieldsFile = [args.fieldsFile]);
        args.dbFile && (prevOpt.dbFile = args.dbFile);
        args.tunnel && (args.tunnel = ['yes', 'true', '1'].indexOf(args.tunnel.toLowerCase()) !== -1);
        (prevOpt) && (prevOpt.fieldsFile) && (!Array.isArray(prevOpt.fieldsFile)) && (prevOpt.fieldsFile = [prevOpt.fieldsFile])

        // Set Required Prompts
        let prompts = {};
        if (req.dbFile && !args.dbFile && !prevOpt?.dbFile) prompts.dbFile = true;
        if (req.csvFile && !args.csvFile && !prevOpt?.csvFile) prompts.csvFile = true;
        if (!!req.fieldsFile && !args.fieldsFile && !prevOpt?.fieldsFile) prompts.fieldsFile = req.fieldsFile;
        if (!!req.outFile1 && !args.outFile1 && !prevOpt?.outFile1) prompts.outFile1 = req.outFile1;
        if (!!req.outFile2 && !args.outFile2 && !prevOpt?.outFile2) prompts.outFile2 = req.outFile2;
        if (req.sortBy && !args.sortBy && !prevOpt?.sortBy) prompts.sortBy = true;
        if (!!req.clientConfig && !args.clientConfig && !prevOpt?.clientConfig) prompts.clientConfig = req.clientConfig;
        if (req.tunnel && !args.tunnel === undefined && !prevOpt?.tunnel) prompts.tunnel = true;

        // Prompt For Missing Requirements
        let answers = await Options.askSync(prompts, prevOpt);

        // Combine Requirements
        let opt = { ...prevOpt, ...args, ...answers, readOnly };
        const task = new this();

        // Open DB if opt.dbFile is set
        const mode = opt.readOnly ? sqlite3.OPEN_READONLY : null;
        !noDB && opt.dbFile && (opt.db = new sqlite3.Database(opt.dbFile, mode));

        // Run Task
        await task.run(opt);

        // Close DB if needed
        return new Promise((resolve, reject) => {
            if (!noDB && opt.db) {
                task.spinner.start(opt.readOnly ? 'Closing Database' : 'Writing Data To Database File');
                opt.db.close(() => {
                    task.spinner.succeed();
                    delete opt.db;
                    resolve(opt);
                });
            } else {
                resolve(opt);
            }
        });
    }

    async run (opt) {
        console.log(opt);
    }

    static runWhenMain () {
        const main = cli.main(this.meta);
        if (main) {
            const task = this.initialize();
        }
        return main;
    }
}

// Start app if file is run from CLI
Task.runWhenMain();