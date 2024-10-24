'use strict'

import Joi from 'joi';

export default Joi.object({
    image_id: Joi.string().guid({
        version: [
            'uuidv4'
        ]
    }).required(),
    rect_id: Joi.number().integer().positive().allow(0).required()
})
