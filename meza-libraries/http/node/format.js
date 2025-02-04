'use strict';


// helper function to convert object to form
export function objToForm(obj){
    return Object.keys(obj).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`).join('&');
}
