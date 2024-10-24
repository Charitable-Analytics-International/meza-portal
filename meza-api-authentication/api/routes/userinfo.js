'use strict'

// data type lib
import { isNumber } from '../../../meza-libraries/gen/datatype.js';


function register(server, serviceLocator) {

    // --- Retrieve Public Key ----
    server.get(
        '/auth/userinfo',
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
                    where: { id: account_id },
                    raw: true,
                    attributes: ['email', 'publickey', 'access']
                })
            }catch (e){
                logger.error('could not fetch account');
                return res.status(500).send({ message: 'server error' })
            }

            // if doesn't exist
            if (!account) {
                return res.status(400).send({ message: 'account does not exist' })
            }

            // extract data
            const { email, publickey, access } = account;

            // log
            logger.info(`${email} retrieved its public key`)

            // send
            return res.status(200).send({ email: email, access: access, publickey: publickey })
        }
    );
}


const userinfo = {
    'register': register
}

export default userinfo;
