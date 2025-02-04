'use strict'

// import cryptography libs
import { generateKeyPair } from '../../../meza-libraries/crypto/node/generate.js';
import { hash } from '../../../meza-libraries/crypto/node/hash.js';

// import middleware
import validator from '../../../meza-libraries/middlewares/validator.js';

// import schema validators
import validatorAccountCreate from '../validations/account.js';


function register(server, serviceLocator) {

    // --- Create ---
    server.post(
        '/api/account',
        validator({
            body: validatorAccountCreate
        }),
        async (req, res, next) => {

            // unpack body
            const { email, password, access, firstname, lastname } = req.body;

            // hash password
            const password_hashed = hash(password);

            // generate a key pair
            const { privateKey, publicKey } = generateKeyPair();
            
            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab account model
            const AccountModel = database.models.Account;

            // create
            let account;
            try{
                account = await AccountModel.create({
                    email: email,
                    password: password_hashed,
                    access: access,
                    firstname: firstname,
                    lastname: lastname,
                    publickey: publicKey,
                    privatekey: privateKey
                })
            }catch(e){
                logger.error('could not create account');
                return res.status(400).send({ message: 'could not create account' })
            }

            // send
            return res.status(200).send({ 'account_id': account.id })
        }
    )

    // --- Delete by account id ---
    server.delete(
        '/api/account/:account_id',
        async (req, res, next) => {

            // unpack body
            const { account_id } = req.params;

            // verify that account_id is a number
            if(isNaN(account_id)){
                return res.status(400).send({ message: 'account_id must be a number' })
            }

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab account model
            const AccountModel = database.models.Account;

            // delete
            let account;
            try{
                account = await AccountModel.destroy({
                    where: {
                        id: account_id
                    }
                })
            }catch(e){
                logger.error('could not delete account');
                return res.status(400).send({ message: 'could not delete account' })
            }

            // send
            return res.status(200).send({ 'message': 'account successfully destroyed' })
        }
    )

    // --- Read ---
    server.get(
        '/api/account',
        async (req, res, next) => {

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab account model
            const AccountModel = database.models.Account;

            // read all
            let accounts;
            try{
                accounts = await AccountModel.findAll(
                    {
                        attributes: [
                            'id',
                            'firstname',
                            'lastname',
                            'email',
                            'access',
                            'branch_ids',
                            'last_login_at',
                            'created_at'
                        ],
                        raw: true,
                        order: [
                            ['last_login_at', 'DESC']
                        ]
                    }
                )
            }catch(e){
                logger.error('could not read accounts');
                return res.status(400).send({ message: 'could not read accounts' })
            }

            // send
            return res.status(200).send(accounts)
        }
    )
}


const account = {
    'register': register
}

export default account;
