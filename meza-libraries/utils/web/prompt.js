'use strict';

// import sweet alert lib
import swal from 'sweetalert';


// message box appears on screen
export async function popup(text, type = 'info'){
    swal({
        icon: type,
        title: type,
        text: text
    })
}

// TODO: with y/n
