var isPromise = function(x){
	return (typeof x=='object') && (x!=null) && (typeof x.then=='function');
};
module.exports = isPromise;