'use strict';

// child process spawner
import { spawn } from 'child_process';

// import configs
import configs from './configs.js';

// import datatype lib
import { isStringNonEmpty } from '../../meza-libraries/gen/datatype.js';

// import storage lib
import { delete_image_in_local_storage, download_file_from_remote_storage,
            upload_file_to_remote_storage } from '../libs/storage.js';

// import database helper functions
import { select_images_with_status_null, update_image_status,
            update_images_status, db_query } from '../../meza-libraries/sql/dbhelper.js';

// import configs constants
const NAME = configs.NAME;
const PYSCRIPT_PATH = configs.PYSCRIPT_PATH;
const IMG_LIMIT = +configs.IMG_LIMIT;
const TMP_DIRPATH = configs.TMP_DIRPATH;

const FAILED_STATUS = +configs.status.FAILED;
const IMAGE_STATUS_ON_START = +configs.IMAGE_STATUS_ON_START;
const IMAGE_STATUS_ON_DONE = +configs.IMAGE_STATUS_ON_DONE;


async function initiate( path ) {

    // run
    const result = await new Promise((resolve, reject) => {

        // run the script
        const pyprog = spawn('/usr/bin/python3', [PYSCRIPT_PATH,  path ]);

        let data_str_all = '';
        let error_str_all = '';

        // wait for data
        pyprog.stdout.on('data', (data) => {
            const data_str = data.toString().trim();
            data_str_all += data_str + '\n';
            console.log(data_str); // to print out the data as it comes in
        });

        pyprog.stderr.on('data', (data) => {
            const data_str = data.toString().trim();
            error_str_all += data_str + '\n';
            console.log(data_str); // to print out the errors as they come in
        });

        pyprog.on('close', (code) => {
            if(code !== 0) {
                reject(error_str_all);
            } else {
                const rows = data_str_all.split('\n').map(d => d.trim()).filter(row => row.length > 0);
                const last_row = rows[rows.length - 1];
                resolve(last_row);
            }
        });

        pyprog.on('error', (error) => {
            reject('Failed to start subprocess. ' + error);
        });
    })

    return result;
}


async function _load_file_from_remote_storage(storage, image_id){

    // we don't know the extension of the uploaded image, so try [jpeg, jpg, png] and return the right one
    const remote_file_key = await storage.getImageRawFileKey(image_id);

    // check if found
    if (!isStringNonEmpty(remote_file_key)) return null;

    // create the destination paths
    const destination_file_key = storage.imageProcessedFileKey(image_id);
    const destination_file_path = `${TMP_DIRPATH}${destination_file_key}`;

    // load
    const success = await download_file_from_remote_storage(storage, remote_file_key, destination_file_path);

    // check
    if (!success) return null;

    return destination_file_path;
}


export async function run(serviceLocator){

    // grab database
    const database = serviceLocator.get('database')

    // grab console
    const logger = serviceLocator.get('logger');

    // grab AWS services
    const storage = serviceLocator.get('storage');

    // build SQL query to select images ready for processing
    const query_select_images = select_images_with_status_null(IMG_LIMIT);

    // get all the images to process
    const images = await db_query(database, query_select_images);

    // check if we have images
    if(images.length === 0) return;

    // log the number of images processed during this cycle
    logger.info(`${NAME} is processing ${images.length} images`);

    // ------------------------------------------------------------------------------------------------
    // -------------------------------- Get images from storage ---------------------------------------
    // ------------------------------------------------------------------------------------------------

    // init
    let images_df = [];

    // go through images
    for (const image of images){

        // grab image data
        const image_id = image['id'];

        // load file from remote storage
        const local_path = await _load_file_from_remote_storage(storage, image_id);

        // check
        if (!isStringNonEmpty(local_path)){

            // prompt
            logger.error(`${NAME} could not download image with id (${image_id}), will retry later`);

            // // build SQL query
            // const query = update_image_status(FAILED_STATUS, image_id);

            // // run query
            // await db_query(database, query);

            // // delete image from storage
            // delete_image_in_local_storage(TMP_DIRPATH, image_id);

            // skip
            continue;
        }

        // add to global dataframe
        images_df.push({
            'image_id': image_id,
            'path': local_path
        });
    }

    // stop here
    if (images_df.length === 0) return;

    // ------------------------------------------------------------------------------------------------
    // ------------------------------------ Process Images --------------------------------------------
    // ------------------------------------------------------------------------------------------------

    // init
    let final_image_ids = new Set();

    // go through
    for (let datum of images_df){

        // grab data
        const { path, image_id } = datum;

        // initiate
        const new_path = await initiate( path );

        // check
        if (!isStringNonEmpty(new_path)) {

            // prompt
            logger.error(`${NAME} could not initiate image with id (${image_id})`);

            // build SQL query
            const query = update_image_status(FAILED_STATUS, image_id);

            // run query
            await db_query(database, query);

            // delete image from storage
            delete_image_in_local_storage(TMP_DIRPATH, image_id);

            // skip
            continue;
        }

        // ------------------------------------------------------------------------------------------------
        // ---------------------------------- Push Results to Storage -------------------------------------
        // ------------------------------------------------------------------------------------------------

        // get remote file key
        const remote_file_key = storage.imageProcessedFileKey(image_id);

        // attempt to upload
        const success = await upload_file_to_remote_storage(storage, path, remote_file_key);

        // check
        if (!success) {

            // prompt
            logger.error(`${NAME} could not be upload to storage image with id (${image_id})`);

            // build SQL query
            const query = update_image_status(FAILED_STATUS, image_id);

            // run query
            await db_query(database, query);

            // delete image from storage
            delete_image_in_local_storage(TMP_DIRPATH, image_id);

            // skip
            continue;
        }

        // add
        final_image_ids.add(image_id);
    }

    if (final_image_ids.size === 0) return;

    // ------------------------------------------------------------------------------------------------
    // ------------------------------------- Pass to Next ---------------------------------------------
    // ------------------------------------------------------------------------------------------------

    // build query
    const query_final_update = update_images_status(IMAGE_STATUS_ON_DONE, [...final_image_ids]);

    // set status ready for decoding
    await db_query(database, query_final_update);

    // log
    logger.info(`${NAME} successfully initiated ${images.length} images`);
}
