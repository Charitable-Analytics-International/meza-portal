'use strict';

// import libs submit form data
import fetch from 'node-fetch';
// import https from 'https';

// import format lib
import { objToForm } from './format.js';


export async function reqGET(url, bearer_token = null, validator = null){

    // init process vars
    let response = null;

    // build request options
    const opts = {
        method: 'GET',
        // agent: new https.Agent(),
        headers: typeof(bearer_token) === 'string' ? { 'Authorization': `Bearer ${bearer_token}` } : {}
    };

    // send request inside Promise
    await new Promise(resolve => {
        try {
            fetch(url, opts)
            .then(_response => _response.json())
            .then(data => {
                response = data;
                resolve();
            })
        }catch (err){
            console.log(err);
            resolve();
        }
    })

    // check
    if (response === undefined || response === null || typeof(response) !== 'object'){
        return null;
    }

    // if validator provided
    if(validator !== null){
        const { error } = validator.validate(response)
        if (error) {
            console.log(response);
            console.log(error.details)
            return null;
        }
    }

    return response;
}

export async function reqPOST(url, body, validator = null){

    // init process vars
    let response = null;

    // build request options
    const opts = {
        method: 'POST',
        // agent: new https.Agent(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: objToForm(body)
    };

    // send request inside Promise
    await new Promise(resolve => {
        try {
            fetch(url, opts)
            .then(_response => _response.json())
            .then(data => {
                response = data;
                resolve();
            })
        }catch (err){
            console.log(err);
            resolve();
        }
    })

    // check
    if (response === undefined || response === null || typeof(response) !== 'object'){
        return null;
    }

    // if validator provided
    if(validator !== null){
        const { error } = validator.validate(response)
        if (error) {
            console.log(response);
            console.log(error.details)
            return null;
        }
    }

    return response;
}
