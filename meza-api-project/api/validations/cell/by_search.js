'use strict';

import Joi from 'joi';

export default Joi.object({
    image_id: Joi.string().guid({
        version: [
            'uuidv4'
        ]
    }),
    table_template_id: Joi.number().integer().positive().allow(0).required(),
    rect_ids: Joi.array().items(Joi.number().integer().positive().allow(0)).required(),
    branch_id: Joi.number().integer().positive().allow(0),
    ignore_reviewed: Joi.boolean(),
})
