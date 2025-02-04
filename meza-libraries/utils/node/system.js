'use strict';

export async function wait(in_ms){
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, +in_ms)
    })
}