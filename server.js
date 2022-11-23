import Task from './task.js';
import EnhanceJSON from './enhance_json.js';
import WriteObjectJson from './write_object_json.js';
import localtunnel from 'localtunnel';
import express from 'express';

export default class Server extends Task {
    static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
            dbFile: true,
            readOnly: true,
            tunnel: true
		}; 
	}
    
	async run (opt) {
		const {
		} = opt;

        this.spinner.start(`Server Starting`);

        const app = express();
        const port = 8080;

        app.use(express.json({limit: '50mb'}));

        app.use(express.static('public'));

        app.post('/enhance', async (req, res) => {
            try {
                const { obj } = await EnhanceJSON.initialize({...opt, obj: JSON.parse(req.body.in), includeLinked: req.body.includeLinked });
                res.json({
                    out: obj
                });
            } catch (error) {
                res.json({
                    out: JSON.stringify({ error })
                });
            }
        });

        app.post('/object', async (req, res) => {
            try {
                const { obj } = await WriteObjectJson.initialize({...opt, fromServer: true, id: req.body.id });
                res.json({
                    obj: obj[0]
                });
            } catch (error) {
                res.json({
                    out: JSON.stringify({ error })
                });
            }
        });

        // Start Server
        app.listen(port, async () => {
            this.spinner.succeed(`Server Running On Port ${port}`);

            // Start Tunnel
            if (opt.tunnel) {
                this.spinner.start('Local Tunnel Starting');
                const tunnel = await localtunnel({ port: port, subdomain: `csv.preprocessor-${(Math.random() + 1).toString(36).substring(7)}` });
                this.spinner.succeed(`Local Tunnel Ready ${tunnel.url}`);
                tunnel.on('close', () => console.log('Local Tunnel Closed'));
            }
        });
	}
}

// Start app if file is run from CLI
Server.runWhenMain();