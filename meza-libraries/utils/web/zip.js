'use strict';

// import libs
import { unzipSync, strFromU8 } from 'fflate';


export async function unzip_json(blob){

    // data as buffer
    const buff = await blob.arrayBuffer();

    // as uint
    const uint_buff = new Uint8Array(buff);

    // unzip
    const unzipped = unzipSync(uint_buff);

    // grab
    const content = Object.values(unzipped).map(uint8arr => {
        return JSON.parse(strFromU8(uint8arr));
    })

    return content;
}


export async function unzip(blob){

    // data as buffer
    const buff = await blob.arrayBuffer();

    // as uint
    const uint_buff = new Uint8Array(buff);

    // unzip
    const unzipped = unzipSync(uint_buff);

    // grab
    const content = Object.values(unzipped).map(uint8arr => {
        return strFromU8(uint8arr);
    })

    return content;
}


export async function load_zipped_json(url) {

    // init
    let response = null;
    let success = false;

    // send a request for the image
    await new Promise(resolve => {

        // init xml requests
        const xhr = new XMLHttpRequest();

        // configure request
        xhr.open("GET", url, true);
        xhr.responseType = 'blob'

        // on response
        xhr.onload = () => {
            success = true;

            // parse response
            response = xhr.response;
            
            resolve();
        }
        xhr.onerror = () => {
            resolve();
        }

        // send request
        xhr.send(null);
    })

    // validate
    if (!success) return null;

    // attempt to unzip
    const unzipped = await unzip(response);

    // verify
    if (unzipped === undefined || unzipped === null || !Array.isArray(unzipped) || unzipped.length !== 1) return null;

    // set
    response = unzipped[0];

    return response;
}


export async function load_json(url) {

    // init
    let response = null;
    let success = false;

    // send a request for the image
    await new Promise(resolve => {

        // init xml requests
        const xhr = new XMLHttpRequest();

        // set MIME type
        xhr.overrideMimeType("application/json");

        // configure request
        xhr.open("GET", url, false);

        // on response
        xhr.onload = () => {
            success = true;

            // parse response
            response = JSON.parse(xhr.responseText);
            
            resolve();
        }
        xhr.onerror = () => {
            resolve();
        }

        // send request
        xhr.send(null);
    })

    // validate
    if (!success) return null;

    return response;
}
