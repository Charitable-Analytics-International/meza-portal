'use strict'

// load config file
import config from '../configs/configs.js';

// sid lib
import { generate_sid } from '../../../meza-libraries/gen/sid.js';


export function attachSidCookieToResponse(){
    return async (req, res, next) => {

        // generate session id
        const sid = generate_sid()
        
        // create an expiration date
        const expiration_date = new Date()
        expiration_date.setTime(expiration_date.getTime() + (config.cookies.days_before_expiration * 24 * 60 * 60 * 1000))

        // build cookie options
        const opts = {
            secure: config.cookies.secure,
            httpOnly: config.cookies.httpOnly,
            sameSite: config.cookies.sameSite,
            expires: expiration_date,
        }

        // attach session id as cookie to the response
        try {
            res.cookie('sid', sid, opts)
        }catch(err){
            console.error(err);
        }

        // attach session id to req as reference
        req._sid = sid;
            
        return next();
    }
}
