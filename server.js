
const express = require('express'),
      mysql   = require('mysql'),
      path    = require('path'),
      config  = require(path.join(__dirname, 'package.json')).config;


const pool = mysql.createPool({
    connectionLimit: 100,
    host: config['db-host'] || 'localhost',
    port: config['db-port'] || undefined,
    user: config['db-user'],
    password: config['db-password'],
    database: config['db-database']
});

const queryInitialCreateTable = `CREATE TABLE IF NOT EXISTS SNIPPETS (
    ID int(11) unsigned NOT NULL auto_increment,
    CREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    MODIFIED TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    NAME varchar(511) NOT NULL UNIQUE,
    HASHKEY varchar(511) NOT NULL,
    PUBLIC boolean NOT NULL default FALSE,
    AUTHOR varchar(511) NOT NULL default '',
    SOURCE mediumtext NOT NULL,
    DESCRIPTION mediumtext NOT NULL,
    LICENSE varchar(4095) NOT NULL default '',
    TAGS varchar(4095) NOT NULL default '',
    CONTEXT varchar(4095) NOT NULL default '',
    EVENTTYPE varchar(4095) NOT NULL default '',
    PRIMARY KEY (ID)
)`;


pool.getConnection((error, connection) => {
    if (error) {
        console.log('Could not connect to database');
        throw error;
    }
    connection.on('error', (error) => {
        console.log('Error in database connection');
        throw error;
    });
    connection.query(queryInitialCreateTable, (error) => {
        if (error) {
            console.log('Could not create/check the initial table');
            throw error;
        }
        connection.release();

        startServer();

    });
});


function startServer() {

    const app = express();

    app.use('/api', require('./restAPI')(
        express, pool, config['admin-password'], config.debug));

    app.use('/',
        express.static(
            path.join(__dirname, 'htdocs')));

    app.listen(
        config.port,
        () => console.log(`CodeSnippetRepository server is listening on port ${config.port}.\n`)
    );

}
