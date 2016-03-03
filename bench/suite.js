'use strict';

var Benchmark = require('benchmark')
Benchmark.options.maxTime = 2
var suite = new Benchmark.Suite


var ECS = require('..')
var ecs = new ECS()

var id

suite.add('createEntity ', function() {
	id = ecs.createEntity()
	ecs.deleteEntity()
})
suite.add('createEntity2', function() {
	id = ecs.createEntity2()
	ecs.deleteEntity2()
})


// add listeners and run
suite.on('cycle', function(event) {
	console.log(String(event.target));
}).on('complete', function() {
	console.log('Fastest is ' + this.filter('fastest').map('name'));
}).run({ 'async': true });
