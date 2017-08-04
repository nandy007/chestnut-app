// 简单的roundrobin算法，实现循环调度
// 需要config必须设置rule属性为roundrobin，并且设置servers属性配置服务器地址。
// 一般用于实现负载均衡。
module.exports = function (config) {
	let servers = config.servers;
	return function (req, res, proxy) {
		const target = servers.shift();
		proxy.web(req, res, { target: target });
		servers.push(target);
	};
};