'use strict';

// ----- General App -----
export const APP_NAME = 'CAI Meza';
export const APP_VERSION = '0.91';


// ----- Displayed Default Options -----
export const ALLOW_SERVER_EDIT = false;
export const DEFAULT_SERVER = 'http://localhost:8080'; // https://intelligentrecognition.go.wfp.org


// ----- Authentication -----
export const AUTH_MODEL = 'basic'; // openid or basic


// ----- Timers -----
export const CHECK_FULL_RELOAD_MS = 10000;


// ----- Image Processing -----
export const DOWNLOAD_JPEG_QUALITY = 60;
export const THUMBNAIL_WIDTH = 300;
export const IMAGE_STATUS = {
	INITIATING: null,
	CONTOUR: 7,
	SHARDING: 6,
	CUTTING: 5,
	DECODING_BUBBLE: 4,
	DECODING_NUMBER: 3,
	ANNOTATION: 2,
	DONE: 1,			// DO NOT CHANGE
	FAILED: 0			// DO NOT CHANGE
}

// ----- Pages -----
export const URL_LOGIN = '/pages/login/index.html';
export const URL_DASHBOARD = '/pages/dashboard/index.html';


// ----- Authentication Endpoints -----
export const ENDPOINT_LOGIN_USING_CRED = '/auth/meza/creds';
export const ENDPOINT_LOGIN_USING_SID = '/auth/meza/sid';
export const ENDPOINT_LOGIN_USING_OPENID_URL = '/auth/openid/web/url';
export const ENDPOINT_LOGIN_USING_OPENID_TOKEN = '/auth/openid/web/token';
export const ENDPOINT_DESTROY_SID = '/auth/meza/sid';


// ----- Data Endpoints -----
export const ENDPOINT_STATUS = '/api/status';
export const ENDPOINT_BRANCHES = '/api/branch';
export const ENDPOINT_IMAGES = '/api/image';
export const ENDPOINT_IMAGES_STATISTICS = '/api/imagestatistics';
export const ENDPOINT_TABLE_TEMPLATES = '/api/table_template';
export const ENDPOINT_PROJECT = '/api/project';
export const ENDPOINT_CELLS = '/api/cell';
export const ENDPOINT_CELLS_SEARCH = '/api/cellsearch';

export const ENDPOINT_ACCOUNT = '/api/account';
export const ENDPOINT_EXPORT = '/api/export';

export const ENDPOINT_FILE = (image_id) => `/api/files/${image_id}`;
export const ENDPOINT_FILE_CELL = (image_id, rect_id) => `/api/files/${image_id}/${rect_id}`;
export const ENDPOINT_FILE_METADATA = (image_id) => `/api/filesmetadata/${image_id}`;
export const ENDPOINT_IMAGE = (image_id) => `/api/image/${image_id}`;
export const ENDPOINT_CELL = (image_id) => `/api/cell/${image_id}`;


// ----- File Transfer Endpoints -----
export const ENDPOINT_UPLOAD_FILE = '/api/files/upload';
