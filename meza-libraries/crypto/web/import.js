'use strict';

// import libs
import { base64StrToArrBuff, removePrivateHeaders, removePublicHeaders } from './libs.js';


/*
Import a PEM encoded RSA private key, to use for RSA-PSS signing.
Takes a string containing the PEM encoded key, and returns a Promise
that will resolve to a CryptoKey representing the private key.
*/
export async function importPrivateKey(pem) {

    // remove headers
    const pemContents = removePrivateHeaders(pem);
    
    // convert from a binary string to an ArrayBuffer
    const binaryDer = base64StrToArrBuff(pemContents);

    const privateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSA-OAEP",
            // Consider using a 4096-bit key for systems that require long-term security
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["decrypt"]
    );

    return privateKey;
}


/*
Import a PEM encoded RSA public key, to use for RSA-OAEP encryption.
Takes a string containing the PEM encoded key, and returns a Promise
that will resolve to a CryptoKey representing the public key.
*/
export async function importPublicKey(pem) {

    // remove headers
    const pemContents = removePublicHeaders(pem);
    
    // convert from a binary string to an ArrayBuffer
    const binaryDer = base64StrToArrBuff(pemContents);

    const publicKey = await window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256"
        },
        true,
        ["encrypt"]
    );

    return publicKey;
}
