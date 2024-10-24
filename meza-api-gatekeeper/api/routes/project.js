'use strict'

// config
import config from '../configs/configs.js';

// data type lib
import { isNumber } from '../../../meza-libraries/gen/datatype.js';

// middleware lib
import { verifySid } from '../middlewares/sid.js';
import { verifyAccess } from '../middlewares/access.js';

// proxy lib
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

// create our proxy
const proxy = createProxyMiddleware({
    target: `${config.app.proxy.server}:${config.app.proxy.project}`,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        // grab metadata attached to request
        const { _account_id, _access } = req;

        // set info as header
        if (isNumber(_account_id)) proxyReq.setHeader('account-id', _account_id);
        if (isNumber(_access)) proxyReq.setHeader('account-access', _access);

        // fix body
        fixRequestBody(proxyReq, req);
    }
});


function register(server, serviceLocator) {

    server.get(
        config.ENDPOINTS.project.PRIVATE.GET,
        verifySid(serviceLocator),
        verifyAccess(serviceLocator),
        proxy
    )


    server.post(
        config.ENDPOINTS.project.PRIVATE.POST,
        verifySid(serviceLocator),
        verifyAccess(serviceLocator),
        proxy
    )

    server.put(
        config.ENDPOINTS.project.PRIVATE.PUT,
        verifySid(serviceLocator),
        verifyAccess(serviceLocator),
        proxy
    )

    server.delete(
        config.ENDPOINTS.project.PRIVATE.DELETE,
        verifySid(serviceLocator),
        verifyAccess(serviceLocator),
        proxy
    )
}


const api_project = {
    'register': register
}

export default api_project;
