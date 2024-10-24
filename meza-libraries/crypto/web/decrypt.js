'use strict';

import { importPrivateKey } from './import.js';
import { base64StrToArrBuff } from './libs.js';


export async function decrypt(cipherBase64, privateKeyPem){

    // convert
    const arrBuff = base64StrToArrBuff(cipherBase64);

    // import key
    const privateKey = await importPrivateKey(privateKeyPem)

    // decrypt
    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        privateKey,
        arrBuff
    );

    // decoder
    const decoder = new TextDecoder();
    let message = decoder.decode(decrypted);

    return message
}
