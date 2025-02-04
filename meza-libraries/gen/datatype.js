'use strict';

// uuid lib
import { version as uuidVersion } from 'uuid';
import { validate as uuidValidate } from 'uuid';


// helper function to validate uuid version 4
export function uuidValidateV4(uuid) {
    return isStringNonEmpty(uuid) && uuidValidate(uuid) && uuidVersion(uuid) === 4;
}

// helper functions to validate basic data types
export function isString(el){
    return el !== undefined && el !== null && typeof(el) === 'string';
}

export function isStringNonEmpty(el){
    return isString(el) && el.trim().length > 0;
}

export function isNumber(el) {
    try{
        return el !== undefined && el !== null && !isNaN(parseFloat(el)) && isFinite(el);
    }catch(err){
        return false;
    }
}

export function isObject(el){
    return el !== undefined && el !== null && typeof(el) === 'object';
}

export function isFunction(el){
    return el !== undefined && el !== null && typeof(el) === 'function';
}

export function isArray(el){
    return isObject(el) && Array.isArray(el);
}

export function isArrayNonEmpty(el){
    return isArray(el) && el.length > 0;
}

export function isDate(el){
    try {
        new Date(el);
    }catch(err){
        return false
    }
    return true;
}

export function isHttpUrl(el) {
    if (!isStringNonEmpty(el)) return false;
    let url;
    try {
        url = new URL(el);
    } catch (err) {
        return false;
    }
    return url.protocol === "http:";
}

export function isHttpsUrl(el) {
    if (!isStringNonEmpty(el)) return false;
    let url;
    try {
        url = new URL(el);
    } catch (err) {
        return false;
    }
    return url.protocol === "https:";
}

export function isEmail(el) {
    if (!isStringNonEmpty(el)) return false;
    var re = /\S+@\S+\.\S+/;
    return re.test(el);
}


// helper function to clean string
export function getOriginFromUrl(el){
    if (!isHttpsUrl(el) && !isHttpUrl(el)) return null;
    const url = new URL(el);
    return url.origin;
}


export function cleanStr(str){
    if (!isString(str)) return null;
    return str.trim().toLowerCase();
}


export function getBinarySize(string) {
    return Buffer.byteLength(string, 'utf8');
}
