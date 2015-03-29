var basicNextTick;
if ((typeof process=='object') && (typeof process.nextTick=='function')){
	basicNextTick = process.nextTick;
} else if (typeof setImmediate=='function'){
	basicNextTick = function(fn){
		// not a direct alias for IE10 compatibility
		setImmediate(fn);
	};
} else {
	basicNextTick = function(fn){
		setTimeout(fn, 0);
	};
}
var nextTick = function(fn){
	var cancelled = false;
	var cancel = function(){
		cancelled = true;
	};
	basicNextTick(function(){
		if (!cancelled){
			fn();
		}
	});
	return cancel;
};
module.exports = nextTick;