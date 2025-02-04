'use strict';

// import app config
import { DOWNLOAD_JPEG_QUALITY } from '../../../meza-webapp/public/config.js';

// load env file
import dotenv from 'dotenv'
dotenv.config();

function config(){
    return {
        app: {
            name: process.env.APP_NAME,
            version: process.env.APP_VERSION,
            logpath: process.env.LOG_PATH,
            port: 8083
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
        image: {
            UPLOAD_MAX_NBR_FILES: +process.env.UPLOAD_MAX_NBR_FILES,
            MAX_BODY_SIZE_BYTES: +process.env.MAX_BODY_SIZE_BYTES
        },
        LOCAL_STORAGE: true,
        LOCAL_DIRECTORY: process.env.LOCAL_DIRECTORY,
        DOWNLOAD_JPEG_QUALITY: DOWNLOAD_JPEG_QUALITY
    }
}

export default config();