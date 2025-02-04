'use strict';

// import config file
import config from './api/configs/configs.js'

// web server libs
import express from 'express';

// dependency injector
import serviceLocator from './api/configs/dependency_injector.js'

// grab routes
import routesBranch from './api/routes/branch.js'
import routesImage from './api/routes/image.js'
import routesTableTemplate from './api/routes/table_template.js'
import routesProject from './api/routes/project.js'
import routesCell from './api/routes/cell.js'
import routesStatus from './api/routes/status.js'
import routesAccount from './api/routes/account.js'

// grab instance of express
const app = express();

// enable parse body
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Set routes
routesBranch.register(app, serviceLocator)
routesImage.register(app, serviceLocator)
routesTableTemplate.register(app, serviceLocator)
routesProject.register(app, serviceLocator)
routesCell.register(app, serviceLocator)
routesStatus.register(app, serviceLocator)
routesAccount.register(app, serviceLocator)

// start server
app.listen(+config.app.port, () => {
    console.log(`CAI Meza - API Project Server - ${process.pid}, running on port ${config.app.port}`);
});
