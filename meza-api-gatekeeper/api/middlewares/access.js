'use strict'

// load config file
import config from '../configs/configs.js';

// datatype lib
import { isStringNonEmpty } from "../../../meza-libraries/gen/datatype.js";

export function verifyAccess(serviceLocator){
    return async (req, res, next) => {

        // grab logger
        const logger = serviceLocator.get('logger')

        // validate url
        const url = req.url;
        if ( !isStringNonEmpty(url) || url.length < 5){
            logger.error('invalid url')
            return res.status(400).send({ message: 'invalid url' })
        }

        // grab request method
        const method = req.method;

        // grab session info
        const { _email, _access } = req;

        // access levels
        if(_access === 1){
            // Create, Read, Update, Delete
            const allowed_methods = ['POST', 'GET', 'PUT', 'DELETE'];

            // validate request method
            if (!allowed_methods.includes(method)) {
                logger.error('invalid access')
                return res.status(403).send({ message: 'invalid access' })
            }

        }else if(_access === 2){
            // Read, Update
            const allowed_methods = ['GET', 'PUT'];

            // validate request method
            if (!allowed_methods.includes(method)) {
                logger.error('invalid access')
                return res.status(403).send({ message: 'invalid access' })
            }

        }else if(_access === 3){
            // Read
            const allowed_methods = ['GET'];

            // validate request method
            if (!allowed_methods.includes(method)) {
                logger.error('invalid access')
                return res.status(403).send({ message: 'invalid access' })
            }

        }else if(_access === 4){
            // STRICTLY MOBILE APP

            if(!config.ENDPOINTS.ACCESS_4.includes(url)){
                logger.error('invalid access')
                return res.status(403).send({ message: 'invalid access' })
            }

        }else{
            logger.error(`invalid access level for account ${_email}`)
            return res.status(403).send({ message: 'invalid access' })
        }

        // log request
        logger.info(`${url} access granted to ${_email}`)

        return next()
    }
}
