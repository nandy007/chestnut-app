// 简单的vhost算法，实现反向代理
// 实现简单的域名映射服务。需要config必须设置rule属性为vhost，并且设置router属性配置域名映射信息。
// 一般用于反向代理。
module.exports = function (config) {
    const router = config.router;
    return function (req, res, proxy) {
        const host = req.headers.host;
        const target = router[host];
        if (target) {
            proxy.web(req, res, { target: target });
        }
    };
};