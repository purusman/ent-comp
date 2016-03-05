'use strict'

var ECS = require('..')
var tape = require('tape')


tape('Creating and deleting components', function(t) {
	var comp = { name: 'foo' }
	var ecs = new ECS()

	t.throws(function() { ecs.createComponent() })
	t.throws(function() { ecs.createComponent({}) })
	t.throws(function() { ecs.deleteComponent() })
	t.throws(function() { ecs.deleteComponent('foo') })

	t.doesNotThrow(function() {
		ecs.createComponent(comp)
	}, 'createComponent')

	t.ok(ecs.components[comp.name], 'component exists')
	t.ok(ecs.comps[comp.name], 'comps alias works')

	t.throws(function() {
		ecs.deleteComponent(comp)
	}, 'cannot delete by object')

	t.doesNotThrow(function() {
		ecs.deleteComponent(comp.name)
	}, 'deleteComponent by name')

	t.notOk(ecs.comps[comp.name], 'component deleted')

	t.end()
})



tape('Adding and removing components', function(t) {
	var comp = { name: 'foo' }
	var ecs = new ECS()
	ecs.createComponent(comp)

	t.throws(function() { ecs.addComponent() })
	t.throws(function() { ecs.addComponent(37) })
	t.throws(function() { ecs.addComponent(37, 'bar') })

	var id = ecs.createEntity()
	t.doesNotThrow(function() { ecs.addComponent(id, comp.name) }, 'add component')
	t.throws(function() { ecs.addComponent(id, comp.name) }, 'add component twice')

	t.throws(function() { ecs.hasComponent(id) })
	t.throws(function() { ecs.hasComponent(id, 'bar') })
	t.ok(ecs.hasComponent(id, comp.name), 'entity has component')

	t.throws(function() { ecs.removeComponent() })
	t.throws(function() { ecs.removeComponent(id) })
	t.throws(function() { ecs.removeComponent(id, 'bar') })

	var id2 = ecs.createEntity()
	t.doesNotThrow(function() { ecs.addComponent(id2, comp.name, { foo: 1 }) }, 'add component with state')
	t.ok(ecs.hasComponent(id2, comp.name))

	t.doesNotThrow(function() { ecs.removeComponent(id, comp.name) }, 'remove component')
	t.throws(function() { ecs.removeComponent(id, comp.name) }, 'remove component twice')
	t.false(ecs.hasComponent(id, comp.name), 'entity no longer has component')
	
	var id3
	t.doesNotThrow(function() { id3 = ecs.createEntity([comp.name]) })
	t.ok(ecs.hasComponent(id3, comp.name), 'component added at entity creation')
	
	t.doesNotThrow(function() { ecs.deleteEntity(id3, true) })
	t.false(ecs.hasComponent(id3, comp.name), 'component removed when entity deleted')

	t.end()
})



tape('Component state data', function(t) {
	var comp = {
		name: 'foo',
		state: {
			num: 1,
			str: 'hoge',
			arr: [1, 2, 3],
			fcn: function() { },
			obj: {
				num: 2
			},
		}
	}
	var ecs = new ECS()
	ecs.createComponent(comp)
	var id = ecs.createEntity()
	ecs.addComponent(id, comp.name)

	t.throws(function() { ecs.getState() })
	t.throws(function() { ecs.getState(id + 37) })
	t.throws(function() { ecs.getState(id + 37, comp.name) })

	var state
	t.doesNotThrow(function() { state = ecs.getState(id, comp.name) }, 'getState')
	t.ok(state, 'state returned')
	t.equals(state.num, comp.state.num, 'state property num')
	t.equals(state.str, comp.state.str, 'state property str')
	t.equals(state.arr, comp.state.arr, 'state property arr')
	t.equals(state.fcn, comp.state.fcn, 'state property fcn')
	t.equals(state.obj.num, comp.state.obj.num, 'state deep property')
	t.equals(state.__id, id, '__id property inserted')
	state.num = 37
	t.equals(ecs.getState(id, comp.name).num, 37, 'state is remembered')
	t.equals(comp.state.num, 1, 'definition state not overwritten')

	ecs.removeComponent(id, comp.name)
	t.throws(function() { ecs.getState(id, comp.name) }, 'getState after removing component')

	// passing in initial state
	var id2 = ecs.createEntity()
	ecs.addComponent(id2, comp.name, {
		num: 4,
		newnum: 5,
		obj: {
			num: 6
		}
	})
	var state2 = ecs.getState(id2, comp.name)
	t.equals(state2.num, 4, 'overwritten property')
	t.equals(state2.newnum, 5, 'overwritten new property')
	t.equals(state2.obj.num, 6, 'overwritten deep property')

	t.end()
})



tape('Component states list', function(t) {
	var ecs = new ECS()
	t.throws(function() { ecs.getStatesList() }, 'bad getStatesList')
	t.throws(function() { ecs.getStatesList('foo') }, 'bad getStatesList')

	var comp = {
		name: 'foo',
		state: { num: 23 }
	}
	ecs.createComponent(comp)
	var arr
	t.doesNotThrow(function() { arr = ecs.getStatesList(comp.name) }, 'getStatesList without entities')
	t.ok(arr, 'getStatesList result')
	t.equals(arr.length, 0, 'getStatesList zero entities')

	var id = ecs.createEntity()
	ecs.addComponent(id, comp.name)
	t.doesNotThrow(function() { arr = ecs.getStatesList(comp.name) }, 'getStatesList with entities')
	t.ok(arr, 'getStatesList result')
	t.equals(arr.length, 1, 'getStatesList entities')
	t.equals(arr[0].num, 23, 'getStatesList state data')

	t.end()
})


