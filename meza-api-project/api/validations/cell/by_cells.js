'use strict';

import Joi from 'joi';

export default Joi.object({
    rectangles: Joi.array().items(Joi.object({
        image_id: Joi.string().guid({
            version: [
                'uuidv4'
            ]
        }),
        rect_id: Joi.number().integer().positive().allow(0).required(),
        tl_x: Joi.number().required(),
        tl_y: Joi.number().required(),
        tr_x: Joi.number().required(),
        tr_y: Joi.number().required(),
        bl_x: Joi.number().required(),
        bl_y: Joi.number().required(),
        br_x: Joi.number().required(),
        br_y: Joi.number().required(),
        data_type: Joi.string().allow('').min(0).max(64).required(),
        opts: Joi.string().allow('').min(0).max(64),
        value: Joi.string().allow(...['', null]).min(0).max(64)
    })).required()
})