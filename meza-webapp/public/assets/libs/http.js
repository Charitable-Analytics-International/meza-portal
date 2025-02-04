'use strict';

import { 
    isStringNonEmpty,
    isNumber,
    isObject,
    uuidValidateV4
} from './datatypes.js';


function parseError(error) {
    let message = 'error parsing request';
    try {
        message = error.details.map(err => err.message).join(', ');
    } catch (err) {
        console.error(err);
    }
    return message;
}

function isValid(data, validator) {
    if (!isObject(data)) return false;
    if (validator === null) return true;
    if (!isObject(validator)) return false;
    
    let valid = true;
    const { error } = validator.validate(data); // your custom validation
    if (error) {
        valid = false;
        console.error(parseError(error));
    }
    return valid;
}

function cleanResponse(response, validator = null) {
    if (!isObject(response) || !isNumber(response.status) || !isObject(response.data)) {
        return null;
    }
    
    const { error, data, status, headers } = response;
    
    // Fallback for error messages
    let data_str = 'error';
    if (isStringNonEmpty(data.message)) {
        data_str = data.message;
    } else {
        try {
            data_str = JSON.stringify(data);
        } catch (err) {
            console.error(err);
        }
    }
    
    // If error or HTTP >= 400
    if (error || +status >= 400) {
        return {
            status: +status,
            data: { message: data_str },
            headers: headers
        };
    }
    
    // Validate using the (optional) validator
    if (!isValid(data, validator)) {
        return {
            status: 400,
            data: { message: data_str },
            headers: headers
        };
    }
    
    // Good response
    return {
        status: +status,
        data: data,
        headers: headers
    };
}


// -----------------------------------------------------------
// export function: extractSID(response)
// -----------------------------------------------------------
export function extractSID(response) {
    if (!isObject(response)) return null;
    const { status, headers } = response;
    if (!isNumber(status) || +status >= 400) return null;
    if (!isObject(headers)) return null;
    
    // Attempt to read 'Set-Cookie' from the headers
    if (!isStringNonEmpty(headers['Set-Cookie'])) return null;
    if (!headers['Set-Cookie'].includes('sid=')) return null;
    
    // Extract SID
    const sid = headers['Set-Cookie'].split(';')[0].split('=').pop();
    if (!uuidValidateV4(sid)) {
        return null;
    }
    return sid;
}


// -----------------------------------------------------------
// export function: extractPublicKey(response)
// -----------------------------------------------------------
export function extractPublicKey(response) {
    if (!isObject(response)) return null;
    const { status, data } = response;
    if (+status >= 400) return null;
    
    const { publickey } = data;
    if (!isStringNonEmpty(publickey)) {
        return null;
    }
    return publickey;
}


// -----------------------------------------------------------
// Fetch call that returns an object {status, data, headers}
// -----------------------------------------------------------
async function doFetch(method, server, endpoint, {
    params = null,
    body = null,
    content_type = 'application/json',
    bearer_token = null,
    redirect_to_login = true
} = {}) {
    if (!isStringNonEmpty(server) || !isStringNonEmpty(endpoint)) return null;
    
    // Build URL
    let url = `${server}${endpoint}`;

    // If we have params, append them as query string
    if (params && typeof params === 'object') {
        const qs = new URLSearchParams(params).toString();
        if (qs) {
            url += (url.includes('?') ? '&' : '?') + qs;
        }
    }
    
    console.log(`${method}: ${url}`);
    
    // Prepare fetch options
    const headers = { 'Content-Type': content_type };
    if (typeof bearer_token === 'string') {
        headers['Authorization'] = `Bearer ${bearer_token}`;
    }
    
    const fetchOptions = {
        method,
        headers
    };
    
    // For POST/PUT with JSON content, convert body to JSON
    if (body !== null && typeof body === 'object' && content_type === 'application/json') {
        fetchOptions.body = JSON.stringify(body);
    }
    // If content_type != JSON, you might want to set fetchOptions.body to `body` as-is:
    else if (body !== null) {
        fetchOptions.body = body;
    }
    
    // Perform fetch
    let rawResponse = null;
    try {
        rawResponse = await fetch(url, fetchOptions);
    } catch (err) {
        console.error(err);
        return null;
    }
    
    // Build the response object that matches our original shape
    const status = rawResponse.status;
    let responseData = {};
    let error = null;
    
    try {
        // Attempt to parse JSON body
        responseData = await rawResponse.json();
    } catch (parseErr) {
        // Could not parse JSON => keep it minimal
        error = parseErr;
        console.error('Failed to parse JSON:', parseErr);
        // Optionally read raw text if needed:
        // responseData = await rawResponse.text();
    }
    
    // Extract headers
    const headersObj = {};
    rawResponse.headers.forEach((value, name) => {
        // fetch headers are iterable
        headersObj[name] = value;
    });
    
    const finalResponse = {
        status: status,
        data: responseData,
        headers: headersObj
    };
    if (error) finalResponse.error = error;
    
    return finalResponse;
}


// -----------------------------------------------------------
// export async function: reqGET(...)
// -----------------------------------------------------------
export async function reqGET(server, endpoint, params = null, bearer_token = null, validator = null) {
    const rawResp = await doFetch('GET', server, endpoint, { params, bearer_token });
    if (!rawResp) return null;
    return cleanResponse(rawResp, validator);
}


// -----------------------------------------------------------
// export async function: reqDELETE(...)
// -----------------------------------------------------------
export async function reqDELETE(server, endpoint, params = null, bearer_token = null, validator = null) {
    const rawResp = await doFetch('DELETE', server, endpoint, { params, bearer_token });
    if (!rawResp) return null;
    return cleanResponse(rawResp, validator);
}


// -----------------------------------------------------------
// export async function: reqPOST(...)
// -----------------------------------------------------------
export async function reqPOST(
    server,
    endpoint,
    body = null,
    content_type = 'application/json',
    bearer_token = null,
    validator = null
) {
    const rawResp = await doFetch('POST', server, endpoint, {
        body,
        content_type,
        bearer_token
    });
    if (!rawResp) return null;
    return cleanResponse(rawResp, validator);
}


// -----------------------------------------------------------
// export async function: reqPUT(...)
// -----------------------------------------------------------
export async function reqPUT(
    server,
    endpoint,
    body = null,
    content_type = 'application/json',
    bearer_token = null,
    validator = null
) {
    const rawResp = await doFetch('PUT', server, endpoint, {
        body,
        content_type,
        bearer_token
    });
    if (!rawResp) return null;
    return cleanResponse(rawResp, validator);
}
