'use strict'

import Joi from 'joi';

export default Joi.object({
    image_id: Joi.string().guid({
        version: [
            'uuidv4'
        ]
    }).required()
})
