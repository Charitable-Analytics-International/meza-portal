'use strict';

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


function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}


export function base64StrToArrBuff(base64Str){
    const binaryStr = window.atob(base64Str);
    const arrBuff = str2ab(binaryStr);
    return arrBuff;
}


export function arrBuffToBase64Str(arrBuff) {
    const exportedAsString = ab2str(arrBuff);
    const exportedAsBase64 = window.btoa(exportedAsString);
    return exportedAsBase64;
}
