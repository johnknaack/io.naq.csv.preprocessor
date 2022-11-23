import chalk from 'chalk';
import esMain from 'es-main';
import fws from 'fixed-width-string';

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

export default cli;