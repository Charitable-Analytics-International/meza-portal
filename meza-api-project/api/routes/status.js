'use strict'


function register(server, serviceLocator) {

    // --- Read ---
    server.get(
        '/api/status',
        async (req, res, next) => {

            // Grab status tracker
            const status = serviceLocator.get('status')

            // current hash
            const _status = await status.get();

            // send
            return res.status(200).send({ 'status': _status })
        }
    )
}


const status = {
    'register': register
}

export default status;
