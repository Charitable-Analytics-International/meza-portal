'use strict'

// import cryptography libs
import crypto from 'crypto';
import bcrypt from 'bcryptjs'
const saltRounds = 10


export function hash(string){
    return bcrypt.hashSync(string, saltRounds);
}


export function fastHash(string){
    return crypto.createHash('md5').update(string).digest('hex');
}


export async function compare(string, hashed_string){
    return await bcrypt.compare(string, hashed_string);
}
