'use strict';

// import capacitor http lib
import { Http } from '@capacitor-community/http';

// import strings lib
import { isStringNonEmpty, isNumber, uuidValidateV4, isObject } from '../../gen/datatype.js';


// helper function to return a clear error message
function parseError(error){
    
    // init returned message
    let message = 'error parsing request';

    // try to parse
    try {
        message = error.details.map(err => err.message).join(', ');
    }catch(err){
        console.error(err);
    }

    return message;
}

// helper function to validate using Joi
function isValid(data, validator){
    if(!isObject(data)) return false;
    if(validator === null) return true;
    if (!isObject(validator)) return false;

    // init returned variables
    let valid = true;

    // validate
    const { error } = validator.validate(data)

    // check 
    if (error){
        valid = false;
        console.error(parseError(error));
    }

    return valid;
}


// helper functions to check if response is valid
function cleanResponse(response, validator = null){
    if (!isObject(response) || !isNumber(response.status) || !isObject(response.data)) return null;

    // grab data
    const { error, data, status, headers } = response;

    // stringify data
    let data_str = 'error';
    if (isStringNonEmpty(data.message)){
        data_str = data.message;
    }else{
        try{
            data_str = JSON.stringify(data)
        }catch(err){
            console.error(err);
        }
    }

    // if errors
    if(error || +status >= 400) {
        return { 'status': +status, 'data': { 'message': data_str }, "headers": headers }
    }

    // validate
    if(!isValid(data, validator)){
        return { 'status': 400, "data": { 'message': data_str }, "headers": headers };
    }

    return { 'status': +status, "data": data, "headers": headers }
}


// helper function to check if response contains a valid sid – always comes after cleanResponse()
export function extractSID(response){
    if (!isObject(response)) return null;

    // grab data from response
    const { status, headers } = response;

    // check if request was unsuccesful
    if(!isNumber(status) || +status >= 400) return null;

    // check headers for sid
    if (!isObject(headers)) return null;
    if (!isStringNonEmpty(headers['Set-Cookie'])) return null;
    if (!headers['Set-Cookie'].includes('sid=')) return null;

    // extract sid
    const sid = headers['Set-Cookie'].split(';')[0].split('=').pop();

    // validate format
    if (!uuidValidateV4(sid)){
        return null;
    }

    return sid;
}


// helper function to check if response contains a public key – always comes after cleanResponse()
export function extractPublicKey(response){
    if (!isObject(response)) return null;

    // grab data from response
    const { status, data } = response;

    // check if request was unsuccesful
    if(+status >= 400){
        return null;
    }
    
    // grab data
    const { publickey } = data;

    // validate format
    if (!isStringNonEmpty(publickey)){
        return null;
    }

    return publickey;
}


export async function reqGET(server, endpoint, params = null, bearer_token = null, validator = null){
    if (!isStringNonEmpty(server) || !isStringNonEmpty(endpoint)) return null;

    // init process vars
    let response = null;

    // build url
    const url = `${server}${endpoint}`;
    console.log(`GET: ${url}`)

    // headers
    let headers = { 'Content-Type': 'application/json' };
    if (typeof(bearer_token) === 'string') {
        headers['Authorization'] = `Bearer ${bearer_token}`;
    }

    // build request options
    let options = {
        url: url,
        method: 'GET',
        headers: headers
    };

    // set params
    if (params !== null && typeof(params) === 'object'){
        options['params'] = params;
    }
    
    // send request
    try {
        response = await Http.request(options)
    }catch(err){
        console.error(err);
    }

    // process the response
    const cleaned_response = cleanResponse(response, validator)

    return cleaned_response;
}


export async function reqDELETE(server, endpoint, params = null, bearer_token = null, validator = null){
    if (!isStringNonEmpty(server) || !isStringNonEmpty(endpoint)) return null;

    // init process vars
    let response = null;

    // build url
    const url = `${server}${endpoint}`;
    console.log(`DELETE: ${url}`)

    // headers
    let headers = { 'Content-Type': 'application/json' };
    if (typeof(bearer_token) === 'string') {
        headers['Authorization'] = `Bearer ${bearer_token}`;
    }

    // build request options
    let options = {
        url: url,
        method: 'DELETE',
        headers: headers
    };

    // set params
    if (params !== null && typeof(params) === 'object'){
        options['params'] = params;
    }
    
    // send request
    try {
        response = await Http.request(options)
    }catch(err){
        console.error(err);
    }

    // process the response
    const cleaned_response = cleanResponse(response, validator)

    return cleaned_response;
}


export async function reqPOST(server, endpoint, body = null, content_type = 'application/json', bearer_token = null, validator = null){
    if (!isStringNonEmpty(server) || !isStringNonEmpty(endpoint)) return null;

    // init process vars
    let response = null;

    // build url
    const url = `${server}${endpoint}`;
    console.log(`POST: ${url}`)

    // headers
    let headers = { 'Content-Type': content_type };
    if (typeof(bearer_token) === 'string') {
        headers['Authorization'] = `Bearer ${bearer_token}`;
    }

    // build request options
    let options = {
        url: url,
        method: 'POST',
        headers: headers
    };

    // set body
    if (body !== null && typeof(body) === 'object'){
        options['data'] = body
    }
    
    // send request
    try {
        response = await Http.request(options)
    }catch(err){
        console.error(err);
    }

    // process the response
    const cleaned_response = cleanResponse(response, validator)

    return cleaned_response;
}


export async function reqPUT(server, endpoint, body = null, content_type = 'application/json', bearer_token = null, validator = null){
    if (!isStringNonEmpty(server) || !isStringNonEmpty(endpoint)) return null;

    // init process vars
    let response = null;

    // build url
    const url = `${server}${endpoint}`;
    console.log(`PUT: ${url}`)

    // headers
    let headers = { 'Content-Type': content_type };
    if (typeof(bearer_token) === 'string') {
        headers['Authorization'] = `Bearer ${bearer_token}`;
    }

    // build request options
    let options = {
        url: url,
        method: 'PUT',
        headers: headers
    };

    // set body
    if (body !== null && typeof(body) === 'object'){
        options['data'] = body
    }
    
    // send request
    try {
        response = await Http.request(options)
    }catch(err){
        console.error(err);
    }

    // process the response
    const cleaned_response = cleanResponse(response, validator)

    return cleaned_response;
}
