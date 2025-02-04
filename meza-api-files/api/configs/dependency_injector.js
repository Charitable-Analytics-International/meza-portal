'use strict'

// import config file
import config from './configs.js'

// import  service locator lib
import service_locator from '../../../meza-libraries/utils/node/service_locator.js'

// import database lib
import Database from '../../../meza-database/server.js';

// import logger lib
import Logger from '../../../meza-libraries/utils/node/logger.js';

// import local storage lib
import LocalStorageService from '../../../meza-libraries/storage/node/localstorage.js';


// --- Logger ---
service_locator.register('logger', () => {
    return Logger.create(config.application_logging);
})


// --- Database ---
service_locator.register('database', () => {
    const database = new Database(config.db.port, config.db.host, config.db.name, config.db.username, config.db.password);
    return database;
})


// --- Image Storage ---
service_locator.register('storage', () => {

    // logger
    const logger = service_locator.get('logger');

    // prompt user
    logger.info(`Image storage is on local disk (${config.LOCAL_DIRECTORY})`)

    // init storage
    const storageService = new LocalStorageService(config.LOCAL_DIRECTORY, logger);

    return storageService;
})


export default service_locator