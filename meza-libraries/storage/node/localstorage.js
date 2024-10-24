'use strict'

// import file system
import fs from 'fs';

class LocalStorageService {

    constructor (directory, log) {
        this.dirpath = directory;
        this.log = log;
    }

    /**
    * Builds the file key where the image will be uploaded in the S3 bucket
    */
    imageRawFileKey(image_id, image_type) {
        return `${image_id}/${image_id}.${image_type}`;
    }

    imageProcessedFileKey(image_id) {
        return `${image_id}/${image_id}.jpg`;
    }

    cellFileKey(image_id, rect_id){
        return `${image_id}/${rect_id}.jpg`;
    }


    /**
     * Builds the url where the cell file can be obtained
     */
    cellFileUrl(file_key, SERVER = ''){
        return `${SERVER}/api/filespub/${file_key.split('.')[0]}`;
    }


    /*
        Retrieves the full image path, in the S3 folder, from the image_id
    */
    async getImageRawFileKey(image_id){

        // Locate file type
        if(await this.exists(this.imageRawFileKey(image_id, 'jpg'))){
            return this.imageRawFileKey(image_id, 'jpg');

        }else if(await this.exists(this.imageRawFileKey(image_id, 'jpeg'))){
            return this.imageRawFileKey(image_id, 'jpeg');

        }else if(await this.exists(this.imageRawFileKey(image_id, 'png'))){
            return this.imageRawFileKey(image_id, '');
        }

        return null;
    }


    /*
    * Grabs a file from the local storage
    */
    async get (file_key) {

        // build path
        const path = `${this.dirpath}${file_key}`;

        // read disk
        let file = null;
        try{
            file = fs.readFileSync(path)
        }catch(err){
            this.log.error(err)
        }

        return file;
    }


    /*
    * Thin method to check if a file exists in localstorage
    */
    async exists (file_key) {

        // build path
        const path = `${this.dirpath}${file_key}`;

        let success = true;
        try{
            fs.accessSync(path, fs.constants.F_OK);
        }catch(err){
            success = false;
        }

        return success;
    }


    /*
    * Uploads a buffered file to local storage
    */
    async uploadByFile (data_buffer, file_key) {

        // check data
        if (!(data_buffer instanceof Buffer)) {
            this.log.error('Could not upload, invalid data')
            return false
        }

        // build path
        const path = `${this.dirpath}${file_key}`;

        // get parent dir of path
        const parent_dir = path.split('/').slice(0, -1).join('/');

        // make sure the parent dir exists
        if (!await this.exists(parent_dir)) {
            try {
                fs.mkdirSync(parent_dir, { recursive: true });
            } catch(err) {
                console.error(err);
                return false;
            }
        }

        // write to disk
        let success = false;
        await new Promise((resolve, reject) => {
            try{
                fs.open(path, 'w', function(err, fd) {
                    if (err) throw `error opening file: ${err}`;

                    fs.write(fd, data_buffer, 0, data_buffer.length, null, function(err) {
                        if (err) throw `error writing file: ${err}`;

                        fs.close(fd, function() {
                            success = true;
                            resolve()
                        })
                    });
                });
            }catch (err){
                this.log.error(err);
                reject(err)
            }
        })

        return success
    }
}

export default LocalStorageService;
