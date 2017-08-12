const http = require('http');
const https = require('https');
const cluster = require('cluster');

const os = require('os');

// 获取cpu个数
const numCPUs = os.cpus().length;

// 获取本机ip
const ip = (function getIPAdress() {
  var interfaces = os.networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
})();

/**
	* 应用多进程启动函数
	* @param  {Object}      app         [Koa实例对象]
  * @param  {Object}      config      [配置参数]
  * @param  {Object}      muti        [是否多进程启动]
  */
module.exports = function (app, config, muti) {

  if (muti && cluster.isMaster) {

    console.log("master start...");

    // 一般系统几核就fork几个
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    // 监听启动
    cluster.on('listening', function (worker, address) {
      console.log('listening: worker ' + worker.process.pid + ', Address: ' + address.address + ":" + address.port);
    });

    // 监听退出，并重新fork
    cluster.on('exit', function (worker, code, signal) {
      console.log('worker ' + worker.process.pid + ' died');
      cluster.fork(); // 当子进程被销毁则创建新的子进程
    });
  } else {
    // http方式启动服务
    if (config.port) {
      http.createServer(app.callback()).listen(config.port);
      console.log(`the server is start at port ${config.port}`);
    }

    // https方式启动服务
    if (config.sslPort) {
      const options = {
        key: config.sslKey,
        cert: config.sslCert
      };

      https.createServer(options, app.callback()).listen(config.sslPort);
      console.log(`the server is start at ssl port ${config.sslPort}`);
    }

  }
};