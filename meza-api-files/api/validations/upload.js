'use strict'

import config from '../configs/configs.js'


function validator(){
    return async (req, res, next) => {
        // -------------------------------------------------------------------------------------------------
        // ------------------------------------------- pictures ----------------------------------------------
        // -------------------------------------------------------------------------------------------------

        // check for files in request
        const { files, file } = req;
        const files_attr_invalid = (files === undefined || files === null || typeof(files) !== 'object');
        const file_attr_invalid = (file === undefined || file === null || typeof(file) !== 'object');
        if (files_attr_invalid && file_attr_invalid) {
            return res.status(400).send({ message: 'files cannot be found in the request' })
        }

        // init pictures array
        let pictures = [];

        // check for pictures in request
        if (!files_attr_invalid){
            const _pictures = files.pictures;
            if (_pictures !== undefined && _pictures !== null) {
                if(Array.isArray(_pictures)){
                    _pictures.forEach(picture => { pictures.push(picture) })
                }else if(typeof(_pictures) === 'object'){
                    pictures.push(_pictures)
                }else{
                    return res.status(400).send({ message: 'pictures cannot be found in the request' })
                }
            }
        }

        // check for picture in request
        if (!file_attr_invalid){
            pictures.push(file);
        }

        // check nbr of pictures
        if (pictures.length > +config.image.UPLOAD_MAX_NBR_FILES) {
            return res.status(400).send({ message: 'pictures too many' })
        }

        // go through
        let total_size_bytes = 0.0;
        let cleaned_pictures = [];
        const image_names = []
        for (let i = 0; i < pictures.length; i++) {

            // grab name
            let { name, originalname } = pictures[i];
            if (name === undefined && originalname === undefined) {
                return res.status(400).send({ message: `image ${i} is missing a name` })
            }
            name = name === undefined ? originalname : name;

            // grab info
            const { size, mimetype } = pictures[i];
            if (size === undefined && mimetype === undefined) {
                return res.status(400).send({ message: `image ${i} is missing metadata` })
            }

            // grab data
            let { data, buffer } = pictures[i];
            if (data === undefined && buffer === undefined) {
                return res.status(400).send({ message: `image ${i} is missing data` })
            }
            data = data === undefined ? buffer : data;

            // further
            if (typeof name !== 'string' || name.length === 0) {
                return res.status(400).send({ message: `image ${i} does not have a name` })
            }

            if (!(data instanceof Buffer)) {
                return res.status(400).send({ message: `image ${i} contains invalid data` })
            }

            if (!(typeof mimetype === 'string' && mimetype.includes('image'))) {
                return res.status(400).send({ message: `image ${i} has invalid mimetype` })
            }

            if (!(typeof size === 'number' && size < +config.image.MAX_BODY_SIZE_BYTES)) {
                return res.status(400).send({ message: `image ${i} is too big (${size})` })
            }

            // accumulate size
            total_size_bytes += size

            // append name
            image_names.push(name)

            // append picture
            cleaned_pictures.push({
                name: name,
                size: size,
                mimetype: mimetype,
                data: data
            })
        }

        // check total size
        if (total_size_bytes > +config.image.MAX_BODY_SIZE_BYTES) {
            const frac = Math.round(100.0*total_size_bytes/+config.image.MAX_BODY_SIZE_BYTES);
            return res.status(400).send({ message: `pictures are too big (${frac}%)` })
        }

        // validate unique names
        if ([...new Set(image_names)].length !== image_names.length) {
            return res.status(400).send({ message: 'pictures cannot have duplicate names' })
        }

        // set total size
        req.totalSizeBytes = total_size_bytes

        // set pictures
        req.pictures = cleaned_pictures;

        return next()
    }
}

export default validator
