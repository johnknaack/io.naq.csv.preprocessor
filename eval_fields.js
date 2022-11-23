import sql from './src/sqlite.js';
import cli from './src/cli.js';
import Task from './task.js';

export default class EvalFields extends Task {
	static get meta () { return import.meta; }
	
	static get requirements () { 
		return { 
			dbFile: true 
		}; 
	}

	async run (opt) {
		const {
			db
		} = opt;

		await sql.serialize(db, async(resolve, reject) => {
			await sql.run(db, 'begin transaction');
			
			await this.update(db, 'Are Always Empty', 'always_empty',
				`UPDATE
					fields as u
				SET
					always_empty = true
				WHERE 1=1
					AND (
						SELECT 
							count(*) 
						FROM 
							field_values 
						WHERE 1=1
							AND field_id = u.id
							AND value > ''
					) = 0;
			`);
			
			await this.update(db, 'Have Some URL Values', 'has_url',
				`UPDATE
					fields as u
				SET
					has_url = true
				WHERE 1=1
					AND (
						SELECT
							count(*)
						FROM
							field_values
						WHERE 1=1
							AND field_id = u.id
							AND (value LIKE 'https://%' OR value LIKE 'http://%')
					) > 0;
			`);

			await this.update(db, 'Have Only URL Values', 'always_url',
				`UPDATE
					fields as u
				SET
					always_url = true
				WHERE 1=1
					AND (
						SELECT
							count(*)
						FROM
							field_values
						WHERE 1=1
							AND field_id = u.id
							AND value > ''
							AND value NOT LIKE 'https://%'
							AND value NOT LIKE 'http://%'
					) = 0
					AND always_empty is null
					AND has_url = 1;
			`);
			
			await this.update(db, 'Have Some Multiline Text Values','has_multiline',
				`UPDATE
					fields as u
				SET
					has_multiline = true
				WHERE 1=1
					AND (
						SELECT
							count(*)
						FROM
							field_values
						WHERE 1=1
							AND field_id = u.id
							AND value LIKE '%' || char(10) || '%'
					) > 0;
			`);

			await this.update(db, 'Have Some Image URL Values', 'has_image_url',
				`UPDATE
					fields as u
				SET
					has_image_url = true
				WHERE 1=1
					AND (
						SELECT
							count(*)
						FROM
							field_values
						WHERE 1=1
							AND field_id = u.id
							AND SUBSTR(value, -4) IN ('.jpg', '.png')
					) > 0
					AND always_url = 1;
			`);


			await this.update(db, 'Have Values That Look To Be Arrayed Values', 'could_be_comma_array',
				`UPDATE
					fields as u
				SET
					could_be_comma_array = 1
				WHERE 1=1
					AND (
						SELECT
							(hasCommaAfterCommaSpace*1.0)/hasComma
						FROM(
							SELECT
								full_name,
								SUM(CASE WHEN length(value) > length(noComma) THEN 1 ELSE 0 END) as hasComma,
								--SUM(CASE WHEN length(noCommaSpace) < length(noComma) THEN 1 ELSE 0 END) as hasCommaSpace,
								SUM(CASE WHEN length(noCommaSpace) > length(noCommaSpaceComma) THEN 1 ELSE 0 END) as hasCommaAfterCommaSpace
							FROM
							(
								SELECT
									full_name,
									value,
									REPLACE(value,',','') as noComma,
									REPLACE(value,', ','') as noCommaSpace,
									REPLACE(REPLACE(value,', ',''),',','') as noCommaSpaceComma
								FROM
									field_values
								WHERE 1=1
									AND field_id = u.id
							)
						)
					) > 0.8`
			);
					
			await this.update(db, 'Have name of ID and is not top', 'is_id',
				`UPDATE
					fields as u
				SET
					is_id = true
				WHERE 1=1
					AND type = 'field'
					AND name = 'Orig ID';
			`);

			await this.update(db, 'Have Only Number Values', 'always_number',
				`UPDATE
					fields as u
				SET
					always_number = true
				WHERE 1=1
					AND (
						SELECT
							count(*)
						FROM
							field_values
						WHERE 1=1
							AND field_id = u.id
							AND value > ''
							AND CAST(CAST(value as INTEGER) AS TEXT) <> value
							--[REGEXP not working in sqlite3] AND value NOT REGEXP '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$'
					) = 0
					AND always_empty is null;
			`);
			
			await sql.run(db, 'commit');
			resolve();
		});
	}

	async update(db, message, field, query) {
		this.spinner.start(`Find fields that ${cli.green(message)} and set ${cli.blue(field)}`);
		await sql.run(db, query, []);
		this.spinner.succeed();
	};
}

// Start app if file is run from CLI
EvalFields.runWhenMain();