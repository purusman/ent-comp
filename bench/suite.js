'use strict';

var Benchmark = require('benchmark')
Benchmark.options.maxTime = 2
var suite = new Benchmark.Suite


/***********************************  SETUP  ************************************/

// experiment: run tests before benchmark to warm up compiler?
//
// var tests1 = require('../test/base')
// var tests2 = require('../test/components')
// var tests3 = require('../test/events')


var ECS = require('..')
var ecs = new ECS()

var comp = {
	name: 'foo',
	state: { num: 1 }
}
ecs.createComponent(comp)

var ids = []
var N = 100
for (var i = 0; i < N; i++) {
	var id = ecs.createEntity()
	if (i%2 == 0) ecs.addComponent(id, comp.name)
	ids.push(id)
}

var sum = 0
var correctSum = N/2
var name = comp.name





/***********************************  SUITES  ************************************/



suite.add('loop over hasComponent', function() {
	sum = 0
	for (var i = 0; i < ids.length; ++i) {
		if (ecs.hasComponent(ids[i], name)) sum++
	}
})

suite.add('loop via getStatesList', function() {
	sum = 0
	var list = ecs.getStatesList(name)
	for (var i = 0; i < list.length; ++i) {
		sum += list[i].num
	}
})

suite.add('loop via getState', function() {
	sum = 0
	for (var i = 0; i < ids.length; i += 2) {
		sum += ecs.getState(ids[i], name).num
	}
})

var accessor = ecs.getStateAccessor(name)
suite.add('loop via getStateAccessor', function() {
	sum = 0
	for (var i = 0; i < ids.length; i += 2) {
		sum += accessor(ids[i]).num
	}
})





/***********************************  EXECUTE  ************************************/


// add listeners and run
suite.on('cycle', function(event) {
	console.log(String(event.target))
}).on('cycle', function() {
	if (sum !== correctSum) throw 'Bad logic?'
}).on('complete', function() {
	// console.log('Fastest is ' + this.filter('fastest').map('name'))
	console.log('All suites executed without error')
}).run({ 'async': true })
