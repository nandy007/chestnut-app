
const routerMiddleware = require('chestnut-router');

const router = routerMiddleware.create('/');

module.exports = router.post('login', async function(ctx, next){
    const username = ctx.request.body.username;
    if(!username){
        ctx.body = '<script>alert("请输入用户名"); history.go(-1);</script>';
        return;
    }
    ctx.session.username = username;
    ctx.body = '<script>alert("登录成功"); location.href="main";</script>';
}).get('main', async function(ctx, next){
    const username = ctx.session.username;
    ctx.body = '<body>欢迎您：'+username+'!<br/><br/><a href="index.html">重新登录</a>|<a href="over">测试结束</a></body>';
}).get('over', async function(ctx){
    ctx.body = '测试结束';
    setTimeout(function(){
        global.callback();
    }, 3*1000);
});