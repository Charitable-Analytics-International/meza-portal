'use strict';

// import config file
import config from './api/configs/configs.js'

// web server libs
import express from 'express';

// multipart form lib
import multer from 'multer';

// dependency injector
import serviceLocator from './api/configs/dependency_injector.js'

// grab routes
import routesUpload from './api/routes/upload.js'
import routesDownload from './api/routes/download.js'

// grab instance of express
const app = express();

// enable multipart
app.use(multer().single('picture'))

// Set routes
routesUpload.register(app, serviceLocator)
routesDownload.register(app, serviceLocator)

// start server
app.listen(+config.app.port, () => {
    console.log(`CAI Meza - API Files Server - ${process.pid}, running on port ${config.app.port}`);
});
