'use strict'

// config
import config from '../configs/configs.js';

// import cryptography libs
import { compare } from '../../../meza-libraries/crypto/node/hash.js';

// import middleware
import validator from '../../../meza-libraries/middlewares/validator.js';
import { attachSidCookieToResponse } from '../middlewares/sid.js';

// import schema validators
import validatorLogin from '../validations/account/login.js';


function register(server, serviceLocator) {

    // --- Login using credentials ----
    server.post(
        '/auth/meza/creds',
        validator({
            body: validatorLogin
        }),
        attachSidCookieToResponse(),
        async (req, res) => {

            // grab body from request
            const { email, password } = req.body

            // grab sid attached to req
            const sid = req._sid;

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger');

            // clean the email
            const _email = email.trim().toLowerCase();

            // log
            logger.info(`login attempt from ${_email}`);

            // Grab account model
            const AccountModel = database.models.Account

            // find account in db
            let account;
            try{
                account = await AccountModel.findOne({
                    where: { email: _email }
                })
            }catch (e){
                logger.error('could not fetch account');
                return res.status(500).send({ message: 'server error' })
            }

            // if doesn't exist
            if (!account) {
                logger.error('cant find account')
                return res.status(400).send({ message: 'email does not exist' })
            }

            // verify password
            if (!await compare(password, account['password'])) {
                return res.status(400).send({ message: 'invalid password' })
            }

            // update last login at
            try {
                await account.update({
                    last_login_at: new Date(),
                    sid: sid
                })
            } catch (err) {
                logger.error('could not update account')
                return res.status(500).send({ message: 'server error' })
            }

            // log
            logger.info(`successful login of ${_email}`)

            // --- TODO: This is there, because of the Kenya deployment ---
            // build returned object
            let obj = { message: 'login successful' };
            if (config.sid.in_body) obj['sid'] = sid
            // ------------------------------------------------------------

            // set access
            obj['access'] = account['access'];

            // set email
            obj['email'] = account['email'];

            // send
            return res.status(200).send(obj)
        }
    )
}


const account = {
    'register': register
}

export default account;
