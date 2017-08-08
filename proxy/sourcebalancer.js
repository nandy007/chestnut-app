const crypto = require('crypto');

const encode = function (str) {
    const cipher = crypto.createCipher('aes-128-ecb', 'roundrobin');
    return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
};

const decode = function (str) {
    const decipher = crypto.createDecipher('aes-128-ecb', 'roundrobin');
    return decipher.update(str, 'hex', 'utf8') + decipher.final('utf8');
};

const getClientIp = function (req) {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
};

const cookies = function (req) {
    let Cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function (Cookie) {
        let parts = Cookie.split('=');
        Cookies[parts[0].trim()] = (parts[1] || '').trim();
    });
    return Cookies;
};

module.exports = function (config) {
    let servers = config.servers;
    return function (req, res, proxy) {
        // 定义特殊请求头
        const cookieName = 'X-CHESTNUT-PROXY-SOURCEBALANCER';

        // 获取特殊头信息，此头信息记录当前客户端首次请求分配的服务器
        let target = cookies(req)[cookieName];

        if (target) {
            // 如果有头信息则解码内部的服务器信息
            const server = decode(target);
            // 如果此服务器在配置的服务器数组里则继续使用
            target = options.servers.indexOf(server) ? server : null;
        }

        // 如果没有分配服务器信息，大多数情况应该是指首次访问时，则分配服务器
        if (!target) {
            // 取出第一个服务器分配给当前客户端，与基础roundrobin算法一致
            options.servers.push(target = options.servers.shift());
            // 并且将服务器信息加密后设置到cookie中
            res.setHeader("Set-Cookie", cookieName + '=' + encode(target));
        }
        // 通过代理指向分配的服务器
        proxy.web(req, res, { target: target });
    };
};


module.exports = {
    "port": "3000",
    "rule": function (options) {

    },
    servers: [
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002'
    ]
};