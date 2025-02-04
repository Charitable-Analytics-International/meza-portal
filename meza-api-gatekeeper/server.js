'use strict';

// import config
import config from './api/configs/configs.js';

// web server libs
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// dependency injector
import serviceLocator from './api/configs/dependency_injector.js';

// grab routes
import routesAuthentication from './api/routes/authentication.js';
import routesFiles from './api/routes/files.js';
import routesProject from './api/routes/project.js';


// grab instance of express
const app = express();

// Enable CORS
app.use(cors());

// enable parse body
app.use(express.json());

// enable cookie parsing
app.use(cookieParser());

// enable serving static files through client folder
app.use(express.static('../meza-webapp/public', ));

// Set routes
routesAuthentication.register(app, serviceLocator);
routesFiles.register(app, serviceLocator);
routesProject.register(app, serviceLocator);

// start server
app.listen(+config.app.port, () => {
    console.log(`CAI Meza - API Gatekeeper Server - ${process.pid}, running on port ${config.app.port}`);
});
