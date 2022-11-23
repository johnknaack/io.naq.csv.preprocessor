const sqlite = {};

sqlite.serialize = (db, cb) => {
	return new Promise(function(resolve, reject) {
        db.serialize(() => {
            cb(resolve, reject);
        });
	});
};

sqlite.run = (db, query, params) => {
	return new Promise(function(resolve, reject) {
		db.run(query, params, 
			function(err)  {
				if (err) 
                    reject(err.message);
				else 
                    resolve(this.lastID);
		});
	});
};

sqlite.all = (db, query, params) => {
    return new Promise(function(resolve, reject) {
        if(params == undefined) params=[];
        db.all(query, params, function(err, rows)  {
            if (err) 
                reject("Read error: " + err.message);
            else 
                resolve(rows);
        });
    }); 
};

sqlite.get = (db, query, params) => {
    return new Promise(function(resolve, reject) {
        if(params == undefined) params=[];
        db.get(query, params, function(err, rows)  {
            if(err) 
                reject("Read error: " + err.message);
            else 
                resolve(rows);
        });
    });
};


export default sqlite;

// https://www.scriptol.com/sql/sqlite-async-await.php