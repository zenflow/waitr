var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var nextTick = require('./nextTick');

var Waitr = function(opts){
	var self = this;
	EventEmitter.call(self);
	self._immediateReady = Boolean(opts && opts.immediateReady);
	self._unwaits = [];
	self._last_unwaits_length = 0;
	self._delayed_cancel = null;
	self.waiting = false;
	self.ready = true;
};
Waitr.prototype = _.create(EventEmitter.prototype);
Waitr.prototype._update = function(){
	var self = this;
	if (self._delayed_cancel){
		self._delayed_cancel();
		self._delayed_cancel = null;
	}
	if (self._unwaits.length && !self._last_unwaits_length){
		self.waiting = true;
		self.ready = false;
		self.emit('waiting');
	} else if (!self._unwaits.length && self._last_unwaits_length){
		self.waiting = false;
		self.ready = true;
		self.emit('ready');
	}
	if (!!self._unwaits.length != !!self._last_unwaits_length){
		self.emit('changed', !!self._unwaits.length);
	}
	self._last_unwaits_length = self._unwaits.length;
};
Waitr.prototype._delayed_update = function(){
	var self = this;
	if (self._delayed_cancel){
		self._delayed_cancel();
	}
	self._delayed_cancel = nextTick(function(){
		self._delayed_cancel = null;
		self._update();
	});
};
Waitr.prototype.wait = function(){
	var self = this;
	var unwait = function(){
		if (_.includes(self._unwaits, unwait)){
			self._unwaits = _.without(self._unwaits, unwait);
			if (self._immediateReady){
				self._update();
			} else {
				self._delayed_update();
			}
		}
	};
	self._unwaits.push(unwait);
	self._update();
	return unwait;
};
Waitr.prototype.destroy = function(){
	var self = this;
	self.removeAllListeners();
};
Waitr.prototype._wrapFn = function(fn){
	var self = this;
	return function(){
		var unwait = self.wait();
		var result = fn.apply(null, arguments);
		if (typeof result.then == 'function'){
			result.then(unwait, unwait);
		}
		return result;
	};
};
Waitr.prototype._wrapObj = function(input){
	var self = this;
	var output = {};
	_.forOwn(input, function(value, key){
		output[key] = self.wrap(value);
	});
	return output;
};
Waitr.prototype.wrap = function(input){
	var self = this;
	switch(typeof input){
		case 'function':
			return self._wrapFn(input);
		case 'object':
			return self._wrapObj(input);
		default:
			return input;
	}
};
module.exports = Waitr;