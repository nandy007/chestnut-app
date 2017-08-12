const codec = require('chestnut-utils').codec;

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
            const server = codec.aesDecipher(target, 'proxy');
            // 如果此服务器在配置的服务器数组里则继续使用
            target = servers.indexOf(server) ? server : null;
        }

        // 如果没有分配服务器信息，大多数情况应该是指首次访问时，则分配服务器
        if (!target) {
            // 取出第一个服务器分配给当前客户端，与基础roundrobin算法一致
            servers.push(target = servers.shift());
            // 并且将服务器信息加密后设置到cookie中
            res.setHeader("Set-Cookie", cookieName + '=' + codec.aesCipher(target, 'proxy'));
        }
        // 通过代理指向分配的服务器
        proxy.web(req, res, { target: target });
    };
};