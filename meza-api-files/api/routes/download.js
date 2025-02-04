'use strict'

// import config
import config from '../configs/configs.js';

// middleware lib
import validator from '../../../meza-libraries/middlewares/validator.js';

// image processing lib
import { get_metadata, load_image, resize_image } from '../../../meza-libraries/imageproc/node/imageproc.js';

// datatype lib
import { isArray, isNumber } from '../../../meza-libraries/gen/datatype.js';

// schemas
import by_image from '../validations/by_image.js';
import by_rect from '../validations/by_rect.js';
import by_rotation from '../validations/by_rotation.js';


async function check_if_image_exists_in_db(database, image_id){

    // build query
    const query = `SELECT id FROM image WHERE id = '${image_id}'`;

    // run query
    let results, metadata;
    try {
        [ results, metadata ] = await database.query(query);
    } catch(err) {
        console.error(err);
        return false;
    }

    return isArray(results) && results.length > 0;
}


async function get_image_rotation(database, image_id){

    const query = `SELECT rotation FROM image WHERE id = '${image_id}'`;

    // run query
    let results, metadata;
    try {
        [ results, metadata ] = await database.query(query);
    } catch(err) {
        console.error(err);
        return null;
    }

    // validate
    if (!isArray(results) || results.length < 1) return null;

    // get rotation
    const { rotation } = results[0];

    // validate
    if (!isNumber(rotation)) return null;

    return rotation;
}


async function check_if_cell_image_exists_in_db(database, image_id, rect_id){

    // build query
    const query = `SELECT id FROM cell WHERE image_id = '${image_id}' AND rect_id = ${rect_id}`;

    // run query
    let results, metadata;
    try {
        [ results, metadata ] = await database.query(query);
    } catch(err) {
        console.error(err);
        return false;
    }

    return isArray(results) && results.length > 0;
}


async function check_if_cell_image_exists_in_db_and_public(database, image_id, rect_id){

    // build query
    const query = `SELECT id FROM cell WHERE image_id = '${image_id}' AND rect_id = ${rect_id} AND public = true`;

    // run query
    let results, metadata;
    try {
        [ results, metadata ] = await database.query(query);
    } catch(err) {
        console.error(err);
        return false;
    }

    return isArray(results) && results.length > 0;
}


async function rotate_image(file, metadata, rotation){

    // get orientation
    const { orientation } = metadata;

    // fix orientation
    if (typeof(orientation) === 'number'){
        /**
            1 = 0 degrees: the correct orientation, no adjustment is required.
            2 = 0 degrees, mirrored: image has been flipped back-to-front.
            3 = 180 degrees: image is upside down.
            4 = 180 degrees, mirrored: image has been flipped back-to-front and is upside down.
            5 = 90 degrees: image has been flipped back-to-front and is on its side.
            6 = 90 degrees, mirrored: image is on its side.
            7 = 270 degrees: image has been flipped back-to-front and is on its far side.
            8 = 270 degrees, mirrored: image is on its far side.
        */

        let _rotation = 0;
        if (orientation === 1 || orientation === 2){
            _rotation = 0;
        } else if (orientation === 3 || orientation === 4){
            _rotation = 180;
        } else if (orientation === 5 || orientation === 6){
            _rotation = 90;
        } else if (orientation === 7 || orientation === 8){
            _rotation = 270;
        }

        if (rotation === undefined || rotation === null){
            // no rotation was provided in query, sharp will rotate automatically using exif orientation
            file = await load_image(file, null, config.DOWNLOAD_JPEG_QUALITY);

        }else if(_rotation !== rotation){
            // rotation provided as input, but not the same as image exif data, so we apply an extra rotation
            console.log(`not same (${_rotation}, ${rotation}) deg`)
            file = await load_image(file, rotation - _rotation, config.DOWNLOAD_JPEG_QUALITY);

        }else {
            // rotation provided as input, and same as image exif data, so sharp will rotate automatically using exif orientation
            file = await load_image(file, null, config.DOWNLOAD_JPEG_QUALITY);
        }
    }else{

        // init
        let _rotation = 0;

        // if rotate was specified in query
        if (rotation === undefined || rotation === null || !isNumber(rotation)) {
            _rotation = 0
        }else{
            try{
                _rotation = +rotation
            }catch(err){
                _rotation = 0;
            }
        }

        // modulo rotation
        _rotation = (360 - _rotation) % 360

        // load and rotate
        file = await load_image(file, _rotation, config.DOWNLOAD_JPEG_QUALITY);
    }

    return file;
}


function register(server, serviceLocator) {

    // --- Get Image ---
    server.get(
        '/api/files/:image_id',
        validator({
            params: by_image,
            query: by_rotation
        }),
        async (req, res, next) => {

            // grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // grab storage
            const storage = serviceLocator.get('storage')

            // get params
            const { image_id } = req.params;
            const { rotation, resize } = req.query;

            // check if exists
            if (!(await check_if_image_exists_in_db(database, image_id))){
                logger.error('image does not exist in database');
                return res.status(400).send({ message: `image does not exist in database` })
            }

            // build path
            let file_key = storage.imageProcessedFileKey(image_id);

            // get
            let file = await storage.get(file_key)
            if (file === undefined || file === null) {
                file_key = file_key.replace('.jpg', '.jpeg')
                file = await storage.get(file_key)
                if (file === undefined || file === null) {
                    logger.error(`picture ${file_key} could not be retrieved`)
                    return res.status(400).send({ message: `file could not be retrieved` })
                }
            }

            // get file metadata
            const metadata_raw = await get_metadata(file);
            if (metadata_raw === null){
                logger.error(`picture ${file_key} could not be processed`)
                return res.status(500).send({ message: `server error` })
            }

            // rotate
            file = await rotate_image(file, metadata_raw, rotation);

            // get file metadata
            const metadata_proc = await get_metadata(file);
            if (metadata_proc === null){
                logger.error(`picture ${file_key} could not be processed`)
                return res.status(500).send({ message: `server error` })
            }

            // resize and rotate
            if (isNumber(resize)) {
                if (resize > 0 && resize < 1.0) {
                    const new_width = Math.round(metadata_proc.width * resize);
                    file = await resize_image(file, new_width);
                } else if (resize > 1) {
                    const new_width = Math.round(resize);
                    file = await resize_image(file, new_width);
                }
            }

            // get file metadata
            const metadata_final = await get_metadata(file);
            if (metadata_final === null){
                logger.error(`picture ${file_key} could not be processed`)
                return res.status(500).send({ message: `server error` })
            }

            // get resize ratio
            const resize_ratio = metadata_final.width / metadata_proc.width;

            // log
            logger.info(`picture ${file_key} was retrieved`)

            // return, with metadata joined
            return res.status(200).set({
                'x-image-metadata': JSON.stringify({
                    'ratio': resize_ratio,
                })
            }).send(file);
        }
    )


    // --- Get Image Metadata ---
    server.get(
        '/api/filesmetadata/:image_id',
        validator({
            params: by_image
        }),
        async (req, res, next) => {

            // grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // grab storage
            const storage = serviceLocator.get('storage')

            // get params
            const { image_id } = req.params;

            // check if exists
            if (!(await check_if_image_exists_in_db(database, image_id))){
                logger.error('image does not exist in database');
                return res.status(400).send({ message: `image does not exist in database` })
            }

            // build path
            let file_key = storage.imageProcessedFileKey(image_id);

            // get
            let file = await storage.get(file_key)
            if (file === undefined || file === null) {
                file_key = file_key.replace('.jpg', '.jpeg')
                file = await storage.get(file_key)
                if (file === undefined || file === null) {
                    logger.error(`picture ${file_key} could not be retrieved`)
                    return res.status(400).send({ message: `file could not be retrieved` })
                }
            }

            // get file metadata
            const metadata_raw = await get_metadata(file);
            if (metadata_raw === null){
                logger.error(`picture ${file_key} could not be processed`)
                return res.status(500).send({ message: `server error` })
            }

            // get current rotation
            const rotation = await get_image_rotation(database, image_id);

            // rotate
            file = await rotate_image(file, metadata_raw, rotation);

            // get file metadata
            const metadata_proc = await get_metadata(file);
            if (metadata_proc === null){
                logger.error(`picture ${file_key} could not be processed`)
                return res.status(500).send({ message: `server error` })
            }

            logger.info(`metadata of picture ${file_key} was retrieved`)
            return res.status(200).send(metadata_proc);
        }
    );


    // --- Get Cell Image ---
    server.get(
        '/api/files/:image_id/:rect_id',
        validator({
            params: by_rect
        }),
        async (req, res, next) => {

            // grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // grab storage
            const storage = serviceLocator.get('storage')

            // get params
            const { image_id, rect_id } = req.params;

            // check if exists
            if (!(await check_if_cell_image_exists_in_db(database, image_id, rect_id))){
                logger.error('cell image does not exist in database');
                return res.status(400).send({ message: `cell image does not exist in database` })
            }

            // build path
            const file_key = storage.cellFileKey(image_id, rect_id);

            // get
            let file = await storage.get(file_key)
            if (file === undefined || file === null) {
                logger.error(`picture ${file_key} could not be retrieved`)
                return res.status(400).send({ message: `file could not be retrieved` })
            }

            // get file metadata
            const metadata = await get_metadata(file);
            if (metadata === null){
                logger.error(`picture ${file_key} could not be processed`)
                return res.status(500).send({ message: `server error` })
            }

            // load image
            file = await load_image(file, 0, config.DOWNLOAD_JPEG_QUALITY);

            logger.info(`picture ${file_key} was retrieved`);
            res.setHeader('Content-Type', 'image/jpeg');
            return res.status(200).send(file)
        }
    )


    // --- Get Cell Image PUBLIC ---
    server.get(
        '/api/filespub/:image_id/:rect_id',
        validator({
            params: by_rect
        }),
        async (req, res, next) => {

            // grab database
            const database = serviceLocator.get('database')

            // grab logger
            const logger = serviceLocator.get('logger')

            // grab storage
            const storage = serviceLocator.get('storage')

            // get params
            const { image_id, rect_id } = req.params;

            // check if exists AND public
            if (!(await check_if_cell_image_exists_in_db_and_public(database, image_id, rect_id))){
                logger.error('cell image does not exist in database');
                return res.status(400).send({ message: `cell image does not exist in database` })
            }

            // build path
            const file_key = storage.cellFileKey(image_id, rect_id);

            // get
            let file = await storage.get(file_key)
            if (file === undefined || file === null) {
                logger.error(`picture ${file_key} could not be retrieved`)
                return res.status(400).send({ message: `file could not be retrieved` })
            }

            // get file metadata
            const metadata = await get_metadata(file);
            if (metadata === null){
                logger.error(`picture ${file_key} could not be processed`)
                return res.status(500).send({ message: `server error` })
            }

            // load image
            file = await load_image(file, 0, config.DOWNLOAD_JPEG_QUALITY);

            // log
            logger.info(`picture ${file_key} was retrieved`)

            // Change 'image/jpeg' to whatever the image type is
            res.setHeader('Content-Type', 'image/jpeg');
            return res.status(200).send(file);
        }
    )
}


const download = {
    'register': register
}

export default download;
