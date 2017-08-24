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
 * ```js
 * var ECS = require('ent-comp')
 * var ecs = new ECS()
 * ```
*/

function ECS() {
	// public properties:

	/** 
	 * Hash of component definitions. Also aliased to `comps`.
	 * 
	 * ```js
	 * var comp = { name: 'foo' }
	 * ecs.createComponent(comp)
	 * ecs.components['foo'] === comp // true
	 * ecs.comps['foo'] // same
	 * ```
	*/
	this.components = {}
	this.comps = this.components

	// internals:

	this._uid = 0

	// internal data store:
	//    this._data['component-name'] = {
	//        hash: {}, // hash of state objects keyed by entity ID
	//        list: [], // array of state objects in no particular order
	//        map: {},  // map of entity ID to index in list
	//    }
	this._data = {}

	// flat arrays of names of components with systems
	this._systems = []
	this._renderSystems = []

	// list of entity IDs queued for deferred deletion
	this._deferredEntityRemovals = []
	// entity/component pairs for deferred removal
	this._deferredCompRemovals = []
	// entity/component/index tuples for deferred multi-comp removal
	this._deferredMultiCompRemovals = []
}


// Internal function to ping all removal queues. 
// Called before tick/render, and also via timeouts when deferrals are made

function runAllDeferredRemovals(ecs) {
	// implementations are below, next to the relevant removal APIs
	doDeferredEntityRemovals(ecs)
	doDeferredComponentRemovals(ecs)
	doDeferredMultiComponentRemovals(ecs)
}

function makeDeferralTimeout(ecs) {
	if (deferralTimeoutPending) return
	deferralTimeoutPending = true
	setTimeout(function () {
		runAllDeferredRemovals(ecs)
		deferralTimeoutPending = false
	}, 0)
}
var deferralTimeoutPending = false







/**
 * Creates a new entity id (currently just an incrementing integer).
 * 
 * Optionally takes a list of component names to add to the entity (with default state data).
 * 
 * ```js
 * var id1 = ecs.createEntity()
 * var id2 = ecs.createEntity([ 'my-component' ])
 * ```
*/
ECS.prototype.createEntity = function (comps) {
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
 * ```js
 * ecs.deleteEntity(id)
 * ecs.deleteEntity(id2, true) // deletes immediately
 * ```
*/
ECS.prototype.deleteEntity = function (entID, immediately) {
	if (immediately) {
		deleteEntityNow(this, entID)
	} else {
		this._deferredEntityRemovals.push(entID)
		makeDeferralTimeout(this)
	}
	return this
}


// empty entity removal queue
function doDeferredEntityRemovals(ecs) {
	while (ecs._deferredEntityRemovals.length) {
		var entID = ecs._deferredEntityRemovals.pop()
		deleteEntityNow(ecs, entID)
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
		if (data.hash[entID]) ecs.removeComponent(entID, name, true)
	}
}





/**
 * Creates a new component from a definition object. 
 * The definition must have a `name` property; all others are optional.
 * 
 * Returns the component name, to make it easy to grab when the component definition is 
 * being `require`d from a module.
 * 
 * ```js
 * var comp = {
 * 	 name: 'a-unique-string',
 * 	 state: {},
 * 	 onAdd:     function(id, state){ },
 * 	 onRemove:  function(id, state){ },
 * 	 system:       function(dt, states){ },
 * 	 renderSystem: function(dt, states){ },
 * 	 multi: false,
 * }
 * var name = ecs.createComponent( comp )
 * // name == 'a-unique-string'
 * ```
*/
ECS.prototype.createComponent = function (compDefn) {
	if (!compDefn) throw 'Missing component definition'
	var name = compDefn.name
	if (!name) throw 'Component definition must have a name property.'
	if (typeof name !== 'string') throw 'Component name must be a string.'
	if (name === '') throw 'Component name must be a non-empty string.'
	if (this._data[name]) throw 'Component "' + name + '" already exists.'

	// rebuild definition object for cleanliness
	var internalDef = {}
	internalDef.name = name
	internalDef.state = compDefn.state || {}
	internalDef.onAdd = compDefn.onAdd || null
	internalDef.onRemove = compDefn.onRemove || null
	internalDef.system = compDefn.system || null
	internalDef.renderSystem = compDefn.renderSystem || null
	internalDef.multi = !!compDefn.multi

	this.components[name] = internalDef

	if (internalDef.system) this._systems.push(name)
	if (internalDef.renderSystem) this._renderSystems.push(name)

	this._data[name] = {
		list: [],
		hash: {},
		map: {},
	}

	return name
}






/**
 * Deletes the component definition with the given name. 
 * First removes the component from all entities that have it.
 * This probably shouldn't be called in real-world usage
 * (better to define all components when you begin and leave them be)
 * but it's here for the sake of completeness.
 * 
 * ```js
 * ecs.deleteComponent( comp.name )
 * ```
 */
ECS.prototype.deleteComponent = function (compName) {
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'

	var list = data.list
	while (list.length) {
		var entID = list[list.length - 1].__id
		this.removeComponent(entID, compName, true)
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
 * ```js
 * ecs.createComponent({
 * 	name: 'foo',
 * 	state: { val: 0 }
 * })
 * ecs.addComponent(id, 'foo', {val:20})
 * ecs.getState(id, 'foo').val // 20
 * ```
 */
ECS.prototype.addComponent = function (entID, compName, state) {
	var def = this.components[compName]
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'

	// if the component is pending removal, remove it so it can be readded
	var pendingRemoval = false
	this._deferredCompRemovals.forEach(function (obj) {
		if (obj.id === entID && obj.comp === compName) pendingRemoval = true
	})
	if (pendingRemoval) {
		doDeferredComponentRemovals(this)
	}

	if (data.hash[entID] && !def.multi) throw 'Entity already has component: ' + compName + '.'

	// new component state object for this entity
	var newState = {}
	newState.__id = entID
	extend(newState, def.state)
	extend(newState, state)

	if (def.multi) {
		var statesArr = data.hash[entID]
		if (!statesArr) {
			statesArr = []
			data.hash[entID] = statesArr
			data.list.push(statesArr)
			data.map[entID] = data.list.length - 1
		}
		statesArr.push(newState)
	} else {
		data.hash[entID] = newState
		data.list.push(newState)
		data.map[entID] = data.list.length - 1
	}

	if (def.onAdd) def.onAdd(entID, newState)

	return this
}



/**
 * Checks if an entity has a component.
 * 
 * ```js
 * ecs.addComponent(id, 'foo')
 * ecs.hasComponent(id, 'foo') // true
 * ```
 */

ECS.prototype.hasComponent = function (entID, compName) {
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	return (data.hash[entID] !== undefined)
}




/**
 * Removes a component from an entity, deleting any state data.
 * 
 * 
 * ```js
 * ecs.removeComponent(id, 'foo', true) // final arg means "immediately"
 * ecs.hasComponent(id, 'foo') // false
 * ecs.removeComponent(id, 'bar')
 * ecs.hasComponent(id, 'bar') // true - by default the removal is asynchronous
 * ```
 */
ECS.prototype.removeComponent = function (entID, compName, immediately) {
	var def = this.components[compName]
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'

	// if comp isn't present, fail silently for multi or throw otherwise
	if (!data.hash[entID]) {
		if (def.multi) return this
		else throw 'Entity does not have component: ' + compName + '.'
	}

	// defer or remove
	if (immediately) {
		removeComponentNow(this, entID, compName)
	} else {
		this._deferredCompRemovals.push({
			id: entID,
			comp: compName,
		})
		makeDeferralTimeout(this)
	}

	return this
}

// empty entity removal queue
function doDeferredComponentRemovals(ecs) {
	while (ecs._deferredCompRemovals.length) {
		var obj = ecs._deferredCompRemovals.pop()
		removeComponentNow(ecs, obj.id, obj.comp)
	}
}

// actual component removal
function removeComponentNow(ecs, entID, compName) {
	var def = ecs.components[compName]
	if (!def) return
	var data = ecs._data[compName]
	if (!data) return
	if (!data.hash[entID]) return // probably removed twice, e.g. due to deferral

	// call onAdd removal handler - on each instance for multi components
	if (def.onRemove) {
		if (def.multi) {
			var statesArr = data.hash[entID]
			statesArr.forEach(function (state) {
				def.onRemove(entID, state)
			})
		} else {
			def.onRemove(entID, data.hash[entID])
		}
	}

	// if multi, kill the states array to hopefully free the objects
	if (def.multi) data.hash[entID].length = 0

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
}








/**
 * Get the component state for a given entity.
 * It will automatically be populated with an `__id` property denoting the entity id.
 * 
 * ```js
 * ecs.createComponent({
 * 	name: 'foo',
 * 	state: { val: 0 }
 * })
 * ecs.addComponent(id, 'foo')
 * ecs.getState(id, 'foo').val // 0
 * ecs.getState(id, 'foo').__id // equals id
 * ```
 */

ECS.prototype.getState = function (entID, compName) {
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	return data.hash[entID]
}



/**
 * Returns a `getState`-like accessor function bound to a given component name. 
 * The accessor is much faster than `getState`, so you should create an accessor 
 * for any component whose state you'll be accessing a lot.
 * 
 * ```js
 * ecs.createComponent({
 * 	name: 'size',
 * 	state: { val: 0 }
 * })
 * ecs.addComponent(id, 'size')
 * var getSize = ecs.getStateAccessor('size')
 * getSize(id).val // 0
 * ```  
 */

ECS.prototype.getStateAccessor = function (compName) {
	if (!this._data[compName]) throw 'Unknown component: ' + compName + '.'
	var hash = this._data[compName].hash
	return function (entID) {
		return hash[entID]
	}
}



/**
 * Returns a `hasComponent`-like accessor function bound to a given component name. 
 * The accessor is much faster than `hasComponent`.
 * 
 * ```js
 * ecs.createComponent({
 * 	name: 'foo',
 * })
 * ecs.addComponent(id, 'foo')
 * var hasFoo = ecs.getComponentAccessor('foo')
 * hasFoo(id) // true
 * ```  
 */

ECS.prototype.getComponentAccessor = function (compName) {
	if (!this._data[compName]) throw 'Unknown component: ' + compName + '.'
	var hash = this._data[compName].hash
	return function (entID) {
		return (hash[entID] !== undefined)
	}
}



/**
 * Get an array of state objects for every entity with the given component. 
 * Each one will have an `__id` property for which entity it refers to.
 * 
 * ```js
 * var arr = ecs.getStatesList('foo')
 * // returns something shaped like:
 * //   [ { __id:0, stateVar:1 },
 * //     { __id:7, stateVar:6 }  ]
 * ```  
 */

ECS.prototype.getStatesList = function (compName) {
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
 * ```js
 * ecs.createComponent({
 * 	name: foo,
 * 	system: function(dt, states) {
 * 		// states is the same array you'd get from #getStatesList()
 * 		console.log(states.length)
 * 	}
 * })
 * ecs.tick(30) // triggers log statement
 * ```
 */

ECS.prototype.tick = function (dt) {
	runAllDeferredRemovals(this)
	var systems = this._systems
	for (var i = 0; i < systems.length; ++i) {
		var name = systems[i]
		var list = this._data[name].list
		var comp = this.components[name]
		comp.system(dt, list)
	}
	runAllDeferredRemovals(this)
	return this
}



/**
 * Functions exactly like `tick`, but calls `renderSystem` functions.
 * This effectively gives you a second set of systems that are 
 * called with separate timing, in case you want to 
 * [tick and render in separate loops](http://gafferongames.com/game-physics/fix-your-timestep/)
 * (and you should!).
 * 
 * ```js
 * ecs.createComponent({
 * 	name: foo,
 * 	renderSystem: function(dt, states) {
 * 		// states is the same array you'd get from #getStatesList()
 * 	}
 * })
 * ecs.render(16.666)
 * ```
 */

ECS.prototype.render = function (dt) {
	runAllDeferredRemovals(this)
	var systems = this._renderSystems
	for (var i = 0; i < systems.length; ++i) {
		var name = systems[i]
		var list = this._data[name].list
		var comp = this.components[name]
		comp.renderSystem(dt, list)
	}
	runAllDeferredRemovals(this)
	return this
}




/**
 * Removes a particular state instance of a multi-component.
 * Pass a final truthy argument to make this happen synchronously - 
 * but be careful, that will splice an element out of the multi-component array,
 * changing the indexes of subsequent elements.
 * 
 * ```js
 * ecs.getState(id, 'foo')   // [ state1, state2, state3 ]
 * ecs.removeMultiComponent(id, 'foo', 1, true)  // true means: immediately
 * ecs.getState(id, 'foo')   // [ state1, state3 ]
 * ```
 */
ECS.prototype.removeMultiComponent = function (entID, compName, index, immediately) {
	var def = this.components[compName]
	var data = this._data[compName]
	if (!data) throw 'Unknown component: ' + compName + '.'
	if (!def.multi) throw 'removeMultiComponent called on non-multi component'

	// throw if comp isn't present, or multicomp isn't present at index
	var statesArr = data.hash[entID]
	if (!statesArr || !statesArr[index]) {
		throw 'Multicomponent ' + compName + ' instance not found at index ' + index
	}

	// do removal by object, in case index changes (due to other queued removals)
	var stateToRemove = statesArr[index]

	// actual removal - deferred by default
	if (immediately) {
		removeMultiCompNow(this, entID, compName, stateToRemove)
	} else {
		this._deferredMultiCompRemovals.push({
			id: entID,
			comp: compName,
			state: stateToRemove,
		})
	}

	return this
}



function doDeferredMultiComponentRemovals(ecs) {
	while (ecs._deferredMultiCompRemovals.length) {
		var obj = ecs._deferredMultiCompRemovals.pop()
		removeMultiCompNow(ecs, obj.id, obj.comp, obj.state)
		obj.state = null
	}
}

function removeMultiCompNow(ecs, entID, compName, stateObj) {
	var def = ecs.components[compName]
	if (!def) return
	var data = ecs._data[compName]
	if (!data) return
	var statesArr = data.hash[entID]
	if (!statesArr) return
	var i = statesArr.indexOf(stateObj)
	if (i < 0) return
	if (def.onRemove) {
		if (def.onRemove) def.onRemove(entID, stateObj)
	}
	statesArr.splice(i, 1)
	// if the state list is now empty, remove the whole component
	if (statesArr.length === 0) {
		ecs.removeComponent(entID, compName, true)
	}
}






