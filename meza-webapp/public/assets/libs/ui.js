'use strict';

/**
* Freeze/unfreeze UI
*/

export function freeze() {
    document.body.style.cursor = "wait";
}

export function unfreeze() {
    document.body.style.cursor = "default";
}
