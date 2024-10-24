'use strict';

// filesystem
import fs from 'fs';

// datatype lib
import { isStringNonEmpty } from '../../gen/datatype.js';


export function fileExists(path){

    // init
    let exists = false;

    // check if already in storage
    try {
        exists = fs.existsSync( path )
    } catch(err) {
        console.error(err);
    }

    return exists;
}


export function fileDelete(path, opts = {}){

    // init
    let success = false;

    // delete file
    try {
        fs.rmSync( path, opts );
        success = true;
    } catch(err) {
        console.error(err);
    }

    return success;
}


export function mkdir(path){
    
    // init 
    let success = false;

    // check if already exists
    if (fileExists(path)) return true;

    // create dir if doesn't already exists
    try {
        fs.mkdirSync(path, { recursive: true });
        success = true;
    } catch(err) {
        console.error(err);
    }

    return success;
}


export function fileWrite(path, data){

    // init
    let success = false;

    // write to dir
    try{
        fs.writeFileSync( path, data );
        success = true;
    } catch(err) {
        console.error(err);
    }

    return success;
}


export function fileRead(path){

    // init
    let content = null

    // read path
    try {
        content = fs.readFileSync(path, 'utf8')
    } catch(err) {
        console.error(err);
    }

    return content;
}


export function fileReadAsBuffer(path){

    // init
    let content = null

    // read path
    try {
        content = fs.readFileSync(path)
    } catch(err) {
        console.error(err);
    }

    return content;
}

/**
 * Loads a JSON from path
 */
export function load_json (path) {

    // read
    const content = fileRead(path);

    // check
    if (content === null) return null;

    // parse
    try {
        return JSON.parse(content)
    } catch {
        return null
    }
}


/**
 * Write a JSON to path
 */
export function write_json (path, json_obj) {

    // stringify
    let json_str = null;
    try {
        json_str = JSON.stringify(json_obj);
    } catch(err) {
        console.error(err);
    }

    // check
    if ( !isStringNonEmpty(json_str) ) return false;

    // init
    let success = false;

    // write to dir
    try{
        fs.writeFileSync( path, json_str, { encoding: 'utf8', flag: 'w' } );
        success = true;
    } catch(err) {
        console.error(err);
    }

    // check
    if (!success) return false;

    // make sure it exists
    return fileExists(path);
}


/**
 * Loads a CSV from path
 */
export function load_csv (path, delimiter = '","') {

    // load from storage
    let csv;
    try {
        csv = fs.readFileSync(path, 'utf8')
    } catch {
        return null
    }

    // remove leading & trailing whitespaces
    csv = csv.trim();
    
    // split rows
    csv = csv.split('\n');

    // remove leading & trailing whitespaces
    csv = csv.map(row => row.trim());
    
    // split values
    csv = csv.map(row => row.split(delimiter));

    // remove leading & trailing whitespaces
    csv = csv.map(row => row.map(val => val.trim()));

    // remove " characters
    csv = csv.map(row => row.map(val => val.replaceAll('"', '')));

    return csv
}