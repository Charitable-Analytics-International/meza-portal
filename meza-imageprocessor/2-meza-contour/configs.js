'use strict';

// import image status
import top_config from '../config/configs.js';

const config = {
    NAME: '[Contour]',
    OUTPATH_PREFIX: 'contour',
    FREQUENCY: "*/15 * * * * *",	// second, minute, hour, day of the month, month, day of the week
    IMG_LIMIT: 10,
    TMP_DIRPATH: './tmp/',
    PYSCRIPT_PATH: './2-meza-contour/python/run.py',
    status: top_config.image.status,
    IMAGE_STATUS_ON_START: top_config.image.status.CONTOUR,
    IMAGE_STATUS_ON_DONE: top_config.image.status.CUTTING
}

export default config;
