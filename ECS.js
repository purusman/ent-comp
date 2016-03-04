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
 * 	
 * 	// properties:
 * 	ecs.components   // hash of component objects, by name
 * 	ecs.comps        // alias of same
*/

function ECS() {
	// public
	this.components = {}
	this.comps = this.components

	// internals
	this._uid = 0

	/*!
	Data structure:
		ents.comps['foo'] = {
			name: 'foo',
			state: { someVar:0, ... },
			onAdd, onRemove, 
			processor, renderProcessor,
		}
		ents._componentData['foo'] = [
			{__id:17, someVar:0, ... }, 
			{__id:23, someVar:0, ... }, 
		]
		ents._componentDataMap['foo'] = { 17:0, 23:1 }
	*/

	this._componentData = {}
	this._componentDataMap = {}

	this._processors = []
	this._renderProcessors = []
}



/**
 * Creates a new entity id. Currently just returns monotonically increasing integers.
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
 * The actual removal is deferred until before the next tick, since 
 * entities will tend to call this on themselves during event handlers, etc.
 * 
 * 	ecs.deleteEntity(id)
 * 	ecs.tick() // removal happens next tick
*/
ECS.prototype.deleteEntity = function(entID) {
	
	// TODO: defer removal until next tick/render/interval
	
	var keys = Object.keys(this._componentDataMap)
	for (var i = 0; i < keys.length; i++) {
		var compName = keys[i]
		if (this._componentDataMap[compName].hasOwnProperty(entID)) {
			this.removeComponent(entID, compName)
		}
	}

}





/**
 * Creates a new component from a definition object.
 * 
 * 	var comp = {
 * 		name: 'a-unique-string'
 * 	}
 * 	ecs.createComponent( comp )
*/
ECS.prototype.createComponent = function(compDefn) {
	if (!compDefn) throw 'Missing component definition'
	if (!compDefn.name) throw 'Component definition must have a name property.'
	var name = compDefn.name
	if (this.components[name]) throw 'Component "' + name + '" already exists.'

	if (!compDefn.state) compDefn.state = {}
	this.components[name] = compDefn
	
	if (compDefn.processor) this._processors.push(name)
	if (compDefn.renderProcessor) this._renderProcessors.push(name)

	this._componentData[name] = []
	this._componentDataMap[name] = {}
	return this
}




/**
 * Deletes the component with the given name. 
 * First removes the component from all entities that have it.
 * 
 * 	ecs.deleteComponent( comp.name )
 */
ECS.prototype.deleteComponent = function(compName) {
	var data = this._componentData[compName]
	if (!data) throw 'Component not found: ' + compName + '.'

	while (data.length) {
		var id = data[data.length - 1].__id
		this.removeComponent(id, compName)
	}
	
	var i = this._processors.indexOf(compName)
	if (i>-1) this._processors.splice(i,1)
	i = this._renderProcessors.indexOf(compName)
	if (i>-1) this._renderProcessors.splice(i,1)
	
	delete this.components[compName]
	delete this._componentData[compName]
	delete this._componentDataMap[compName]
	return this
}




/**
 * Adds a component to an entity, optionally initializing the state object.
 * 
 * 	ecs.addComponent(id, 'comp-name', {val:20})  
 */
ECS.prototype.addComponent = function(entID, compName, state) {
	if (!this.components[compName]) throw 'Component not found: ' + compName + '.'
	var def = this.components[compName]
	var data = this._componentData[compName]
	var map = this._componentDataMap[compName]
	if (map.hasOwnProperty(entID)) throw 'Entity already has component: ' + compName + '.'

	var newState = {}
	extend(newState, def.state)
	extend(newState, state)
	newState.__id = entID

	data.push(newState)
	map[entID] = data.length - 1

	if (def.onAdd) {
		def.onAdd(entID, newState)
	}


	return this
}



/**
 * Checks if an entity has a component.
 * 
 * 	ecs.hasComponent(id, 'comp-name')
 * 	// returns true or false
 */

ECS.prototype.hasComponent = function(entID, compName) {
	var map = this._componentDataMap[compName]
	if (!map) throw 'Component not found: ' + compName + '.'
	return map.hasOwnProperty(entID)
}


/**
 * Removes a component from an entity, deleting any state data.
 * 
 * 	ecs.removeComponent(id, 'comp-name')  
 */
ECS.prototype.removeComponent = function(entID, compName) {
	var def = this.components[compName]
	if (!def) throw 'Component not found: ' + compName + '.'
	var data = this._componentData[compName]
	var map = this._componentDataMap[compName]
	if (!map.hasOwnProperty(entID)) throw 'Entity does not have component: ' + compName + '.'
	var id = map[entID]

	if (def.onRemove) {
		def.onRemove(entID, data[id])
	}

	if (data[id]) {
		// fast splice - pop if at end, otherwise swap to end and pop, then fix map
		if (id === data.length - 1) {
			data.pop()
		} else {
			data[id] = data.pop()
			var movedID = data[id].__id
			map[movedID] = id
		}
		delete map[entID]
	}
	return this
}





/**
 * Get the component state for a given entity.
 * It will automatically be populated with an extra `__id` property denoting the entity id.
 * 
 * 	ecs.createComponent({
 * 		name: 'foo',
 * 		state: { num: 1 }
 * 	})
 * 	ecs.addComponent(id, 'foo')
 * 	ecs.getState(id, 'foo').num = 2  
 */

ECS.prototype.getState = function(entID, compName) {
	var map = this._componentDataMap[compName]
	if (!map) throw 'Component not found: ' + compName + '.'
	if (!map.hasOwnProperty(entID)) throw 'Entity does not have component: ' + compName + '.'
	var data = this._componentData[compName]
	return data[map[entID]]
}






/**
 * Get an array of state objects for every entity with the given component. 
 * Each one will have an `__id` property for which entity it refers to.
 * 
 * 	var arr = ecs.getStatesList('foo')
 * 	// returns something like:
 * 	//   [ { __id:0, num:1 },
 * 	//     { __id:7, num:6 }  ]  
 */

ECS.prototype.getStatesList = function(compName) {
	var data = this._componentData[compName]
	if (!data) throw 'Component not found: ' + compName + '.'
	return data
}



/**
 * Tells the ECS that a game tick has occurred, 
 * causing component `render` processors to fire.
 * 
 * 	ecs.createComponent({
 * 		name: foo,
 * 		processor: function(dt, states) {
 * 			// states is an array of state objects
 * 		}
 * 	})
 * 	ecs.tick(30)
 */

ECS.prototype.tick = function(dt) {
	var procs = this._processors
	for (var i=0; i<procs.length; ++i) {
		var name = procs[i]
		var proc = this.components[name].processor
		var states = this._componentData[name]
		if (states.length) proc(dt, states)
	}
}



/**
 * Functions exactly like, but calls renderProcessor functions.
 * This gives a second set of processors, called at separate timing, 
 * for games that tick and render in separate loops.
 * 
 * 	ecs.createComponent({
 * 		name: foo,
 * 		renderProcessor: function(dt, states) {
 * 			// states is an array of state objects
 * 		}
 * 	})
 * 	ecs.render(16.666)
 */

ECS.prototype.render = function(dt) {
	var procs = this._renderProcessors
	for (var i=0; i<procs.length; ++i) {
		var name = procs[i]
		var proc = this.components[name].renderProcessor
		var states = this._componentData[name]
		if (states.length) proc(dt, states)
	}
}


