var test = require('tape');
var _ = require('lodash');
var async = require('async');
var Waitr = require('../lib');

test('emits right events and has right state at right times', function(t){
	var reps = 8;
	t.plan(reps * 7);
	var w = new Waitr;
	async.eachSeries(_.range(reps), function(i, cb){
		// 1
		t.ok(w.ready && !w.waiting);

		// 2
		var end = gatherEvents(w, ['waiting', 'ready']);
		var unwaits = _.map(_.range(random(1, 8)), function(j){
			return w.wait();
		});
		var events = end();
		t.deepEqual(events, ['waiting']);

		// 3
		t.ok(w.waiting && !w.ready);

		// 4
		end = gatherEvents(w, ['waiting', 'ready']);
		_.forEach(_.shuffle(unwaits), function(unwait){
			unwait();
		});
		events = end();
		t.deepEqual(events, []);

		// 5
		t.ok(w.waiting && !w.ready);

		// 6
		end = gatherEvents(w, ['waiting', 'ready']);
		setTimeout(function(){
			events = end();
			t.deepEqual(events, ['ready']);

		// 7
			t.ok(w.ready && !w.waiting);

			cb(null);
		}, 0);
	});
});

function random(from, to){
	return from + Math.floor((to - from + 1) * Math.random())
}

function gatherEvents(obj, possible){
	var event_listeners = {};
	var gathered = [];
	_.forEach(possible, function(event_name){
		obj.on(event_name, event_listeners[event_name] = function(){
			gathered.push(event_name);
		});
	});
	return function(){
		_.forEach(possible, function(event_name){
			obj.removeListener(event_name, event_listeners[event_name]);
		});
		return gathered;
	}
}