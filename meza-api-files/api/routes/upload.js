'use strict'

// config
import config from '../configs/configs.js';

// validator
import upload_validator from '../validations/upload.js';

// data type lib
import { isArray, isNumber, isObject, isStringNonEmpty } from '../../../meza-libraries/gen/datatype.js';

// crypto lib
import { decrypt as decrypt_str } from '../../../meza-libraries/crypto/node/decrypt.js';
import { parseKey } from '../../../meza-libraries/crypto/node/libs.js';

// image proc lib
import { decrypt as decrypt_img } from '../../../meza-libraries/imageproc/node/imageproc.js';


async function upload_image(image, database, storage, logger, account_id){

    // grab info
    const { name, mimetype, data } = image

    // Grab the file type (jpg, png, jpeg, ...)
    let fileType = mimetype.split('/')
    fileType = fileType[fileType.length - 1]

    // insert image in db
    const query = `INSERT INTO image ( account_id, name ) VALUES ( ${account_id}, '${name}' ) RETURNING id`;

    // run
    let results, metadata;
    try{
        [results, metadata] = await database.query(query);
    }catch(err){
        console.error(err)
        logger.error('could not insert image in database')
        return false;
    }

    // check
    if (!isArray(results) || results.length !== 1) {
        logger.error('could not insert image in database');
        return false;
    }

    // Grab image id as name for image
    const image_id = results[0]['id'];

    // build file key
    const file_key = storage.imageRawFileKey(image_id, fileType)

    // upload
    const uploadResult = await storage.uploadByFile(data, file_key)

    // prompt
    if (uploadResult === undefined || uploadResult === null || uploadResult === false) {
        logger.error(`Image ${image_id} could not be uploaded`)

        // if failed, delete from db
        try{
            await database.query(`DELETE FROM image WHERE id = '${image_id}'`);
        }catch(err){
            logger.error(`could not delete image from database (${image_id})`)
        }

        return false
    }

    // log
    logger.info(`Image ${image_id} was uploaded to localstorage`);

    return true;
}


function _parseKey(enc_key, privatekey){
    if (!isStringNonEmpty(enc_key)) return null;
    if (!isStringNonEmpty(privatekey)) return null;

    // decrypt key using private key
    const key = decrypt_str(enc_key, privatekey);
    if (!isStringNonEmpty(key)) return null;

    // parse key into the pixel unscrambler format
    const parsed_key = parseKey(key);
    if (!isObject(parsed_key)) return null;

    return parsed_key;
}



function register(server, serviceLocator) {

    // --- Upload ---
    server.post(
        '/api/files/upload',
        upload_validator(),
        async (req, res, next) => {

            // TODO: Do not pass using headers
            // grab account id
            const account_id = req.headers['account-id'];

            // grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // check input
            if (!isNumber(account_id)) {
                logger.error(`account id is invalid`)
                return res.status(500).send({ message: `server error - account id invalid` })
            }

            // grab storage
            const storage = serviceLocator.get('storage')

            // grab pictures
            const { pictures } = req;

            // grab encrypted key & account's private key
            const { enc_key } = req.body;
            const privatekey = req.headers['private-key'];

            // check if we have an encryption key
            const is_image_encrypted = isStringNonEmpty(enc_key) && enc_key.length > 40;

            // parse key
            const parsed_key = is_image_encrypted ? _parseKey(enc_key, privatekey) : null;

            // if failed to decrypt
            if (is_image_encrypted && !isObject(parsed_key)) {
                logger.error(`could not parse encryption key : (${enc_key})`)
                return res.status(500).send({ message: `could not parse encryption key` })
            }

            // go through images
            let successful_uploads = 0;
            for (let picture of pictures){

                // decrypt
                if (isObject(parsed_key)){
                    try {
                        picture['data'] = await decrypt_img(picture['data'], parsed_key);
                    } catch(err) {
                        console.error(err);
                        logger.error(`could not decrypt image with encryption key : ${enc_key}`);
                    }
                }

                // insert in database & upload to storage
                if (await upload_image(picture, database, storage, logger, account_id)){
                    successful_uploads += 1;
                }
            }

            // log
            logger.info(`${successful_uploads} out of ${pictures.length} pictures successfully uploaded`)

            // respond
            if (successful_uploads === pictures.length){
                return res.status(200).send({ message: `${pictures.length} pictures submitted` })
            } else {
                return res.status(500).send({ message: `${successful_uploads} out of ${pictures.length} pictures successfully submitted` })
            }
        }
    )
}


const upload = {
    'register': register
}

export default upload;
