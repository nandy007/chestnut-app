const app = require("./app");

const path = require('path');


// 测试基本启动
describe('server', function () {
    this.timeout(10*60*1000);
    it('chestnut app server should success', function (done) {
        app(function(){
            done();
        });
    });
});