var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var nextTick = require('./nextTick');
var isPromise = require('./isPromise');

var Waitr = function(opts){
	var self = this;
	EventEmitter.call(self);
	self._immediateReady = Boolean(opts && opts.immediateReady);
	self._unwaits = [];
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
	var waiting = Boolean(self._unwaits.length);
	if (waiting != self.waiting){
		var events_to_emit = [];
		if (waiting){
			events_to_emit.push(['waiting']);
		} else {
			events_to_emit.push(['ready']);
		}
		events_to_emit.push(['changed', waiting]);
		self.ready = !waiting;
		self.waiting = waiting;
		_.forEach(events_to_emit, function(args){
			self.emit.apply(self, args);
		});
	}
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
Waitr.prototype._wrapPromise = function(promise){
	var self = this;
	var unwait = self.wait();
	promise.then(unwait, unwait);
	return promise;
};
Waitr.prototype._wrapFn = function(fn){
	var self = this;
	return function(){
		var result = fn.apply(this, arguments);
		if (isPromise(result)){
			result = self._wrapPromise(result);
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
	if (typeof input=='function'){
		return self._wrapFn(input);
	} else if (isPromise(input)){
		return self._wrapPromise(input);
	} else if ((typeof input=='object')&&(input!=null)){
		return self._wrapObj(input);
	} else {
		return input;
	}
};
module.exports = Waitr;