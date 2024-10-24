'use strict'

// import config file
import config from './configs.js'

// import  service locator lib
import service_locator from '../../../meza-libraries/utils/node/service_locator.js'

// import logger lib
import Logger from '../../../meza-libraries/utils/node/logger.js';

// import database lib
import Database from '../../../meza-database/server.js';

// Register logger
service_locator.register('logger', () => {
    return Logger.create(config.application_logging);
})

// Register database
service_locator.register('database', () => {
    const database = new Database(config.db.port, config.db.host, config.db.name, config.db.username, config.db.password);
    return database;
})

export default service_locator