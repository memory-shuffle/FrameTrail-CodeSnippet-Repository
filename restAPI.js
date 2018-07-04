module.exports = (express, pool, adminPassword, debug) => {


    const cors = require('cors'),
          router = express.Router(),
          bodyParser = require('body-parser');

    router.options('*', cors());
    router.use(cors());

    router.use(bodyParser.json())

    function sendJSON(json) {
        if (debug) {
            console.log(
                '\nRESPONSE',
                JSON.stringify(json, null, 4),
                '\n===================================================================================================');
        }
        return this.json(json);
    }

    router.use((req, res, next) => {

        if (debug) {
            console.log(
                '\n=====[ API-REQUEST ' + new Date() + ' ]======================================',
                '\nPATH', req.path,
                '\nBODY', req.body
            );
        }
        res.sendJSON = sendJSON;

        pool.getConnection((err, connection) => {

            if (err) {
                return res.sendJSON({ error: 'error in database connection', message: err.message });
            }
            connection.on('error', (err) => {
                return res.sendJSON({ error: 'error in database connection', message: err.message });
            });

            if (debug) {

                req.queryDatabase = function () {
                    console.log(
                        '\nSQL-QUERY', arguments[0],
                        '\nSQL-PARAMS', arguments[1]
                    );
                    return connection.query.apply(connection, arguments);
                };

            } else {

                req.queryDatabase = connection.query;

            }

            res.on('finish', () => connection.release());

            next();

        });

    });




    // add or modify a snippet (with HASHKEY or as admin)
    router.post('/post', (req, res) => {

        if (!/^(\w|\d){3,255}$/g.test(req.body.name)) {
            return res.sendJSON({
                success: false, error: 'This name is not allowed'
            });
        }

        req.queryDatabase('SELECT ID, HASHKEY FROM SNIPPETS WHERE NAME = ?', [req.body.name], (err, rows) => {

            if (err) {
                return res.sendJSON({
                    success: false, error: 'Could not compare name with existing snippets', message: err.message
                });
            }

            if (rows.length === 0) {
                // insert new snippet

                let hashkey = Math.random().toString().slice(2, 7);

                req.queryDatabase(
                    'INSERT INTO SNIPPETS(NAME, HASHKEY, PUBLIC, AUTHOR, SOURCE, DESCRIPTION, LICENSE, TAGS, CONTEXT, EVENTTYPE) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        req.body.name,
                        hashkey,
                        false,
                        req.body.author || '',
                        req.body.source || '',
                        req.body.description || '',
                        req.body.license || '',
                        req.body.tags || '',
                        req.body.context || '',
                        req.body.eventtype || ''
                    ],
                    (err, rows) => {

                        if (err) {
                            return res.sendJSON({
                                success: false, error: 'Could not insert new snippet', message: err.message
                            });
                        }

                        res.sendJSON({
                            success: true,
                            hashkey: hashkey
                        });

                    }
                );

            } else if (rows.length === 1) {

                // update existing snippet
                if (   req.body.adminPassword === adminPassword
                    || req.body.hashkey === rows[0]['HASHKEY']) {

                        req.queryDatabase(
                            'UPDATE SNIPPETS SET AUTHOR = ?, SOURCE = ?, DESCRIPTION = ?, LICENSE = ?, TAGS = ?, CONTEXT = ?, EVENTTYPE = ? WHERE ID = ?',
                            [
                                req.body.author || '',
                                req.body.source || '',
                                req.body.description || '',
                                req.body.license || '',
                                req.body.tags || '',
                                req.body.context || '',
                                req.body.eventtype || '',
                                rows[0]['ID']
                            ],
                            (err, rows) => {

                                if (err) {
                                    return res.sendJSON({
                                        success: false, error: 'Could not update existing snippet', message: err.message
                                    });
                                }

                                res.sendJSON({
                                    success: true
                                })

                            }
                        );

                } else {
                    return res.sendJSON({
                        success: false, error: 'No permission to update an existing snippet'
                    });
                }

            } else {
                throw new Error('Name field must be UNIQUE');
            }

        });

    });





    // get collection of snippets
    router.post('/search', (req, res) => {

        let searchQuery = 'SELECT ID, NAME, AUTHOR FROM SNIPPETS ',
            searchParams = [],
            chainQueries = false;

        if (req.body.searchterm) {
            if (req.body.searchfields) {

                let numberOfSearchFields = 0;

                if (req.body.searchfields.includes('name')) {
                    searchQuery += 'WHERE (NAME LIKE ?';
                    searchParams.push('%' + req.body.searchterm + '%');
                    ++numberOfSearchFields;
                }

                if (req.body.searchfields.includes('author')) {
                    if (numberOfSearchFields === 1) {
                        searchQuery += ' OR ';
                    } else {
                        searchQuery += 'WHERE ('
                    }
                    searchQuery += 'AUTHOR LIKE ?';
                    searchParams.push('%' + req.body.searchterm + '%');
                    ++numberOfSearchFields;
                }

                if (req.body.searchfields.includes('description')) {
                    if (numberOfSearchFields >= 1) {
                        searchQuery += ' OR ';
                    } else {
                        searchQuery += 'WHERE ('
                    }
                    searchQuery += 'DESCRIPTION LIKE ?';
                    searchParams.push('%' + req.body.searchterm + '%');
                    ++numberOfSearchFields;
                }

                if (numberOfSearchFields > 0) {
                    searchQuery += ')';
                    chainQueries = true;
                }

            } else {
                searchQuery += 'WHERE (NAME LIKE ? OR AUTHOR LIKE ? OR DESCRIPTION LIKE ?)';
                searchParams.push('%' + req.body.searchterm + '%', '%' + req.body.searchterm + '%', '%' + req.body.searchterm + '%');
                chainQueries = true;
            }
        }

        if (req.body.license) {

            if (chainQueries) {
                searchQuery += ' AND '
            } else {
                searchQuery += 'WHERE '
            }

            let searchLicenses = req.body.license.split(' ');
            if (searchLicenses.length === 1) {
                searchQuery += 'LICENSE LIKE ?';
                searchParams.push('%' + searchLicenses[0] + '%');
            } else {
                searchQuery += '(LICENSE LIKE ?';
                searchParams.push('%' + searchLicenses[0] + '%');
                for (let i = 1, l = searchLicenses.length; i < l; i++) {
                    searchQuery += ' OR LICENSE LIKE ?';
                    searchParams.push('%' + searchLicenses[i] + '%');
                }
                searchQuery += ')';
            }

            chainQueries = true;

        }

        if (req.body.tags) {

            if (chainQueries) {
                searchQuery += ' AND '
            } else {
                searchQuery += 'WHERE '
            }

            let searchTags = req.body.tags.split(' ');
            if (searchTags.length === 1) {
                searchQuery += 'TAGS LIKE ?';
                searchParams.push('%' + searchTags[0] + '%');
            } else {
                searchQuery += '(TAGS LIKE ?';
                searchParams.push('%' + searchTags[0] + '%');
                for (let i = 1, l = searchTags.length; i < l; i++) {
                    searchQuery += ' OR TAGS LIKE ?';
                    searchParams.push('%' + searchTags[i] + '%');
                }
                searchQuery += ')';
            }

            chainQueries = true;

        }

        if (req.body.context) {

            if (chainQueries) {
                searchQuery += ' AND '
            } else {
                searchQuery += 'WHERE '
            }

            let searchContexts = req.body.context.split(' ');
            if (searchContexts.length === 1) {
                searchQuery += 'CONTEXT LIKE ?';
                searchParams.push('%' + searchContexts[0] + '%');
            } else {
                searchQuery += '(CONTEXT LIKE ?';
                searchParams.push('%' + searchContexts[0] + '%');
                for (let i = 1, l = searchContexts.length; i < l; i++) {
                    searchQuery += ' OR CONTEXT LIKE ?';
                    searchParams.push('%' + searchContexts[i] + '%');
                }
                searchQuery += ')';
            }

            chainQueries = true;

        }

        if (req.body.eventtype) {

            if (chainQueries) {
                searchQuery += ' AND '
            } else {
                searchQuery += 'WHERE '
            }

            let searchEventtypes = req.body.eventtype.split(' ');
            if (searchEventtypes.length === 1) {
                searchQuery += 'EVENTTYPE LIKE ?';
                searchParams.push('%' + searchEventtypes[0] + '%');
            } else {
                searchQuery += '(EVENTTYPE LIKE ?';
                searchParams.push('%' + searchEventtypes[0] + '%');
                for (let i = 1, l = searchEventtypes.length; i < l; i++) {
                    searchQuery += ' OR EVENTTYPE LIKE ?';
                    searchParams.push('%' + searchEventtypes[i] + '%');
                }
                searchQuery += ')';
            }

            chainQueries = true;

        }

        if (req.body.adminPassword) {

            if (req.body.adminPassword !== adminPassword) {
                return res.sendJSON({
                    success: false, error: 'Wrong admin password'
                });
            }

        } else {

            if (chainQueries) {
                searchQuery += ' AND PUBLIC = TRUE'
            }  else {
                searchQuery += 'WHERE PUBLIC = TRUE'
            }

        }

        // console.log(searchQuery);
        // console.log(searchParams);

        req.queryDatabase(searchQuery, searchParams, (err, rows) => {

            if (err) {
                return res.sendJSON({
                    success: false, error: 'Could not search for snippet', message: err.message
                });
            }

            // console.log(rows);

            res.sendJSON(rows.map(i => ({ id: i.ID, name: i.NAME, author: i.AUTHOR })));

        });

    });





    // get a snippet
    router.post('/get', (req, res) => {

        // console.log('GET SNIPPET ID ' + req.body.id);

        if (req.body.adminPassword) {

            if (req.body.adminPassword !== adminPassword) {
                return res.sendJSON({
                    success: false, error: 'Wrong admin password'
                });
            }

        }


        let id = Number.parseInt(req.body.id);

        if (Number.isNaN(id)) {
            return res.sendJSON({
                success: false, error: 'Invalid ID'
            });
        }

        req.queryDatabase(
            'SELECT ID, CREATED, MODIFIED, NAME, PUBLIC, AUTHOR, SOURCE, DESCRIPTION, LICENSE, TAGS, CONTEXT, EVENTTYPE FROM SNIPPETS WHERE ID = ?'
            + (req.body.adminPassword ? '' : ' AND PUBLIC = TRUE'),
            [id],
            (err, rows) => {

                if (err) {
                    return res.sendJSON({
                        success: false, error: 'Could not get snippet', message: err.message
                    });
                }

                if (!rows.length) {
                    return res.sendJSON({
                        success: false, error: 'Snippet does not exist or is not public'
                    });
                }

                let item = rows[0];
                res.sendJSON({
                    id: item.ID,
                    created: item.CREATED,
                    modified: item.MODIFIED,
                    public: !!item.PUBLIC,
                    name: item.NAME,
                    author: item.AUTHOR,
                    description: item.DESCRIPTION,
                    source: item.SOURCE,
                    license: item.LICENSE,
                    tags: item.TAGS,
                    context: item.CONTEXT,
                    eventtype: item.EVENTTYPE
                });

            }

        );

    });






    // check if the admin password is correct
    router.post('/isadmin', (req, res) => {

        res.sendJSON({
            isadmin: req.body.adminPassword === adminPassword
        });

    });






    // delete a snippet (as admin)
    router.post('/delete', (req, res) => {

        if (req.body.adminPassword !== adminPassword) {
            return res.sendJSON({
                success: false, error: 'Wrong admin password'
            });
        }

        let id = Number.parseInt(req.body.id);

        if (Number.isNaN(id)) {
            return res.sendJSON({
                success: false, error: 'Invalid ID'
            });
        }

        req.queryDatabase('DELETE FROM SNIPPETS WHERE ID = ?', [id], (err, rows) => {

            if (err) {
                return res.sendJSON({
                    success: false, error: 'Could not delete snippet', message: err.message
                });
            }

            res.sendJSON({
                success: true
            });

        });

    });






    // change snippet between public/non-public (as admin)
    router.post('/public', (req, res) => {

        if (req.body.adminPassword !== adminPassword) {
            return res.sendJSON({
                success: false, error: 'Wrong admin password'
            });
        }

        let id = Number.parseInt(req.body.id);

        if (Number.isNaN(id)) {
            return res.sendJSON({
                success: false, error: 'Invalid ID'
            });
        }

        req.queryDatabase('UPDATE SNIPPETS SET PUBLIC = ? WHERE ID = ?',
            [!!req.body.public, id],
            (err, rows) => {

                if (err) {
                    return res.sendJSON({
                        success: false, error: 'Could not change public fields of snippet', message: err.message
                    });
                }

                res.sendJSON({
                    success: true
                });

            }
        );

    });


    return router;
}
