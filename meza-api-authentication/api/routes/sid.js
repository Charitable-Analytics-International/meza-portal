'use strict'

// config
import config from '../configs/configs.js';

// data type lib
import { isNumber } from '../../../meza-libraries/gen/datatype.js';


function register(server, serviceLocator) {

    // --- Login using SID ---
    server.post(
        '/auth/meza/sid',
        async (req, res) => {

            // grab account id
            const account_id = req.headers['account-id'];
            const account_access = req.headers['account-access'];
            const account_email = req.headers['account-email'];

            // grab session id from request
            const { sid } = req.cookies;

            // grab logger
            const logger = serviceLocator.get('logger')

            // check input
            if (!isNumber(account_id)) {
                logger.error(`account id is invalid`)
                return res.status(500).send({ message: `server error - account id invalid` })
            }

            // log
            logger.info(`successful login of account id ${account_id}`)

            // --- TODO: This is there, because of the Kenya deployment ---
            // build returned object
            let obj = { message: 'login successful' };
            if (config.sid.in_body) obj['sid'] = sid
            // ------------------------------------------------------------

            // set access
            obj['access'] = account_access;

            // set email
            obj['email'] = account_email;

            // return success
            return res.status(200).send(obj)
        }
    )

    // --- Destroy SID ---
    server.delete(
        '/auth/meza/sid',
        async (req, res) => {

            // TODO: Do not pass using headers
            // grab account id
            const account_id = req.headers['account-id'];

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // check input
            if (!isNumber(account_id)) {
                logger.error(`account id is invalid`)
                return res.status(500).send({ message: `server error - account id invalid` })
            }

            // Grab account model
            const AccountModel = database.models.Account

            // find account in db
            let account;
            try{
                account = await AccountModel.findOne({
                    where: { id: account_id }
                })
            }catch (e){
                logger.error('could not fetch account');
                return res.status(500).send({ message: 'server error' })
            }

            // if doesn't exist
            if (!account) {
                return res.status(400).send({ message: 'account does not exist' })
            }

            // update last login at
            try {
                await account.update({
                    sid: ''
                })
            } catch (err) {
                logger.error('could not update account destroy the sid')
                return res.status(500).send({ message: 'server error' })
            }

            // log
            logger.info(`successful destroyed sid of account id ${account_id}`)

            // return success
            return res.status(200).send({ message: 'sid destroyed' })
        }
    )
}


const sid = {
    'register': register
}

export default sid;
