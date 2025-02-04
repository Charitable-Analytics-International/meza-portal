'use strict'

// Import libs
import Joi from 'joi'

const Account = Joi.object({
    email: Joi.string().min(4).max(128).required(),
    password: Joi.string().min(8).max(32).required()
})

export default Account
