'use strict';

module.exports = ECS

var extend = require('util')._extend


/**
 * # ent-comp API Documentation:
 */



/**
 * @class ECS
 * 
 * Creates a new entity-component-system manager.
 * 
 * 	var ECS = require('ent-comp')
 * 	var ecs = new ECS()
*/

function ECS() {
	// public properties:
	
	/** 
	 * Hash of component definitions. Also aliased to `comps`.
	 * 
	 * 	var comp = { name: 'foo' }
	 * 	ecs.createComponent(comp)
	 * 	ecs.components['foo'] === comp // true
	 * 	ecs.comps['foo'] // same
	*/ 
	this.components = Object.create(null)
	this.comps = this.components

	// internals:
	
	this._uid = 0

	// internal data store:
	//    this._data['component-name'] = {
	//        hash: {}, // hash of state objects keyed by entity ID
	//        list: [], // array of state objects in no particular order
	//        map: {},  // map of entity ID to index in list
	//    }
	this._data = Object.create(null)

	// flat arrays of names of components with systems
	this._systems = []
	this._renderSystems = []

	// list of entity IDs queued for deferred removal
	this._deferredRemovals = []
}



/**
 * Creates a new entity id (currently just an incrementing integer).
 * 
 * Optionally takes a list of component names to add to the entity (with default state data).
 * 
 * 	var id1 = ecs.createEntity()
 * 	var id2 = ecs.createEntity([ 'my-component' ])
*/
ECS.prototype.createEntity = function(comps) {
	var id = this._uid++
	if (comps && comps.length) {
		for (var i = 0; i < comps.length; i++) {
			this.addComponent(id, comps[i])
		}
	}
	return id
}


/**
 * Deletes an entity, which in practice just means removing all its components.
 * By default the actual removal is deferred (since entities will tend to call this 
 * on themselves during event handlers, etc).
 * Pass a truthy second parameter to force immediate removal.
 * 
 * 	ecs.deleteEntity(id)
 * 	ecs.deleteEntity(id2, true) // deletes immediately
*/
ECS.prototype.deleteEntity = function(entID, immediately) {
	if (immediately) {
		deleteEntityNow(this, entID)
	} else {
		var self = this
		if (this._deferredRemovals.length === 0) {
			setTimeout(function() { doDeferredRemoval(self) }, 1)
		}
		this._deferredRemovals.push(entID)
	}
	return this
}

function doDeferredRemoval(ecs) {
	while (ecs._deferredRemovals.length) {
		deleteEntityNow(ecs, ecs._deferredRemovals.pop())
	}
}

function deleteEntityNow(ecs, entID) {
	// remove all components from the entity, by looping through known components
	// Future: consider speeding this up by keeping a hash of components held by each entity?
	// For now, for max performance user can remove entity's components instead of deleting it
	var keys = Object.keys(ecs._data)
	for (var i = 0; i < keys.length; i++) {
		var name = keys[i]
		var data = ecs._data[name]
		if (data.hash[entID]) ecs.removeComponent(entID, name)
	}
}





/**
 * Creates a new component from a definition object. 
 * The definition must have a `name` property; all others are optional.
 * 
 * 	var comp = {
 * 		name: 'a-unique-string',
 * 		state: {},
 * 		onAdd:     function(id, state){ },
 * 		onRemove:  function(id, state){ },
 * 		system:       function(dt, states){ },
 * 		renderSystem: function(dt, states){ },
 * 	}
 * 	ecs.createComponent( comp )
*/
ECS.prototype.createComponent = function(compDefn) {
	if (!compDefn) throw 'Missing component definition'
	var name = compDefn.name
	if (!name) throw 'Component definition must have a name property.'
	if (typeof name !== 'string') throw 'Component name must be a string.'
	if (name === '') throw 'Component name must be a non-empty string.'
	if (this._data[name]) throw 'Component "' + name + '" already exists.'

	if (!compDefn.state) compDefn.state = {}
	this.components[name] = compDefn

	if (compDefn.system) this._systems.push(name)
	if (compDefn.renderSystem) this._renderSystems.push(name)

	this._data[name] = {
		list: [],
		hash: Object.create(null),
		map: Object.create(null),
	}

	return this
}






/**
 * Deletes the component definition with the given name. 
 * First removes the component from all entities that have it.
 * 
 * 	ecs.deleteComponent( comp.name )
 */
ECS.prototype.deleteComponent = function(compName) {
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'

	var list = data.list
	while (list.length) {
		var entID = list[list.length - 1].__id
		this.removeComponent(entID, compName)
	}

	var i = this._systems.indexOf(compName)
	if (i > -1) this._systems.splice(i, 1)
	i = this._renderSystems.indexOf(compName)
	if (i > -1) this._renderSystems.splice(i, 1)

	delete this.components[compName]
	delete this._data[compName]
	return this
}




/**
 * Adds a component to an entity, optionally initializing the state object.
 * 
 * 	ecs.createComponent({
 * 		name: 'foo',
 * 		state: { val: 0 }
 * 	})
 * 	ecs.addComponent(id, 'foo', {val:20})
 * 	ecs.getState(id, 'foo').val // 20
 */
ECS.prototype.addComponent = function(entID, compName, state) {
	var def = this.components[compName]
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	if (data.hash[entID]) throw 'Entity already has component: ' + compName + '.'

	// new component state object for this entity
	var newState = {}
	extend(newState, def.state)
	extend(newState, state)
	newState.__id = entID

	data.hash[entID] = newState
	data.list.push(newState)
	data.map[entID] = data.length - 1

	var def = this.components[compName]
	if (def.onAdd) def.onAdd(entID, newState)

	return this
}



/**
 * Checks if an entity has a component.
 * 
 * 	ecs.addComponent(id, 'foo')
 * 	ecs.hasComponent(id, 'foo') // true
 */

ECS.prototype.hasComponent = function(entID, compName) {
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	return (data.hash[entID] !== undefined)
}




/**
 * Removes a component from an entity, deleting any state data.
 * 
 * 	ecs.removeComponent(id, 'foo')
 * 	ecs.hasComponent(id, 'foo') // false
 */
ECS.prototype.removeComponent = function(entID, compName) {
	var def = this.components[compName]
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	if (!data.hash[entID]) throw 'Entity does not have component: ' + compName + '.'

	if (def.onRemove) def.onRemove(entID, data.hash[entID])

	// removal - first quick-splice out of list, then fix hash and map
	var id = data.map[entID]
	var list = data.list
	if (id === list.length - 1) {
		list.pop()
	} else {
		list[id] = list.pop()
		var movedID = list[id].__id
		data.map[movedID] = id
	}
	delete data.hash[entID]
	delete data.map[entID]

	return this
}





/**
 * Get the component state for a given entity.
 * It will automatically be populated with an `__id` property denoting the entity id.
 * 
 * 	ecs.createComponent({
 * 		name: 'foo',
 * 		state: { val: 0 }
 * 	})
 * 	ecs.addComponent(id, 'foo')
 * 	ecs.getState(id, 'foo').val // 0
 * 	ecs.getState(id, 'foo').__id // equals id
 */

ECS.prototype.getState = function(entID, compName) {
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	return data.hash[entID]
}



/**
 * Returns a `getState`-like accessor function bound to a given component name. 
 * The accessor is much faster than `getState`, so you should create an accessor 
 * for any component whose state you'll be accessing a lot.
 * 
 * 	ecs.createComponent({
 * 		name: 'size',
 * 		state: { val: 0 }
 * 	})
 * 	ecs.addComponent(id, 'size')
 * 	var getSize = ecs.getStateAccessor('size')
 * 	getSize(id).val // 0  
 */

ECS.prototype.getStateAccessor = function(compName) {
	if (!this._data[compName]) throw 'Unknown component: ' + compName + '.'
	var hash = this._data[compName].hash
	return function(entID) {
		return hash[entID]
	}
}



/**
 * Returns a `hasComponent`-like accessor function bound to a given component name. 
 * The accessor is much faster than `hasComponent`.
 * 
 * 	ecs.createComponent({
 * 		name: 'foo',
 * 	})
 * 	ecs.addComponent(id, 'foo')
 * 	var hasFoo = ecs.getComponentAccessor('foo')
 * 	hasFoo(id) // true  
 */

ECS.prototype.getComponentAccessor = function(compName) {
	if (!this._data[compName]) throw 'Unknown component: ' + compName + '.'
	var hash = this._data[compName].hash
	return function(entID) {
		return (hash[entID] !== undefined)
	}
}	



/**
 * Get an array of state objects for every entity with the given component. 
 * Each one will have an `__id` property for which entity it refers to.
 * 
 * 	var arr = ecs.getStatesList('foo')
 * 	// returns something like:
 * 	//   [ { __id:0, stateVar:1 },
 * 	//     { __id:7, stateVar:6 }  ]  
 */

ECS.prototype.getStatesList = function(compName) {
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	return data.list
}



/**
 * Tells the ECS that a game tick has occurred, causing component `system` functions to get called.
 * 
 * The optional parameter simply gets passed to the system functions. It's meant to be a 
 * timestep, but can be used (or not used) as you like.    
 * 
 * 	ecs.createComponent({
 * 		name: foo,
 * 		system: function(dt, states) {
 * 			// states is the same array you'd get from #getStatesList()
 * 			console.log(states.length)
 * 		}
 * 	})
 * 	ecs.tick(30) // triggers log statement 
 */

ECS.prototype.tick = function(dt) {
	doDeferredRemoval(this)
	var systems = this._systems
	for (var i = 0; i < systems.length; ++i) {
		var name = systems[i]
		var sys = this.components[name].system
		var list = this._data[name].list
		if (list.length) sys(dt, list)
	}
	return this
}



/**
 * Functions exactly like `tick`, but calls `renderSystem` functions.
 * This effectively gives you a second set of systems that are 
 * called with separate timing, in case you want to  
 * [tick and render in separate loops](http://gafferongames.com/game-physics/fix-your-timestep/)
 * (and you should!).
 * 
 * 	ecs.createComponent({
 * 		name: foo,
 * 		renderSystem: function(dt, states) {
 * 			// states is the same array you'd get from #getStatesList()
 * 		}
 * 	})
 * 	ecs.render(16.666)
 */

ECS.prototype.render = function(dt) {
	doDeferredRemoval(this)
	var systems = this._renderSystems
	for (var i = 0; i < systems.length; ++i) {
		var name = systems[i]
		var sys = this.components[name].renderSystem
		var list = this._data[name].list
		if (list.length) sys(dt, list)
	}
	return this
}


