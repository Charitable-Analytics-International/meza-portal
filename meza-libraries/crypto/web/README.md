# Crypto Lib

    // crypto lib
    import { generate } from '../crypto/generate.js';
    import { encrypt } from '../crypto/encrypt.js';
    import { decrypt } from '../crypto/decrypt.js';

    // generate key
    const { publicKey, privateKey } = await generate();


    // message you want to encrypt (max 256 bytes)
    const message = 'heelllloo'

    // encrypt
    const encryptedData = await encrypt(message, publicKey);
    const decryptedData = await decrypt(encryptedData, privateKey);

    // check
    if (message === decryptedData){
        console.log('success!');
    }

