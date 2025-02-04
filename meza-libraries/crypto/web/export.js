'use strict';

import { arrBuffToBase64Str } from './libs.js';


export async function exportPrivateKey(privateKey){
    const privateKeyExported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    return arrBuffToBase64Str(privateKeyExported);
}


export async function exportPublicKey(publicKey){
    const privateKeyExported = await window.crypto.subtle.exportKey('spki', publicKey);
    return arrBuffToBase64Str(privateKeyExported);
}
