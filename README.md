# chestnut-app 快速web开发框架

chestnut-app是一个基于KOA2的快速web开发框架，要求node版本为7.X和8.X

内置了常用中间件(请求体解析、路由控制、会话控制、路由过滤器等)、多进程启动和proxy协议代理。

并且提供常用工具类，包括数据库操作、页面抓取操作、html内容抽取、编解码等

一个完整的chestnut-app必须同时引入[chestnut-router](https://github.com/nandy007/chestnut-router)、[chestnut-session](https://github.com/nandy007/chestnut-session)、[chestnut-utils](https://github.com/nandy007/chestnut-utils)模块

具体示例请参考：[https://github.com/nandy007/chestnutdemo](https://github.com/nandy007/chestnutdemo)

# 使用方法

## 基础使用方法

```javascript
// 引入path模块
const path = require('path');
// 引入chestnut-app模块，其为一个继承了Koa的实例化对象
const app = require('chestnut-app');

// 启动app
app.start({
	port : 3001,// 必须
	rootPath : path.join(__dirname), // 必须
	// 中间件配置，其中sessionConfig不是必须的，这里使用的是mysql做session数据存储
	// 除此之外，其他的中间件配置也可以在此设置
	middleware: { 
    	sessionConfig: {
      		key: 'SESSIONID',
      		storeConfig: {
    			id: 'main',
    			type: 'mysql',
    			database: 'test',
    			user: 'root',
    			password: 'root',
    			port: '3306',
    			host: 'localhost'
  			} // session存储配置，为数据库信息，如果不配置则使用默认存储;
    	}
  	}
});

```

以上代码就简单完成了app的启动。

需要注意的是，默认需要在应用根目录下创建routers文件夹、views文件夹，根目录的上一级创建static目录



## 支持的中间件

chest-app内置请求体解析中间件、静态资源加载中间件、服务端模板引擎中间件、session会话控制中间件和router路由控制中间件。

各个中间件均有默认值，可以不需要配置或者简单配置即可，也可以自定义，同时支持路由过滤器扩展。

中间件的配置位于启动配置的middleware属性，可设置的参数说明如下：

```javascript

const middleware = {
	/*带附件上传请求体解析器（multipart/form-data）
	  默认可不设置，可通过ctx.request.body和ctx.request.query取值
	  也可以设置为一个async function函数
      或者设置为false不使用，这时候需要自己去使用过滤器拦截路由处理
	*/
	multiParser : ,
	/*普通请求体解析器
	  默认可不设置，可通过ctx.request.body和ctx.request.files取值
	  也可以设置为一个async function函数
      或者设置为false不使用，这时候需要自己去使用过滤器拦截路由处理
	*/
	bodyParser : ,
	/*静态文件目录路径
	  默认可不设置，默认使用rootPath的上一级的static目录
	  也可以设置为一个目录路径
      或者设置为false不使用，这时候需要自己去添加中间件
	*/
	staticPath : ,
	/*视图文件目录路径
	  默认可不设置，默认使用koa-view中间件，且指向rootPath下的views目录
	  也可以设置为一个目录路径
      或者设置为false不使用，这时候需要自己去添加中间件
	*/
	viewPath : ,
	/*会话配置
	  默认可不设置, 默认使用koasession的memory管理会话
	  如果要使用则必须至少设置key（会话id前缀）和storeConfig（数据库存储信息）
	  或者设置为false不使用，这时候需要自己添加中间件
	*/
	sessionConfig : ,
	/*路由文件目录路径
	  默认可不设置，默认使用rootPath下的routers目录
      也可设置为一个目录路径
      或者设置为false不使用，这时候需要自己添加中间件
	*/
	routerPath : ,
	
}


```

需要注意的是，routerPath的配置需要在路由文件中使用chestnut-router模块来创建router对象，比如：

```javascript

// 返回的是koa-router对象，代表父目录为/interface，如果是根目录使用/
const router = require('chestnut-router').create('/interface');

module.exports = router
  .get('/login', async function(ctx){
		ctx.body = 'hi chestnut app';
	}); // 访问路径为http://ip:port/interface/login

```


## 支持的启动方式

方式一：单进程启动

```javascript

// 采用单进程启动app
app.start(config);

```

方式二：多进程启动

此方式实际采用的cluster模块启动app，fork的数量为cpu个数

```javascript

// 采用多进程启动app
app.startCluster(config);


```

## 支持proxy代理

内置使用http-proxy模块作为代理，目前支持两个算法：roundrobin和vhost，并支持自定义算法。

proxy默认使用cluster方式启动。

使用方法为：

```javascript

// 启动proxy代理
app.startProxy(config);

```

### roundrobin算法

仅实现简单的循环调用。需要config必须设置rule属性为roundrobin，并且设置servers属性配置服务器地址。一般用于实现负载均衡。

```javascript

app.startProxy({
	port : 3000,
	rule : 'roundrobin',
	servers : [
		{
			"host":"localhost",
			"port":"3001"
		},
		'http://localhost:3002'
	]
});

```

注：servers的每个元素包含两种写法，一种是对象{host,port}，一种是protocol://ip:port

### vhost算法

实现简单的域名映射服务。需要config必须设置rule属性为vhost，并且设置router属性配置域名映射信息。一般用于反向代理。

```javascript

app.startProxy({
	port : 80,
	rule : 'vhost',
	router : {
		"www.nandy.com": {
			"host": "localhost",
			"port": "3000"
		},
		"app1.nandy.com": {
			"host": "localhost",
			"port": "3001"
		},
		"app2.nandy.com": {
			"host": "localhost",
			"port": "3002"
		}
	}
});


```

注：router对象内的属性是域名地址，其值包含两种写法，一种是对象{host,port}，一种是protocol://ip:port

### 自定义算法

要求设置rule属性为一个函数，此函数接受一个参数，并需要return一个function函数，此函数接受三个参数分别为req、res和proxy，其中req为koa的请求体，res为koa的响应体，proxy是http-proxy的实例对象，一般可以通过req和res来做业务逻辑，最后需要使用proxy来实现代理设置。

比如：

```javascript

app.stratProxy({
	port : 8080,
	rule : function(config){
		return function(req, res, proxy){
			/*根据一些逻辑算法得出要代理的目标服务器
			  target必须符合{ip,port}或者protocol://ip:port形式
			*/
			const target = ...;
			proxy.web(req, res, { target: target });
		}
	}
});


```