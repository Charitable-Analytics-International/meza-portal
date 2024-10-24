'use strict'

// import postgres ORM lib
import sequelize from 'sequelize'

// import database models
import modelAccount from './models/account.js';
import modelBranch from './models/branch.js';
import modelCell from './models/cell.js';
import modelImage from './models/image.js';
import modelProject from './models/project.js';
import modelTable_Template from './models/table_template.js';


class Database {
    constructor (port, host, name, username, password) {
        this.models = {}
        this._connect(port, host, name, username, password)
    }

    _connect (port, host, name, username, password) {
        const { Sequelize, DataTypes, Deferrable } = sequelize

        const connection = new Sequelize(name, username, password, {
            port,
            host,
            dialect: 'postgres',
            logging: false // if true it shows the sql queries
        })

        connection.authenticate().then(
            (res) => {
                console.log('Connection has been established successfully.')
            },
            (error) => {
                console.error('Unable to connect to the database:', error)
            }
        )

        process.on('SIGINT', () => {
            connection.close()
            process.exit(0)
        })

        // initialize models - authentication
        this.models.Account = modelAccount(connection, DataTypes, Deferrable)

        // initialize models - project
        this.models.Branch = modelBranch(connection, DataTypes, Deferrable)
        this.models.Image = modelImage(connection, DataTypes, Deferrable)
        this.models.Cell = modelCell(connection, DataTypes, Deferrable)
        this.models.Table_Template = modelTable_Template(connection, DataTypes, Deferrable)
        this.models.Project = modelProject(connection, DataTypes, Deferrable)

        // set query function
        this.query = async (sqlquery) => await connection.query(sqlquery);

        // set reset function
        this.reset = async () => await connection.sync({ force: true }).then(() => { console.log('Database reset') })

        // sync
        connection.sync({
            force: false
        }).then(() => {
            console.log('Database has been synced')
        })
    }
}

export default Database