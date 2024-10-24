'use strict';

// svelte data store
import { writable, get } from 'svelte/store';


// variables
export const signed_in = writable(false);
export const frozen = writable(false);


// setters
export function sign_in(){
    console.log("INFO: Signing in");
    signed_in.set(true);
}

export function sign_out(){
    console.log("INFO: Signing out");
    signed_in.set(false);
}

export function freeze(){
    frozen.set(true);
}

export function unfreeze(){
    frozen.set(false);
}


// getters
export function is_signed_in(){
    return get(signed_in);
}

export function is_frozen(){
    return get(frozen);
}
