'use strict';

var Benchmark = require('benchmark')
Benchmark.options.maxTime = 2
var suite = new Benchmark.Suite


var ECS = require('..')
var ecs = new ECS()

var comp = {
	name: 'foo',
	state: { num: 1 }
}
ecs.createComponent(comp)

var ids = []
var N = 100
for (var i=0; i<N; i++) {
	var id = ecs.createEntity()
	ecs.addComponent(id, comp.name)
	ids.push(id)
}

var sum = 0
var name = comp.name

suite.add('states list', function() {
	sum = 0
	var list = ecs.getStatesList(name)
	for (var i=0; i<list.length; ++i) {
		sum += list[i].num
	}
})
var accessor = ecs.getStateAccessor(name)
suite.add('getStateAccessor', function() {
	sum = 0
	for (var i=0; i<ids.length; ++i) {
		sum += accessor(ids[i]).num
	}
})
suite.add('getState', function() {
	sum = 0
	for (var i=0; i<ids.length; ++i) {
		sum += ecs.getState(ids[i], name).num
	}
})


// add listeners and run
suite.on('cycle', function(event) {
	console.log(String(event.target))
}).on('cycle', function() {
	if (sum !== N) throw 'Bad logic?'
}).on('complete', function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'))
	
}).run({ 'async': true })
