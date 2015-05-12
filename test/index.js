var test = require('tape');
var _ = require('lodash');
var Waitr = require('../lib');

var events = ['waiting', 'ready'];

test('emits "waiting" once "waiting", and "ready" once "ready"+nextTick', function(t){
	t.plan(7);
	var w = new Waitr;

// 1
	t.ok(w.ready && !w.waiting, '1');

	var end = gatherEvents(w, events);
	var unwaits = _.map(_.range(_.random(1, 8)), function(j){
		return w.wait();
	});
	var gathered = end();
// 2
	t.deepEqual(gathered, ['waiting'], '2');

// 3
	t.ok(w.waiting && !w.ready, '3');

	end = gatherEvents(w, events);
	_.forEach(_.shuffle(unwaits), function(unwait){
		unwait();
	});
	gathered = end();
// 4
	t.deepEqual(gathered, [], '4');

// 5
	t.ok(w.waiting && !w.ready, '5');

	end = gatherEvents(w, events);
	process.nextTick(function(){
		gathered = end();
// 6
		t.deepEqual(gathered, ['ready'], '6');

// 7
		t.ok(w.ready && !w.waiting, '7');

// teardown
		w.destroy();
	});
});

test('properly wrap api object', function(t){
	var iterations = 2;
	var plan_per_iteration = 8;
	var good_result = 'good result';
	var good_error = new Error('fake');
	t.plan(iterations * plan_per_iteration);
	var w = new Waitr;
	var api = w.wrap({
		fail: function(){
			return new Promise(function(resolve, reject){
				setTimeout(function(){
					reject(good_error);
				}, _.random(1, 100));
			});
		},
		succeed: function(){
			return new Promise(function(resolve, reject){
				setTimeout(function(){
					resolve(good_result);
				}, _.random(1, 100));
			});
		}
	});

	eachSeries(_.range(iterations), function(i, cb){

// 1
		t.ok(w.ready && !w.waiting, '1');

		var end = gatherEvents(w, events);
		var promise = api[i%2 ? 'fail' : 'succeed']();
		var gathered = end();
// 2
		t.deepEqual(gathered, ['waiting'], '2');

// 3
		t.ok(w.waiting && !w.ready, '3');

		if (i%2){
			promise.catch(function(error){
// 4a
				t.equal(error, good_error, '4a');
			});
		} else {
			promise.then(function(result) {
// 4b
				t.equal(result, good_result, '4b')
			});
		}

		end = gatherEvents(w, events);
		var always = function(){
			gathered = end();
// 5
			t.deepEqual(gathered, [], '5');

// 6
			t.ok(w.waiting && !w.ready, '6');

			end = gatherEvents(w, events);
			process.nextTick(function(){
				gathered = end();
// 7
				t.deepEqual(gathered, ['ready'], '7');

// 8
				t.ok(w.ready && !w.waiting, '8');

				cb(null)
			});
		};
		promise.then(always, always);

	}, function(error){
		if (error){throw error;}
		w.destroy();
	});

});

test('immediateReady: false (default)', function(t){
	t.plan(1);
	var order = [];
	var report = function(n){
		order.push(n);
		if (order.length == 3){
			t.deepEqual(order, [1, 2, 3]);
		}
	};
	var w = new Waitr;
	w.once('ready', function(){
		report(2);
	});
	var unwait = w.wait();
	process.nextTick(function(){
		report(1);
	});
	unwait();
	process.nextTick(function(){
		report(3);
	});
});

test('immediateReady: true', function(t){
	t.plan(1);
	var order = [];
	var report = function(n){
		order.push(n);
		if (order.length == 3){
			t.deepEqual(order, [1, 2, 3]);
		}
	};
	var w = new Waitr({immediateReady: true});
	w.once('ready', function(){
		report(1);
	});
	var unwait = w.wait();
	process.nextTick(function(){
		report(2);
	});
	unwait();
	process.nextTick(function(){
		report(3);
	});
});

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

function eachSeries(array, iterator, cb) {
	var i = 0;
	var loop = function(){
		if (i==array.length){
			if (typeof cb=='function'){
				cb(null);
			}
			return;
		}
		iterator(array[i], function(error){
			if (error){
				if (typeof cb=='function'){
					cb(error);
				}
				return;
			}
			i++;
			loop();
		})
	};
	loop();
}