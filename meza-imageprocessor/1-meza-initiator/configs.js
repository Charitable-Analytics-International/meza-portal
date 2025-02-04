'use strict';

// import image status
import top_config from '../config/configs.js';

const config = {
    NAME: '[Initiator]',
    OUTPATH_PREFIX: 'initiator',
    FREQUENCY: "*/15 * * * * *",	// second, minute, hour, day of the month, month, day of the week
    IMG_LIMIT: 10,
    TMP_DIRPATH: './tmp/',
    PYSCRIPT_PATH: './1-meza-initiator/python/run.py',
    status: top_config.image.status,
    IMAGE_STATUS_ON_START: top_config.image.status.INITIATING,
    IMAGE_STATUS_ON_DONE: top_config.image.status.CONTOUR
}

export default config;
