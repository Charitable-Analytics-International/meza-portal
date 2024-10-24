'use strict';

// CLI input lib
import readline from 'readline';


/**
 * Asks a question through the CLI
 */
export async function ask (question) {

    // User input CLI
    const ReadLine = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    // init result holding variable
    let res = null

    // instantiate promise
    await new Promise((resolve, reject) => {
        ReadLine.question(question, input => {
            res = input
            resolve()
        })
    })

    // close stream
    ReadLine.close();

    // return input
    return res
}