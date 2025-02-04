'use strict'

// Import libs
import Joi from 'joi'

const Account = Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(8).max(32).required(),
    access: Joi.number().integer().min(1).max(4).required(),
    firstname: Joi.string().required(),
    lastname: Joi.string().required(),
    privatekey: Joi.string(),
    publickey: Joi.string()
})

export default Account
