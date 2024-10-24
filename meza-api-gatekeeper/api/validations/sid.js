'use strict';

// import libs
import Joi from 'joi'

const Sid = Joi.object({
    sid: Joi.string().uuid({
        version: [
            'uuidv4'
        ]
    }).required(),
}).unknown(true);

export default Sid
