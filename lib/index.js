var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

var Waitr = function(opts){
	var self = this;
	EventEmitter.call(self);
	self._immediateReady = Boolean(opts && opts.immediateReady);
	self._unwaits = [];
	self._last_unwaits_length = 0;
	self._delayed_onchange_timeout = null;
	self.waiting = false;
	self.ready = true;
};
util.inherits(Waitr, EventEmitter);
Waitr.prototype._onchange = function(){
	var self = this;
	if (self._delayed_onchange_timeout){
		clearTimeout(self._delayed_onchange_timeout);
		self._delayed_onchange_timeout = null;
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
	self._last_unwaits_length = self._unwaits.length;
};
Waitr.prototype._delayed_onchange = function(){
	var self = this;
	if (self._delayed_onchange_timeout){
		clearTimeout(self._delayed_onchange_timeout);
	}
	self._delayed_onchange_timeout = setTimeout(function(){
		self._onchange();
	}, 0);
};
Waitr.prototype.wait = function(){
	var self = this;
	var unwait = function(){
		self._unwaits = _.without(self._unwaits, unwait);
		if (self._immediateReady){
			self._onchange();
		} else {
			self._delayed_onchange();
		}
	};
	self._unwaits.push(unwait);
	self._onchange();
	return unwait;
};
module.exports = Waitr;