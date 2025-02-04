'use strict';

import { importPublicKey } from './import.js';
import { arrBuffToBase64Str } from './libs.js';


export async function encrypt(message, publicKeyPem){

    // encode message
    const encoder = new TextEncoder();
    const messageEncoded = encoder.encode(message);

    // import key
    const publicKey = await importPublicKey(publicKeyPem)

    // encrypt message
    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: "RSA-OAEP"
        },
        publicKey,
        messageEncoded
    );

    // convert to string
    const cipherBase64 = arrBuffToBase64Str(ciphertext);
    
    return cipherBase64;
}