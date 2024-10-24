'use strict'

// load config file
import config from '../configs/configs.js';

// import schema validators
import validatorSid from '../validations/sid.js';

// datatype lib
import { isArray, isStringNonEmpty, isObject, isNumber, isDate } from '../../../meza-libraries/gen/datatype.js';


export function verifySid(serviceLocator){
    return async (req, res, next) => {

        // grab logger
        const logger = serviceLocator.get('logger')

        // verify that a sid was provided
        const { error } = validatorSid.validate(req.cookies)
        if (error) {
            logger.error('no valid sid found in request cookies')
            return res.status(401).send({ message: 'no valid sid found in request cookies' })
        }

        // grab session id from request
        const { sid } = req.cookies;

        // grab database using service locator
        const database = serviceLocator.get('database')

        // build query
        const query = `SELECT id, email, last_login_at, access, publickey, privatekey FROM account WHERE sid = '${sid}'`;

        // run query
        let results, metadata;
        try {
            [ results, metadata ] = await database.query(query);
        } catch(err) {
            console.error(err);
            return res.status(500).send({ message: 'server error - could not locate sid' })
        }

        // check
        if (!isArray(results) || results.length !== 1 || !isObject(results[0])){
            logger.error('invalid sid - does not exist')
            return res.status(401).send({ message: 'invalid sid - does not exist' })
        }

        // select
        let account = results[0];

        // grab data
        const { id, email, last_login_at, access, publickey, privatekey } = account

        // check if valid
        if (!isNumber(id) || !isStringNonEmpty(email) || !isDate(last_login_at) || !isNumber(access) || !isStringNonEmpty(publickey) || !isStringNonEmpty(privatekey)) {
            logger.error('account found but invalid attributes')
            return res.status(500).send({ message: 'server error - incomplete account info' })
        }

        // process last login at
        let time_diff_sec = -1
        const diff = last_login_at === undefined || last_login_at === null ? 0 : new Date(last_login_at);
        try {
            time_diff_sec = (Date.now() - diff) / 1000.0
        } catch (err) {
            logger.error('could not process last login at')
        }

        if (time_diff_sec < 0) {
            logger.error('corrupt session id')
            return res.status(401).send({ message: 'corrupt session id' })
        }

        // if no expiration setting is true, access = 4, and api endpoint is file upload
        const is_upload_endpoint = isStringNonEmpty(req.url) && req.url.substring(0, 17) === '/api/files/upload';
        const is_sid_login_endpoint = isStringNonEmpty(req.url) && req.url.substring(0, 14) === '/auth/meza/sid';
        const is_mobile_device = +access === 4;
        const perpetual_access_to_upload = config.sid.no_expiration_access_4 &&
                                            is_mobile_device &&
                                            (is_upload_endpoint || is_sid_login_endpoint);

        // check that the session id is not expired
        if (!perpetual_access_to_upload && time_diff_sec > config.sid.expiration) {
            logger.error('session id expired')
            return res.status(401).send({ message: 'session id expired' })
        }

        // append id to request
        req._account_id = id;

        // append email to request
        req._email = email

        // append access to request
        req._access = +access;

        // append private key to request
        req._publicKey = publickey;
        req._privatekey = privatekey;

        return next()
    }
}
