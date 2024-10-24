'use strict'

// config
import config from '../configs/configs.js';

// middleware lib
import { verifySid } from '../middlewares/sid.js';

// data type lib
import { isNumber, isStringNonEmpty } from '../../../meza-libraries/gen/datatype.js';

// proxy lib
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

// create our proxy
const proxy = createProxyMiddleware({
    target: `${config.app.proxy.server}:${config.app.proxy.authentication}`,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // grab metadata attached to request
        const { _account_id, _access, _email } = req;

        // set info as header
        if (isNumber(_account_id)) proxyReq.setHeader('account-id', _account_id);
        if (isNumber(_access)) proxyReq.setHeader('account-access', _access);
        if (isStringNonEmpty(_email)) proxyReq.setHeader('account-email', _email);

        // fix body
        fixRequestBody(proxyReq, req);
    }
});


function register(server, serviceLocator) {

    server.post(
        config.ENDPOINTS.authentication.PUBLIC.POST,
        proxy
    )

    server.post(
        config.ENDPOINTS.authentication.PRIVATE.POST,
        verifySid(serviceLocator),
        proxy
    )

    server.get(
        config.ENDPOINTS.authentication.PRIVATE.GET,
        verifySid(serviceLocator),
        proxy
    )

    server.delete(
        config.ENDPOINTS.authentication.PRIVATE.DELETE,
        verifySid(serviceLocator),
        proxy
    )
}


const api_authenticatio  = {
    'register': register
}

export default api_authenticatio;
