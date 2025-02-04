'use strict';

import Joi from 'joi';

export default Joi.object({
    image_id: Joi.string().guid({
        version: [
            'uuidv4'
        ]
    }).required(),
    rect_ids: Joi.array().items(Joi.number().integer().positive().allow(0)).required(),
    value: Joi.string().allow('').min(0).max(64).required()
})
