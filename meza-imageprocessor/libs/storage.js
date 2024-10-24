'use strict';

// import filesystem lib
import { fileExists, fileWrite, fileReadAsBuffer, fileDelete, mkdir } from "../../meza-libraries/storage/node/filesystem.js";


export async function download_file_from_remote_storage(storage, remote_file_key, local_path){

    // create the destination paths
    const parent_dir = local_path.split('/').slice(0, -1).join('/');

    // create parent directory
    if (!mkdir(parent_dir)) return false;

    // check if the file is already there
    if (fileExists(local_path)) return true;

    // init
    let filedata = null;

    // attempt to download from remote storage
    try {
        filedata = await storage.get(remote_file_key);
    } catch(err) {
        console.error(err);
    }

    // if download was unsuccessful
    if (filedata === undefined || filedata === null) return false;

    // write data to disk
    if (!fileWrite(local_path, filedata)) return false;

    // make sure it now exists
    if (!fileExists(local_path)) return false;

    return true;
}


export async function upload_file_to_remote_storage(storage, local_path, remote_file_key){

    // make sure file exists
    if (!fileExists(local_path)) return false;

    // read file
    const buff = fileReadAsBuffer(local_path);
    
    // if failed
    if (buff === null) return false;

    // upload to storage
    const success = await storage.uploadByFile(buff, remote_file_key);

    // stop here
    if (!success) return false;

    return true;
}


export async function delete_image_in_local_storage(workdir, image_id){

    // delete main image
    if (fileExists(`${workdir}${image_id}.jpg`)) fileDelete(`${workdir}${image_id}.jpg`);
    if (fileExists(`${workdir}${image_id}.jpeg`)) fileDelete(`${workdir}${image_id}.jpeg`);
    if (fileExists(`${workdir}${image_id}.png`)) fileDelete(`${workdir}${image_id}.png`);

    // delete dir
    if (fileExists(`${workdir}${image_id}`)) fileDelete(`${workdir}${image_id}.png`, { recursive: true, force: true });    
}
