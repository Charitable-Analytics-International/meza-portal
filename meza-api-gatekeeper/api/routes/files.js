'use strict'

// config
import config from '../configs/configs.js';

// datatype lib
import { isStringNonEmpty, isNumber } from '../../../meza-libraries/gen/datatype.js';

// middleware lib
import { verifySid } from '../middlewares/sid.js';
import { verifyAccess } from '../middlewares/access.js';

// proxy lib
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

// create our proxy
const proxy = createProxyMiddleware({
    target: `${config.app.proxy.server}:${config.app.proxy.files}`,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // grab metadata attached to request
        const { _account_id, _privatekey } = req;

        // set info as header
        if (isNumber(_account_id)) proxyReq.setHeader('account-id', _account_id);
        if (isStringNonEmpty(_privatekey)) proxyReq.setHeader('private-key', _privatekey);

        // fix body
        fixRequestBody(proxyReq, req);
    }
});

function register(server, serviceLocator) {

    // PUBLIC
    server.get(
        config.ENDPOINTS.files.PUBLIC.GET,
        proxy
    )


    // PRIVATE
    server.get(
        config.ENDPOINTS.files.PRIVATE.GET,
        verifySid(serviceLocator),
        verifyAccess(serviceLocator),
        proxy
    )

    server.post(
        config.ENDPOINTS.files.PRIVATE.POST,
        verifySid(serviceLocator),
        verifyAccess(serviceLocator),
        proxy
    )
}


const api_files = {
    'register': register
}

export default api_files;
