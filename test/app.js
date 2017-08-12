const path = require('path');

const app = require('../index');

module.exports = function (cb) {
    // 启动app
    app.start({
        port: 3001,// 必须
        rootPath: path.join(__dirname, 'server'), // 必须
        // 中间件配置，其中sessionConfig不是必须的，这里使用的是mysql做session数据存储
        // 除此之外，其他的中间件配置也可以在此设置

    });

    console.log('请在浏览器访问http://127.0.0.1:3001/index.html完成操作');

    global.callback = cb;
};