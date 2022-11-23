import fs from 'fs';
import diff2html from 'diff2html';
import readFileGo from 'readfile-go';
import Options from '../src/options.js';
import unidiff  from 'unidiff';
import Task from './task.js';

export default class Compare extends Task {
    static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
            clientConfig: true,
			outFile1: true,
            outFile2: true,
            noDB: true,
		}; 
	}
    
	async run (opt) {
		const {
            outFile1,
            outFile2
		} = opt;

        const outFile = Options.generateOutputFile(outFile2, `compare.html`);

        this.spinner.start(`Comparing Files`);

        var oldStr = opt.oldStr || readFileGo(outFile1);
        var newStr = opt.newStr || readFileGo(outFile2);
    
        var diff = unidiff.diffLines(
            oldStr,
            newStr
        );
    
        const output = diff2html.html(unidiff.formatLines(diff, { aname: outFile1, bname: outFile2, context: 500 }), {
            drawFileList: false,
            showFiles: false,
            matching: 'lines',
            outputFormat: 'side-by-side',
            synchronisedScroll: false,
            highlight: true
        });
    
        const html = opt.html = `
        <html>
        <head>
            <!-- CSS -->
            <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css" />
    
            <!-- Javascripts -->
            <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>
        </head
        <body>
            <div style='padding: 48px;'>
                ${output}
            </div>
        </body>
        </html>
        `;
    
        if (outFile2 !== 'skip')
            fs.writeFileSync(outFile, html);
        
        this.spinner.succeed();
	}
}

// Start app if file is run from CLI
Compare.runWhenMain();