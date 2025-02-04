'use strict';

// import config
import config from './api/configs/configs.js';

// web server libs
import express from 'express';
import cookieParser from 'cookie-parser';

// dependency injector
import serviceLocator from './api/configs/dependency_injector.js'

// grab routes
import routesAccount from './api/routes/account.js'
import routesSid from './api/routes/sid.js'
import routesUserInfo from './api/routes/userinfo.js'

// grab instance of express
const app = express();

// enable parse body
app.use(express.json());

// enable cookie parsing
app.use(cookieParser());

// Set routes
routesAccount.register(app, serviceLocator)
routesSid.register(app, serviceLocator)
routesUserInfo.register(app, serviceLocator)

// start server
app.listen(+config.app.port, () => {
    console.log(`CAI Meza - API Authentication Server - ${process.pid}, running on port ${config.app.port}`);
});
