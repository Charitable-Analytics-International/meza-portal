'use strict'

// Import libs
import Joi from 'joi'

const Image = Joi.object({
    table_template_id: Joi.number().integer(),
    branch_id: Joi.number().integer(),
    approved: Joi.boolean(),
    notes: Joi.string().allow(''),
    rotation: Joi.number().integer(),
    status: Joi.number().integer()
})

export default Image
