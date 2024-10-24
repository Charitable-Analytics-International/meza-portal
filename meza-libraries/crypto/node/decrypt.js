'use strict';

// import datatype lib
import { isStringNonEmpty } from '../../gen/datatype.js';

// import native crypto lib
import { privateDecrypt, constants } from 'crypto';


export function decrypt(encrypted_message, privateKey){
    if (!isStringNonEmpty(encrypted_message)) return null;
    if (!isStringNonEmpty(privateKey)) return null;

    // init vars
    let message = null;

    // add headers
    const privateKey_with_headers = `-----BEGIN PRIVATE KEY-----\n${privateKey.trim()}\n-----END PRIVATE KEY-----`;

    // decrypt
    try {
        message = privateDecrypt(
            {
                'key': privateKey_with_headers,            
                'passphrase': '',
                'padding': constants.RSA_PKCS1_OAEP_PADDING,
                'oaepHash': "sha256",
            },
            Buffer.from(encrypted_message, "base64")
        )
    } catch(err) { 
        console.error(err);
        return null;
    }

    // convert to string
    try { 
        message = message.toString('utf-8');
    } catch(err) {
        console.error(err);
        return null;
    }

    return message;
}