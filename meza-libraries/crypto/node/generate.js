'use strict';

// import native crypto lib
import { generateKeyPairSync } from 'crypto';

// import export lib
import { removePrivateHeaders, removePublicHeaders } from './libs.js';


export function generateKeyPair(){
    let { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    // clean
    privateKey = removePrivateHeaders(privateKey.trim());
    publicKey = removePublicHeaders(publicKey.trim());

    // remove line breaks
    privateKey = privateKey.replace(/(\r\n|\n|\r)/gm, "");
    publicKey = publicKey.replace(/(\r\n|\n|\r)/gm, "");
    
    return {
        'publicKey': publicKey,
        'privateKey': privateKey
    }
}
