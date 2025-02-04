'use strict';

// datatype lib
import { isArrayNonEmpty, isString, isStringNonEmpty } from '../../../assets/libs/datatypes.js';

// endpoints
import { ENDPOINT_FILE_CELL } from '../../../config.js';

// config
const EDITABLE_DATA_TYPES = ['float', 'integer', 'bubble', 'string'];


export async function promptForCellValue(image_id, cells){

    // validate input
    if(!isArrayNonEmpty(cells)) return null;
    
    // get the data types of the selected cells
    const values = [...new Set(cells.map(cell => cell['value']))];
    const data_types = [...new Set(cells.map(cell => cell['data_type']))];
    const opts = [...new Set(cells.map(cell => cell['opts']))];

    // make sure we dont have multiple data types
    if(data_types.length > 1){
        swal({
            icon: 'error',
            title: 'Error',
            text: "You can't edit cells containing different data types."
        })
        return null;
    }

    // grab data_type
    const data_type = data_types[0];

    // data type validation
    if (!EDITABLE_DATA_TYPES.includes(data_type)) {
        swal({
            icon: 'error',
            title: 'Error',
            text: "You can't edit this cell."
        })
        return null;
    }

    // if we have bubbles
    if(data_type === 'bubble') {
        if (opts.length > 1){
            swal({
                icon: 'error',
                title: 'Error',
                text: "You can't edit cells containing different options."
            })
            return null;
        }
    }

    // set opts
    const first_opts = data_type === 'bubble' ? opts[0].split(',').map(d => d.trim()) : null;

    // set first value
    const first_value = values[0];
    const first_rect_id = cells[0]['rect_id'];

    // create text to display
    let text = '';
    if (cells.length === 1){
        text = `Current Value: ${first_value}`;
    }
    if (data_type === 'bubble'){
        text = `${text}\nOptions : [ ${first_opts.join(' - ')} ]`
    }

    // create a image url
    let image_url = null;
    if (cells.length === 1){
        image_url = ENDPOINT_FILE_CELL(image_id, first_rect_id);
    }

    // create html elements
    const div = document.createElement('div');
    const input = document.createElement('input');

    // if enter is pressed, triggers 'Confirm' button
    input.addEventListener('keydown', e => {
        const { code } = e;
        if (code === 'Enter') {
            const swalConfirmButton = document.getElementsByClassName('swal-button swal-button--update')[0]
            swalConfirmButton.click()
        }
    })

    // if an image url is set
    if (isStringNonEmpty(image_url)){
        const img = document.createElement('img');
        const br = document.createElement('br');

        img.style.maxWidth = '90%';
        img.onload = function(){
            div.prepend(br);
            div.prepend(img);
        }
        img.src = image_url;
    }

    // append
    div.appendChild(input);

    // focus after 30 ms
    setTimeout(() => { input.focus() }, 30);

    // build swal description
    const swal_description = {
        title: 'Edit',
        text: text,
        buttons: {
            cancel: 'Cancel',
            failed: {
                text: 'Failed',
                className: 'swal-button--danger'
            },
            update: {
                text: 'Confirm',
            }
        },
        content: div
    }

    // prompt the user to enter a value using swal
    let value = await new Promise((resolve, reject) => {
        swal(swal_description).then(option => {

            // skip if canceled
            if (option !== 'failed' && option !== 'update') return;

            // get value
            let value = option === 'failed' ? 'failed' : input.value

            // destroy field
            input.parentNode.removeChild(input)

            // finish
            if (isString(value)) {
                resolve(value)
            } else {
                resolve(null);
            }
        })
    });

    // check if returned a string
    if (!isString(value)) return null;

    // remove trailing or leading white spaces
    value = value.trim();

    // input too long
    if (value.length > 100) {
        swal({
            icon: 'error',
            title: 'Error',
            text: "Input is too long."
        })
        return null;
    }

    // contains invalid characters
    const invalidCharsRegex = /[\'\"\;\\]/; 
    if (invalidCharsRegex.test(value)) {
        swal({
            icon: 'error',
            title: 'Error',
            text: "Invalid input."
        })
        return null;
    }

    // if bubble check that value is valid
    if (data_type === 'bubble'){
        if (value !== '' && value !== 'failed' && !first_opts.includes(value)) {
            swal({
                icon: 'error',
                title: 'Error',
                text: "Invalid value."
            })
            return null;
        }
    }

    return value;
}
