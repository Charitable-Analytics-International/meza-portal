'use strict';

// import 
import { getOriginFromUrl } from '../../gen/datatype.js';


export function makeImageLink(image_id){

    // grab current url
    const current_url = window.location.href;

    // get origin
    const origin = getOriginFromUrl(current_url);

    // build the link to the image
    const link_to_image = `${origin}?image_id=${image_id}`;

    return link_to_image;
}


export function makeCellImageLink(image_id, rect_id){
    return `${makeImageLink(image_id)}&rect_id=${rect_id}`;
}


export function getUrlParams(url){
    
    // init array
    const params = {}
    
    // split at params
    let url_split = url.split('?')

    // if no params
    if (url_split.length !== 2) {
        return params
    }
    
    // grab the right end
    url_split = url_split[1]
    
    // split all
    url_split = url_split.split('&')
    
    // go through
    url_split.forEach(param => {
        // check if contains '='
        if (!param.includes('=')) {
            return params;
        }
        
        const vals = param.split('=')
        if (vals.length !== 2) {
            return params;
        }
        
        params[vals[0]] = vals[1]
    })
    
    return params 
}