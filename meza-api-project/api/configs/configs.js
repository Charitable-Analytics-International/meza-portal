'use strict';

// load env file
import dotenv from 'dotenv'
dotenv.config();

function config(){
    return {
        app: {
            name: process.env.APP_NAME,
            version: process.env.APP_VERSION,
            logpath: process.env.LOG_PATH,
            port: 8082
        },
        db: {
            port: process.env.DB_PORT,
            host: process.env.DB_HOST,
            name: process.env.DB_NAME,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD
        },
        application_logging: {
            app_name: process.env.APP_NAME,
            app_version: process.env.APP_VERSION,
            file: process.env.LOG_PATH,
            level: process.env.LOG_LEVEL || 'info',
            console: process.env.LOG_ENABLE_CONSOLE || true
        },
        request: {
            COMPLETED: {
                name: 'completed',
                id: 1
            },
            FAILED: {
                name: 'failed',
                id: 0
            },
            IN_PROGRESS: {
                name: 'in progress',
                id: 2
            }
        },
        SUPPORTED_CELL_TYPES: ['info', 'string', 'blackout', 'bubble', 'float', 'integer']
    }
}

export default config();