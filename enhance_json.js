import Asset from './src/asset.js';
import clipboard from 'clipboardy';
import Task from './task.js';

export default class EnhanceJSON extends Task {
    static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
			dbFile: true,
            fieldsFile: { single: true }, 
            clientConfig: true,
            readOnly: true
		}; 
	}
    
	async run (opt) {
		const {
			db,
			fieldsFile,
            clientConfig
		} = opt;

        this.spinner.start(`Enhancing JSON Object`);

        let obj = opt.obj || {};
        if (!opt.obj) {
            try {
                obj = JSON.parse(clipboard.readSync());
                if (!obj._entity_data) throw '_entity_data missing';
            } catch (error) {
                this.spinner.fail('Clipboard does not contain valid JSON' + error);
                return;
            }
        }

        let calcedFile = [await Asset.getFileById({ db, id: obj._entity_data?.['Entity ID'] })] || fieldsFile;
        
        await this.walkObject({ db, fieldsFile: calcedFile, clientConfig, obj: obj._entity_data });
        await this.fixPropertiesForRelatedEntityData({ db, fieldsFile: calcedFile, clientConfig, obj: obj._entity_data?._related_entity_data?.['Store Product'] });
        await this.fixPropertiesForServiceProductData({ db, fieldsFile: calcedFile, clientConfig, obj: obj._entity_data?._related_entity_data?.['Service Product'] });
        
        if (!opt.obj)
            clipboard.writeSync(JSON.stringify(obj, null, 2));

        opt.obj = JSON.stringify(obj);
        
        this.spinner.succeed('Enhanced JSON Object Finished');
	}

    async walkObject (opt, parent = '', lvl = 0) {
        const {
            db,
            fieldsFile,
            clientConfig,
            obj,
            includeLinked
        } = opt;

        if (obj === undefined) {
            return;
        }

        for (const property in obj) {
            if (property === '_related_entity_data') 
                return;
    
            if (obj.hasOwnProperty(property)) {
                var full_name = ((parent !== '') ? `${parent} > ` : '') + property;

                if (typeof obj[property] === 'object') {
                    await this.walkObject({ ...opt, obj: obj[property] }, full_name, lvl + 1);
                } else {
                    await Asset.enhanceField({
                        db,
                        clientConfig,
                        obj,
                        property,
                        full_name,
                        getLinked: includeLinked && property !== full_name,
                        file: fieldsFile,
                        enhance: true
                    });
                }
            }
        }
    }
    
    async fixPropertiesForRelatedEntityData (opt) {
        const {
            obj
        } = opt;

        if (obj === undefined) {
            return;
        }

        for (const property in obj) {
            if (obj.hasOwnProperty(property)) {
                const arr = obj[property]['Pages URL'].split('/');
                const id = arr[arr.length - 1];
                
                await this.walkObject({ ...opt, obj: obj[property] });
                obj[id] = obj[property];
                delete obj[property];
            }
        }
    }

    async fixPropertiesForServiceProductData (opt) {
        const {
            obj
        } = opt;

        if (obj === undefined) {
            return;
        }

        for (const property in obj) {
            if (obj.hasOwnProperty(property)) {
                // TODO Not sure what ID should be for service products
                //const arr = obj[property]['Pages URL'].split('/');
                //const id = arr[arr.length - 1];
                
                await this.walkObject({ ...opt, obj: obj[property] });
                //obj[id] = obj[property];
                //delete obj[property];
            }
        }
    }
}

// Start app if file is run from CLI
EnhanceJSON.runWhenMain();