'use strict';

// sharp
import sharp from 'sharp';
sharp.cache(false);

// datatype lib
import { isNumber } from '../../gen/datatype.js';


export async function get_metadata(imageBuff){

    let metadata = null;

    await new Promise((resolve, reject) => {
        try{
            // load image with sharp
            const image = sharp(imageBuff);

            // load metadata
            image
                .metadata()
                .then(function(_metadata) {
                    metadata = _metadata
                    resolve()
                })
        }catch(err){
            console.log(err);
            resolve();
        }
    })

    return metadata;
}


export async function load_image(imageBuff, rotate = null, quality = 85) {
    if (isNumber(rotate)) {
        return await sharp(imageBuff)
            .jpeg({
                quality: quality
            })
            .rotate(rotate)
            .toBuffer()
    }else {
        return await sharp(imageBuff)
            .jpeg({
                quality: quality
            })
            .toBuffer()
    }
}


export async function resize_image(imageBuff, width = 300){
    return await sharp(imageBuff)
            .resize(width)
            .toBuffer()
}


export function info(mat){
    return {
        'width': +mat.cols,
        'height': +mat.rows,
        'channels': +mat.channels()
    }
}


export async function decrypt(enc_buff, parsed_key){
    
    // convert to raw
    const { data, info } = await sharp(enc_buff)
                        .extractChannel(0)
                        .raw()
                        .toBuffer({ resolveWithObject: true })
    
    // grab info
    const { width, height, channels } = info;

    // init vars
    let dec_arr = [];
    let dec_buff = null;
    let key_index = 0;

    // convert to array
    const enc_arr = new Uint8Array(data);

    // go through pixels
    for (let pixel of enc_arr) {

        // encrypt using key by running bitwise xor
        const new_value = (pixel ^ parsed_key[key_index]) % 256;

        // increment key index
        key_index = (key_index + 1) % parsed_key.length;

        // add new value
        dec_arr.push(new_value);
    }

    // convert to uint8
    dec_arr = new Uint8Array(dec_arr);

    // convert to buffer
    dec_buff = Buffer.from(dec_arr)

    // convert
    return await sharp(dec_buff, {
        raw: {
            height: height,
            width: width,
            channels: channels
        }
    }).jpeg({
        quality: 90
    })
    .toBuffer()
}
