'use strict';

// import export lib
import { exportPrivateKey, exportPublicKey } from './export.js';


export async function generate(){

    // init keys
    let _publicKey, _privateKey;

    // generate pair
    await new Promise(resolve => {
        window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        ).then(({ publicKey, privateKey }) => {
            _publicKey = publicKey;
            _privateKey = privateKey
            resolve();
        });
    })

    // format
    _publicKey = await exportPublicKey(_publicKey);
    _privateKey = await exportPrivateKey(_privateKey);

    return {
        'publicKey': _publicKey,
        'privateKey': _privateKey
    }
}

