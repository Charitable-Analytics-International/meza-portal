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
            port: 8080,
            proxy: {
                server: 'http://localhost',
                authentication: 8081,
                project: 8082,
                files: 8083,
                export: 8084,
                notebook: 8085
            }
        },
        db: {
            port: process.env.DB_PORT,
            host: process.env.DB_HOST,
            name: process.env.DB_NAME,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD
        },
        sid: {
            expiration: +process.env.SID_EXPIRATION_SEC || 43200,
            no_expiration_access_4: process.env.SID_NO_EXPIRATION_FOR_ACCESS_4 === '1'
        },
        application_logging: {
            app_name: process.env.APP_NAME,
            app_version: process.env.APP_VERSION,
            file: process.env.LOG_PATH,
            level: process.env.LOG_LEVEL || 'info',
            console: process.env.LOG_ENABLE_CONSOLE || true
        },
        ENDPOINTS: {
            ACCESS_4: [
                '/api/image/status',
                '/api/files/upload'
            ],
            authentication: {
                PUBLIC: {
                    POST: [
                        "/auth/meza/creds"
                    ]
                },
                PRIVATE: {
                    POST: [
                        "/auth/meza/sid"
                    ],
                    GET: [
                        "/auth/userinfo"
                    ],
                    DELETE: [
                        "/auth/meza/sid"
                    ]
                }
            },
            notebook: {
                PRIVATE: "/api/notebook"
            },
            project: {
                PRIVATE: {
                    POST: [
                        "/api/cellsearch",
                        "/api/cell/:image_id",
                        "/api/account"
                    ],
                    GET: [
                        "/api/branch",
                        "/api/table_template",
                        "/api/project",
                        "/api/status",
                        "/api/cell/:image_id/:rect_id",
                        "/api/cell/:image_id",
                        "/api/image",
                        "/api/image/:image_id",
                        "/api/image/status",
                        "/api/imagestatistics",
                        "/api/cellsearch",
                        "/api/account"
                    ],
                    PUT: [
                        "/api/cell",
                        "/api/image/:image_id"
                    ],
                    DELETE: [
                        "/api/account/:account_id",
                    ]
                }
            },
            files: {
                PUBLIC: {
                    GET: [
                        "/api/filespub/:image_id/:rect_id"
                    ]
                },
                PRIVATE: {
                    POST: [
                        "/api/files/upload"
                    ],
                    GET: [
                        "/api/files/:image_id",
                        "/api/files/:image_id/:rect_id",
                        "/api/filesmetadata/:image_id"
                    ]
                }
            },
            export: {
                PUBLIC: {
                    GET: [
                        "/api/export/by_branch/:branch_key/:year/:month"
                    ]
                },
                PRIVATE: {
                    POST: [
                        "/api/export/by_visit",
                        "/api/export/by_beneficiary",
                    ],
                    GET: [
                        "/api/export"
                    ]
                }
            }
        }
    }
}

export default config();