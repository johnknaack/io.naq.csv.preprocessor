import chalk from 'chalk';
import esMain from 'es-main';
import fws from 'fixed-width-string';
import logSymbols from 'log-symbols';

class FakeSpinner {
    constructor() {
        this.lastTxt = '';
        this.active = false;
        this.start = this.bindLog(true, ` ${logSymbols.info} `, true);
        this.succeed = this.bindLog(true, ` ${logSymbols.success} `, false);
        this.fail = this.bindLog(true, ` ${logSymbols.error} `, false);
    }

    bindLog (now=false, prefix='', active=true) {
        return (msg) => {
            const preventDoubleSucceed = (!msg || msg === '') && !this.active && !active;
            if (!preventDoubleSucceed)
                this.log(msg || this.lastTxt, now, prefix);
            this.active = active;
        }
    } 

    // Only show messages that have changed
    log (txt='', now=false, prefix='   ') {
        prefix = ` [${(new Date()).toLocaleTimeString()}]${prefix}`;
        if (now) {
            console.log(prefix, txt);
            this.lastTxt = txt;
            return;
        } 
        const cleanTxt = this.reduceChanges(txt, this.lastTxt);
        const cleanLst = this.reduceChanges(this.lastTxt, txt);
        if (cleanTxt === cleanLst && cleanTxt !== this.lastTxt) {
            (cleanTxt !== '') && console.log(prefix, cleanTxt);
        } 
        this.lastTxt = cleanTxt;
    }

    set text (txt='') {
        this.log(txt, false);
    }

    reduceChanges (cur='', lst='') {
        const remaining = lst.split(' ').reduce((a,v) => a.replaceAll(v, ''), cur).trim();
        if (remaining !== cur)
            return cur.replaceAll(remaining, '').replaceAll('  ', ' ')
        else
            return cur;
    }
}

const cli = {};

cli.red = chalk.hex('#ff5a57');
cli.green = chalk.hex('#34ec82');
cli.yellow = chalk.hex('#f2f89d');
cli.orange = chalk.hex('#FFA500');
cli.blue = chalk.hex('#57c6ff');
cli.cyan = chalk.hex('#99EDFE');

cli.dim = chalk.hex('#5B6057');
cli.error = chalk.underline.hex('#ff5a57');

cli.pad = fws;
cli.main = (meta) => esMain(meta);

cli.logError = msg => {
    console.log(` [${(new Date()).toLocaleTimeString()}] ${logSymbols.error} ${msg}`);
};

cli.FakeSpinner = FakeSpinner;

export default cli;