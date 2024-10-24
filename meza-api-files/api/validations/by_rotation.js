'use strict';

// import libs
import Joi from 'joi'

const Rotation = Joi.object({
    rotation: Joi.number(),
    resize: Joi.number()
}).unknown(true);

export default Rotation
