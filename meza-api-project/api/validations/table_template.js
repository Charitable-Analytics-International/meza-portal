'use strict'

// Import libs
import Joi from 'joi'

// import config file
import config from '../configs/configs.js'

// load supported cell types
const { SUPPORTED_CELL_TYPES } = config;

const aoi = Joi.object({
    x0: Joi.number().positive().allow(0).required(),
    y0: Joi.number().positive().allow(0).required(),
    w: Joi.number().positive().allow(0).required(),
    h: Joi.number().positive().allow(0).required()
})

const rectangle = Joi.object({
    id: Joi.number().integer().positive().allow(0),
    x0: Joi.number().positive().allow(0).required(),
    y0: Joi.number().positive().allow(0).required(),
    w: Joi.number().positive().allow(0).required(),
    h: Joi.number().positive().allow(0).required(),
    data_type: Joi.string().valid(...SUPPORTED_CELL_TYPES).required(),
    opts: Joi.alternatives().try(Joi.string().allow(''), Joi.array().items(Joi.string())),
    aoi: aoi,
    label: Joi.string().allow('').min(0).max(64)
})

const table_template = Joi.object({
    id: Joi.number().integer().positive().allow(0),
    rectangles: Joi.array().items(rectangle).required(),
    name: Joi.string(),
    description: Joi.string()
})

export default table_template
