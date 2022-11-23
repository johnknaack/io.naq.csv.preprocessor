import sql from './sqlite.js';
import valueFix from './valueFix.js';

export default class Asset {

    static async calcIdIfNull (opt) {
        const { 
            db,
            id
        } = opt;
        if (!id || id === 'first')
            return await Asset.getFirstRowID(db, null);
        else
            return id;
    };


    static async getFirstRowID (db, file) {
        let row;
        if (file)
            row = await sql.get(db, `SELECT value FROM field_values WHERE file=$1 AND row=0 AND full_name in ('Entity ID', 'Orig ID') ORDER BY full_name LIMIT 1`, [file]);
        else 
            row = await sql.get(db, `SELECT value FROM field_values WHERE row=0 AND full_name in ('Entity ID', 'Orig ID') ORDER BY full_name LIMIT 1`);
        
        return row.value;
    }

    static async getFileById(opt) {
        const { 
            db,
            id
        } = opt;

        const results = await sql.get(db, `SELECT * FROM field_values WHERE (full_name = 'Entity ID' OR full_name = 'Orig ID') AND value = $2`, [id]);
        if (results) {
            return results.file;
        } else {
            return;
        }
    }

    static async getById(opt) {
        const { 
            db,
            linkedId,
        } = opt;

        const results = await sql.get(db, `SELECT * FROM field_values WHERE (full_name = 'Entity ID' OR full_name = 'Orig ID') AND value = $2`, [linkedId]);
        if (results) {
            opt.row = results.row;
            opt.file = results.file;
        } else {
            return {
                'Orig ID': opt.linkedId,
                'ERROR': 'Not Found'
            }
        }

        const fields = await sql.all(db, `SELECT * FROM fields WHERE file = $1 AND parent_id IS NULL ORDER BY position`, [results.file]);
        
        const tree = { };	
        for(let i = 0; i < fields.length; i++) {
            fields[i].name = fields[i].name.trim();
            fields[i].full_name = fields[i].full_name.trim();
            await appendToTree(db, opt, tree, fields[i]);
        }

        return tree;
    }

    static async enhanceField (opt) {
        let {            
            db,
            obj,
            property,
            full_name,
            getLinked,
            field,
            file,
            enhance,
            clientConfig
        } = opt;
        
        if (Array.isArray(file))
            file = file[0];

        if (!field) {
            field = await sql.get(db, `SELECT * FROM fields WHERE file = $1 AND full_name LIKE $2 ORDER BY position`, [file, full_name.replace(' > ', ' %> ')]);
        } 

        // Split arrayed values
        if (field && (field.could_be_comma_array === 1 || ['Entity ID', 'Orig ID'].indexOf(clientConfig.headerTranslate(property)) !== -1)) {
            obj[property] = await valueFix.arrayFromCommas(obj[property]);
        }

        // Convert MD links to HTML
        obj[property] = valueFix.markdown(obj[property]);

        // Convert HTML encoded chars
        obj[property] = valueFix.htmlDecode(obj[property]);

        // Append linked assets
        if (getLinked && clientConfig.headerTranslate(property) === clientConfig.idHeaderName) {
            if (!Array.isArray(obj[property])) {
                obj[property] = await valueFix.arrayFromCommas(obj[property]);
            }

            obj['_linked'] = [];
            for(let i = 0; i < obj[property].length; i++) {
                const item = await Asset.getById({
                    db,
                    getLinked: false,
                    linkedId: obj[property][i],
                    clientConfig,
                    enhance
                });
                obj['_linked'].push(item);
            }
        }
    }
}

// Walk field relationships to build JSON tree
async function appendToTree(db, opt, obj, row) {
    const {
        clientConfig
    } = opt;
	if (row.type === 'customField') { 
		obj[row.name] = {};
		const fields = await sql.all(db, `SELECT * FROM fields WHERE parent_id = $1 ORDER BY position`, [row.id]);
		for(let i = 0; i < fields.length; i++) {
		    await appendToTree(db,  opt, obj[row.name], fields[i]);
		}
	} else {
        const value = await sql.get(db, `SELECT value FROM field_values WHERE field_id = $1 AND row = $2`, [row.id, opt.row]);
		obj[row.name] = value?.value;

        (opt.enhance) && await Asset.enhanceField({
            db,
            obj,
            property: row.name,
            full_name: row.full_name,
            getLinked: opt.getLinked,
            enhance: opt.enhance,
            field: row,
            file: row.file,
            clientConfig
        });
	}
}
