# FrameTrail CodeSnippetRepository

## Installation

1. Install [NodeJS](https://www.nodejs.org)
2. Install [MySQL](https://www.mysql.com/)
3. In MySQL (eg via phpMyAdmin), add a new database and a new user, with privileges to that database (note down database name, user name and password)
4. Go to Terminal, and change into the directory of this file (README.md).
5. Run the command `$ npm install`
6. Edit the file `package.json` with your favorite text editor. You have to adjust the config part
```javascript
"config": {
  "port": 3000,
  "admin-password": "freund",
  "debug": true,
  "db-host": "localhost",
  "db-port": null,
  "db-user": "codesnippets",
  "db-password": "Joscha123!",
  "db-database": "codesnippets"
}
```
7. Run the command `$ npm start`
8. Go to browser (in this case http://localhost:3000)



## Setup production environment

To run NodeJS apps within an Apache server, use something like this http://www.codingtricks.biz/run-nodejs-application-apache/

To run the app as a system service, use systemd or alike: https://thomashunter.name/blog/running-a-node-js-process-on-debian-as-a-systemd-service/
