'use strict'

// helper function to return a clear error message
function parseError(error){
    
    // init returned message
    let message = 'error parsing request';

    // try to parse
    try {
        message = error.details.map(err => err.message).join(', ');
    }catch(err){
        console.error(err);
    }

    return message;
}



function validator(opts){
    return async (req, res, next) => {
        // check
        if (opts === undefined || opts === null || typeof (opts) !== 'object') {
            return next()
        }

        // get validators
        const paramsValidator = opts.params;
        const queryValidator = opts.query;
        const bodyValidator = opts.body;
        const cookiesValidator = opts.cookies;

        // grab req data
        const { params, query, body, cookies } = req;

        // validate params
        if (paramsValidator !== undefined && paramsValidator !== null) {
            if (params === undefined || params === null) return res.status(400).send({ message: 'invalid request – no params provided' });
            const { error } = paramsValidator.validate(params)
            if (error) return res.status(400).send({ message: parseError(error) });
        }

        // validate query
        if (queryValidator !== undefined && queryValidator !== null) {
            if (query === undefined || query === null) return res.status(400).send({ message: 'invalid request – no query provided' });
            const { error } = queryValidator.validate(query)
            if (error) return res.status(400).send({ message: parseError(error) });
        }

        // validate body
        if (bodyValidator !== undefined && bodyValidator !== null) {
            if (body === undefined || body === null) return res.status(400).send({ message: 'invalid request – no body provided' });
            const { error } = bodyValidator.validate(body)
            if (error) return res.status(400).send({ message: parseError(error) });
        }

        // validate cookies
        if (cookiesValidator !== undefined && cookiesValidator !== null) {
            if (cookies === undefined || cookies === null) return res.status(400).send({ message: 'invalid request – no cookies provided' });
            const { error } = cookiesValidator.validate(cookies);
            if (error) return res.status(400).send({ message: parseError(error) });
        }

        return next()
    }
}

export default validator
