'use strict';

// import logger lib
import winston from 'winston';
const { createLogger, format, transports } = winston;

const {
    combine, timestamp, label, prettyPrint
} = format

const createTransports = function (config) {
    const customTransports = []

    // setup the file transport
    if (config.file) {

        // setup the log transport
        customTransports.push(
            new transports.File({
                filename: config.file,
                level: config.level,
                maxsize: 1024 * 1024 * 10 // 10 MB
            })
        )
    }

    // if config.console is set to true, a console logger will be included.
    if (config.console) {
        customTransports.push(
            new transports.Console({
                level: config.level
            })
        )
    }

    return customTransports
}

export default {
    create (config) {
        return createLogger({
            transports: createTransports(config),
            format: combine(
                label({ label: `${config.app_name} - ${config.app_version} - ${process.pid}` }),
                timestamp(),
                prettyPrint()
            )
        })
    }
}
