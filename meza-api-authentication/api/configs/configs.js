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
            port: 8081
        },
        db: {
            port: process.env.DB_PORT,
            host: process.env.DB_HOST,
            name: process.env.DB_NAME,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD
        },
        cookies: {
            days_before_expiration: 1,
            secure: true,
            httpOnly: true,
            sameSite: false
        },
        sid: {
            in_body: true
        },
        application_logging: {
            app_name: process.env.APP_NAME,
            app_version: process.env.APP_VERSION,
            file: process.env.LOG_PATH,
            level: process.env.LOG_LEVEL || 'info',
            console: process.env.LOG_ENABLE_CONSOLE || true
        }
    }
}

export default config();