'use strict';

// import datatype lib
import { isStringNonEmpty } from '../../gen/datatype.js';


export function removePrivateHeaders(pem){
    
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";

    // if no headers
    if (!pem.includes(pemHeader)) return pem

    // remove
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    return pemContents
}


export function removePublicHeaders(pem){
    
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";

    // if no headers
    if (!pem.includes(pemHeader)) return pem

    // remove
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
    return pemContents
}


function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function base64StrToArrBuff(base64Str){
    const binaryStr = Buffer(base64Str, 'base64').toString('binary');
    const arrBuff = str2ab(binaryStr);
    return arrBuff;
}

export function parseKey(keyStr){
    if (!isStringNonEmpty(keyStr)) return null;

    // init
    let arrBuff = null, uint8Arr = null;

    // convert to array buffer
    try { 
        arrBuff = base64StrToArrBuff(keyStr);
    } catch (err) {
        console.error(err);
        return null;
    }

    // convert to uint8 array
    try { 
        uint8Arr = new Uint8Array(arrBuff);
    } catch (err) {
        console.error(err);
        return null;
    }

    return uint8Arr;
}