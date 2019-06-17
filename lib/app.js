const path = require('path');
const fs = require('fs');
const Koa = require('koa');
const cluster = require('./cluster');

// 中间件处理类
class Middleware {
    /**
	 * Middleware 构造函数入口
	 * @param  {KOA}         app       [KOA的实例对象]
	 * @param  {Object}      config    [配置文件]
	 */
    constructor(app, config) {
        this.app = app;

        const middleware = config.middleware || {};
        const rootPath = config.rootPath;
        const projectPath = config.projectPath || '';
        // 如果没有设置根路径则不进行中间件的绑定
        if (!fs.existsSync(rootPath)) {
            return null;
        }
        
        this.bodyParserMiddleware = null;// 缓存普通请求的处理中间件
        this.multiParserMiddleware = null;// 缓存带附件请求的处理中间件
        // 配置请求体解析中间件
        this.requestParserHandler(middleware, rootPath);
        // 配置静态资源加载中间件
        this.staticHandler(middleware.staticPath, rootPath, projectPath);
        // 配置服务端模板渲染引擎中间件
        this.viewHandler(middleware.viewPath, rootPath);
        // 配置session中间件
        this.sessionHandler(middleware.sessionConfig, rootPath);
        // 初始化路由配置
        this.routerHandler(middleware.routerPath, rootPath, projectPath);
    };

    /**
	 * 路由中间件处理函数
	 * @param  {String}      routerPath    [路由文件目录路径]
	 * @param  {String}      rootPath      [应用根目录]
     * @param  {String}      projectPath   [应用访问路径]
	 */
    routerHandler(routerPath, rootPath, projectPath) {
        // 如果设置false则不处理，自己实现中间件逻辑
        if (typeof routerPath === false) return;
        // 如果没有设置，则默认使用应用根目录下的routers目录为路由目录
        routerPath = routerPath || path.join(rootPath, './routers');
        const routerMiddleware = require('chestnut-router');
        this.app.use(routerMiddleware(routerPath, projectPath));
    };

    /**
	 * 会话中间件处理函数
	 * @param  {Obejct}      sessionConfig     [会话信息配置]
     * sessionConfig必须包含key和storeConfig两个属性配置。
     * 其中key为会话id前缀，storeConfig为会话存储数据库配置，必须符合chestnut-utils的db要求
	 */
    sessionHandler(sessionConfig) {
        // 如果sessionConfig为false则不使用此中间件处理
        if (sessionConfig === false) return;
        const sessionMiddleware = require('chestnut-session');
        this.app.use(sessionMiddleware(sessionConfig));
    };

    /**
	 * 渲染引擎中间件处理函数
	 * @param  {String}      viewPath    [视图文件目录路径]
	 * @param  {String}      rootPath    [应用根目录]
	 */
    viewHandler(viewPath, rootPath) {
        // 如果设置为false则不使用此中间件处理，自己实现
        if (typeof viewPath === false) return;
        // 如果不设置则默认使用根目录下的views目录作为视图目录
        viewPath = viewPath || path.join(rootPath, './views');
        const views = require('koa-views');
        this.app.use(views(viewPath, {
            extension: 'ejs'
        }));
    };

    /**
	 * 静态资源中间件处理函数
	 * @param  {String}      staticPath    [静态资源目录路径]
	 * @param  {String}      rootPath      [应用根目录]
     * @param  {String}      projectPath   [应用访问路径]
	 */
    staticHandler(staticPath, rootPath, projectPath) {
        // 如果设置为false则不使用此中间件处理，自己实现
        if (typeof staticPath === false) return;
        // 如果不设置则默认使用根目录的上一级目录下的static目录
        if(!staticPath){
            staticPath = path.join(rootPath, './static');
        }
        const staticPaths = staticPath instanceof Array?staticPath:[staticPath];
        const koaStatic = require('koa-static');
        staticPaths.forEach((sp) => {
            var isIn = sp.indexOf(rootPath) > -1 ? true : false;
            const staticHander = koaStatic(sp);
            this.app.use(async function(ctx, next){
                const p = ctx.path;
                if(isIn) ctx.path = p.replace(projectPath, '');
                await staticHander(ctx, async function(){
                    ctx.path = p;
                    await next();
                });
            });
        });

        
    };

    /**
	 * 请求体中间件处理函数
	 * @param  {Object}      middleware    [中间件配置]
	 * @param  {String}      rootPath      [应用根目录]
	 */
    requestParserHandler(middleware, rootPath) {
        const _this = this;
        this.app.use(async function (ctx, next) {
            const contentType = ctx.request.header['content-type'];
            let requestMiddleware;
            // 如果有设置了content-type为multipart/form-data则认为是待附件请求
            if (contentType && contentType.indexOf('multipart/form-data') > -1) {
                // 获取相应的处理中间件
                if (!_this.multiParserMiddleware) _this.multiParserMiddleware = _this.multiParserRouter(middleware.multiParser, rootPath);
                requestMiddleware = _this.multiParserMiddleware;
            } else {// 否则认为是普通请求
                // 获取相应的处理中间件
                if (!_this.bodyParserMiddleware) _this.bodyParserMiddleware = _this.bodyParserRouter(middleware.bodyParser, rootPath);
                requestMiddleware = _this.bodyParserMiddleware;
            }
            // 如果没有得到中间件则直接下一步
            if (typeof requestMiddleware !== 'function') {
                await next();
            } else {
                // 否则执行中间件
                await requestMiddleware(ctx, next);
            }
        });
    };


    /**
	 * 普通请求体中间件处理函数
	 * @param  {Any}         bodyParser    [bodyParser解析配置]
	 * @param  {String}      rootPath      [应用根目录]
     * @return {Function} 返回一个async function中间件处理函数
	 */
    bodyParserRouter(bodyParser, rootPath) {
        // 如果设置为false则不使用此中间件
        if (bodyParser === false) return null;
        const bodyParserMiddleware = typeof bodyParser==='function'? bodyParser : require('koa-bodyparser')(bodyParser||{formLimit: '20mb', enableTypes: ['json', 'form', 'text']});
        //this.app.use(bodyParserMiddleware);
        return bodyParserMiddleware;
    };

    /**
	 * 带附件请求体中间件处理函数
	 * @param  {Any}         multiParser    [multiParser解析配置]
	 * @param  {String}      rootPath       [应用根目录]
     * @return {Function} 返回一个async function中间件处理函数
	 */
    multiParserRouter(multiParser, rootPath) {
        // 如果设置为false则不使用次中间件
        if (multiParser === false) return null;
        let multiParserMiddleware;
        // 是函数则直接使用
        if (typeof multiParser === 'function') {
            multiParserMiddleware = multiParser;
        } else {
            const multer = require('koa-multer');
            const upload = multer(multiParser || { dest: path.join(rootPath, '../static/uploads/') });
            multiParserMiddleware = async function (ctx, next) {
                await upload.any()(ctx, async function () {
                    // 保持与bodyParser使用习惯一直，将ctx.req的值设置到ctx.request中
                    ctx.request.body = ctx.req.body;
                    ctx.request.files = ctx.req.files;
                    await next();
                });
            };
        }
        return multiParserMiddleware;
    };

}

// 应用能力类，继承自Koa
class App extends Koa {
    /**
	 * App 构造函数入口
     */
    constructor() {
        super(); // 调用父类Koa的constructor()
    };

    /**
	 * 初始化中间件
	 * @param  {Object}      config    [启动配置]
     * 配置文件要求如下：
       必须包含port（启动端口）
       必须包含rootPath（应用的根目录）
       必须包含一个middleware属性，其值符合如下要求：
      multiParser：
	  带附件上传请求体解析器（multipart/form-data）
	  默认可不设置，可通过ctx.request.body和ctx.request.query取值
	  也可以设置为一个async function函数
      或者设置为false不使用，这时候需要自己去使用过滤器拦截路由处理
	
      bodyParser：
	  普通请求体解析器
	  默认可不设置，可通过ctx.request.body和ctx.request.files取值
	  也可以设置为一个async function函数
      或者设置为false不使用，这时候需要自己去使用过滤器拦截路由处理
	
      staticPath：
	  静态文件目录路径
	  默认可不设置，默认使用rootPath的上一级的static目录
	  也可以设置为一个目录路径
      或者设置为false不使用，这时候需要自己去添加中间件

      viewPath：
	  视图文件目录路径
	  默认可不设置，默认使用koa-view中间件，且指向rootPath下的views目录
	  也可以设置为一个目录路径
      或者设置为false不使用，这时候需要自己去添加中间件
	
      sessionConfig
	  会话配置
	  如果要使用则必须设置，至少设置key（会话id前缀）和storeConfig（数据库存储信息）
	  如果不设置则不使用会话控制，这时候需要自己添加中间件支持

      routerPath：
	  路由文件目录路径
	  默认可不设置，默认使用rootPath下的routers目录
      也可设置为一个目录路径
      或者设置为false不使用，这时候需要自己添加中间件
	 */
    init(config){
        new Middleware(this, config);
    };

     /**
	 * 应用多进程启动函数
	 * @param  {Object}      config    [启动配置]
     * 配置参数与init函数一致
     */
    start(config) {
        this.init(config);// 初始化中间件
        cluster(this, config);
    }

    /**
	 * 应用多进程启动函数
	 * @param  {Object}      config    [启动配置]
     * 配置参数与init函数一致
     */
    startCluster(config) {
        this.init(config);// 初始化中间件
        cluster(this, config, true);
    };


    /**
	 * 应用多进程启动函数
	 * @param  {Object}      config    [启动配置]
     * 配置参数视具体的规则而定
     */
    startProxy(config) {
        const httpProxy = require('http-proxy');
        const proxy = httpProxy.createProxyServer({});
        let rule;
        // 默认规则处理
        if (typeof config.rule === 'string') {
            rule = require('./proxy/' + config.rule);
        } else if (typeof config.rule === 'function') {// 自定义规则处理
            rule = config.rule;
        }
        if (!config.rule) {
            console.log('请设置代理规则！');
            return;
        }
        const _this = this;
        cluster({
            callback: function () {
                return function (req, res) {
                    rule(config)(req, res, proxy, _this);
                };
            }
        }, config, true);
    };
}

const app = new App();


module.exports = app;
