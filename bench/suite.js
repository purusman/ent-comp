'use strict';

var Benchmark = require('benchmark')
// Benchmark.options.maxTime = 1
var suite = new Benchmark.Suite


/***********************************  SETUP  ************************************/

var ECS = require('..')
var ecs = new ECS()

// sizes
var NUM_COMPS = 300
var NUM_ENTS = 10000
var NUM_COMPS_PER_ENT = 50


// real component
var compName = 'real'
ecs.createComponent({
	name: compName,
	state: { num: 1 }
})

// filler components
for (var i = 0; i < NUM_COMPS; i++) {
	ecs.createComponent({
		name: 'filler' + i,
		state: { a: 1, b: 2 }
	})
}


// entities
var ids = []

var correctSum = 0
var correctCount = 0


for (var j = 0; j < NUM_ENTS; j++) {
	var id = ecs.createEntity()
	// every entity gets filler comps
	var cnum = Math.floor(Math.random() * NUM_COMPS)
	for (var k = 0; k < NUM_COMPS_PER_ENT; k++) {
		var fillerName = 'filler' + ((cnum + k) % NUM_COMPS)
		ecs.addComponent(id, fillerName)
	}
	// add real component to only half of entities
	if (j & 1) continue
	// data to check
	var num = Math.floor(Math.random() * 20)
	ecs.addComponent(id, compName, { num: num })
	correctSum += num
	correctCount++
	ids.push(id)
}






/***********************************  SUITES  ************************************/

var sum = 0
var ct = 0


suite.add('hasComponent', function () {
	ct = 0
	sum = correctSum
	ids.forEach(id => { if (ecs.hasComponent(id, compName)) ct++ })
})

suite.add('getState', function () {
	ct = correctCount
	sum = 0
	ids.forEach(id => { sum += ecs.getState(id, compName).num })
})

var hasComp = ecs.getComponentAccessor(compName)
suite.add('getComponentAccessor', function () {
	ct = 0
	sum = correctSum
	ids.forEach(id => { if (hasComp(id)) ct++ })
})

suite.add('getStatesList', function () {
	ct = correctCount
	sum = 0
	ecs.getStatesList(compName).forEach(state => { sum += state.num })
})

var accessor = ecs.getStateAccessor(compName)
suite.add('getStateAccessor', function () {
	var local = accessor
	ct = correctCount
	sum = 0
	ids.forEach(id => { sum += local(id).num })
})




// add listeners

suite.on('cycle', function (event) {
	console.log(String(event.target))
}).on('cycle', function () {
	if (sum !== correctSum || ct !== correctCount) throw 'Bad logic?'
}).on('complete', function () {
	// console.log('Fastest is ' + this.filter('fastest').map('name'))
	console.log('All suites executed without error')
})




/***********************************  EXECUTE  ************************************/

function runTests() {
	if (suite.running) return
	console.log('Starting benchmark suite:')
	var opts = {
		'async': true,
	}
	suite.run(opts)
}


if (typeof window !== 'undefined') {
	// browser version
	window.run = runTests

	// hacky bug fix?
	window.define = {}
	window.define.amd = {}
} else {
	// node
	runTests()
}


