'use strict';

// child process spawner
import { spawn } from 'child_process';

// import configs
import configs from './configs.js';

// import datatype lib
import { isNumber, isObject, isStringNonEmpty, isArrayNonEmpty } from '../../meza-libraries/gen/datatype.js';

// import filesystem lib
import { fileExists, load_json, write_json } from '../../meza-libraries/storage/node/filesystem.js';

// import storage lib
import { download_file_from_remote_storage, 
            delete_image_in_local_storage } from '../libs/storage.js';

// import database helper functions
import { select_images_by_status, update_image_status, 
    upsert_cells_sharding, db_query } from '../../meza-libraries/sql/dbhelper.js';

// import configs constants
const NAME = configs.NAME;
const OUTPATH_PREFIX = configs.OUTPATH_PREFIX;
const PYSCRIPT_PATH = configs.PYSCRIPT_PATH;
const IMG_LIMIT = +configs.IMG_LIMIT;
const TMP_DIRPATH = configs.TMP_DIRPATH;

const FAILED_STATUS = +configs.status.FAILED;
const IMAGE_STATUS_ON_START = +configs.IMAGE_STATUS_ON_START;
const IMAGE_STATUS_ON_DONE = +configs.IMAGE_STATUS_ON_DONE;


async function contour( image_id, path ) {
    
    // build outpath
    const outpath = `${TMP_DIRPATH}${image_id}/${OUTPATH_PREFIX}-out.json`;

    // run
    const result = await new Promise((resolve, reject) => {

        // run the script
        const pyprog = spawn('/usr/bin/python3', [PYSCRIPT_PATH, path, outpath ]);

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


function is_contour_result_valid(results){

    // check
    if (!isObject(results)) return false;

    // grab data
    const { table_template_id, rectangles } = results;

    // check if contains tables
    if (!isNumber(table_template_id)) return false;
    if (!isArrayNonEmpty(rectangles)) return false;

    return true;
}


export async function run(serviceLocator){

    // grab database
    const database = serviceLocator.get('database')

    // grab console
    const logger = serviceLocator.get('logger');

    // grab AWS services
    const storage = serviceLocator.get('storage');

    // build SQL query to select images ready for processing
    const query_select_images = select_images_by_status(IMAGE_STATUS_ON_START, IMG_LIMIT);

    // get all the images to process
    const images = await db_query(database, query_select_images);

    // check if we have images
    if(images.length === 0) return;

    // log the number of images processed during this cycle
    logger.info(`${NAME} is processing ${images.length} images`);

    // ------------------------------------------------------------------------------------------------
    // -------------------------------- Get images from storage ---------------------------------------
    // ------------------------------------------------------------------------------------------------

    // init dataframe
    let images_df = [];

    // go through images
    for (const image of images){

        // grab image data
        const image_id = image['id'];

        // we don't know the extension of the uploaded image, so try [jpeg, jpg, png] and return the right one
        const remote_file_key = await storage.getImageRawFileKey(image_id);

        // create the destination paths
        const local_path = `${TMP_DIRPATH}${remote_file_key}`;

        // download image from storage
        const success = await download_file_from_remote_storage(storage, remote_file_key, local_path);
        if (!success){

            // prompt
            logger.error(`${NAME} could not download image from storage with key (${remote_file_key})`);

            // build SQL query
            const query = update_image_status(FAILED_STATUS, image_id);

            // run query
            await db_query(database, query);

            // delete image from storage
            delete_image_in_local_storage(TMP_DIRPATH, image_id);

            // skip this image
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
    // -------------------------------------- Shard Images --------------------------------------------
    // ------------------------------------------------------------------------------------------------

    for (const datum of images_df){

        // grab data
        const { path, image_id } = datum;

        // shard
        const results_json_path = await contour( image_id, path );

        // check results
        if (!isStringNonEmpty(results_json_path) || !fileExists(results_json_path)) {

            // prompt
            logger.error(`${NAME} did not return a result json file ${image_id}`);

            // build SQL query
            const query = update_image_status(FAILED_STATUS, image_id);

            // run query
            await db_query(database, query);

            // delete image from storage
            delete_image_in_local_storage(TMP_DIRPATH, image_id);

            // skip
            continue;
        }

        // load results
        const results = load_json(results_json_path);

        // validate results
        if (!is_contour_result_valid(results)) {

            // prompt
            logger.error(`${NAME} could not process result file`);

            // build SQL query
            const query = update_image_status(FAILED_STATUS, image_id);

            // run query
            await db_query(database, query);

            // delete image from storage
            delete_image_in_local_storage(TMP_DIRPATH, image_id);

            // stop here
            continue;
        }

        // ------------------------------------------------------------------------------------------------
        // --------------------------------- Push Results to Database -------------------------------------
        // ------------------------------------------------------------------------------------------------

        // grab data
        const { table_template_id, rectangles, rotation } = results;

        // go through rectangles
        const final_cells = rectangles.map(rectangle => {

            // grab cell information
            const { rect_id, tl_x, tl_y, tr_x, tr_y, bl_x, bl_y, br_x, br_y, opts, data_type } = rectangle;
        
            // create cell
            const datum = {
                'image_id': image_id,
                'rect_id': +rect_id,
                'tl_x': +tl_x,
                'tl_y': +tl_y,
                'tr_x': +tr_x,
                'tr_y': +tr_y,
                'bl_x': +bl_x,
                'bl_y': +bl_y,
                'br_x': +br_x,
                'br_y': +br_y,
                'opts': opts,
                'data_type': data_type
            }

            return datum;
        });

        // build SQL query to delete cells
        const query_delete_cells = `DELETE FROM cell WHERE image_id = '${image_id}'`;

        // run query
        await db_query(database, query_delete_cells);

        // build SQL query to upsert cells
        const upsert_cells = upsert_cells_sharding(final_cells);

        // run query
        await db_query(database, upsert_cells);
        
        // ---------------------------------------------------------------------------------------
        // -------------------------------------- Done -------------------------------------------
        // ---------------------------------------------------------------------------------------

        // build the final update query
        const args = [
            isNumber(rotation) ? `rotation = ${rotation}` : 'rotation = 0', 
            // `table_template_id = ${table_template_id}`,
            `table_template_id = NULL`,
            `status = ${IMAGE_STATUS_ON_DONE}`
        ]

        // build query
        const query_update_final = `UPDATE image SET ${args.join(', ')} WHERE id = '${image_id}'`;
        
        // set status ready for decoding
        await db_query(database, query_update_final);

        logger.info(`${NAME} successfully extracted tables and results saved for image with id ${image_id}`);
    }
}
