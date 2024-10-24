'use strict'


function register(server, serviceLocator) {

    // --- Read ---
    server.get(
        '/api/branch',
        async (req, res, next) => {

            // Grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // Grab branch model
            const BranchModel = database.models.Branch;

            // read all
            let branches;
            try{
                branches = await BranchModel.findAll()
            }catch(e){
                logger.error('could not read branches');
                return res.status(400).send({ message: 'could not read branches' })
            }

            // send
            return res.status(200).send(branches)
        }
    )
}


const branch = {
    'register': register
}

export default branch;
