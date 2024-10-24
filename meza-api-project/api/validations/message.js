'use strict'

// Import libs
import Joi from 'joi'

const Message = Joi.object({
    src: Joi.string().required(),
    src_portal: Joi.boolean(),
    dest: Joi.string().allow(''),
    content: Joi.string().required(),
    outbox_time: Joi.number().integer().required(),
    pulled_at: Joi.date(),
    posted_at: Joi.date()
})

export default Message
