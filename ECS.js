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
 * 
 * 	var id = ecs.createEntity()
*/
ECS.prototype.createEntity = function() {
	return this._uid++
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
	// TODO
	
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
	if (!this.components[compName]) throw 'Component not found: ' + compName + '.'

	// TODO: remove components first

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

	// TODO: onAdd
	
	var newState = {}
	extend(newState, def.state)
	extend(newState, state)
	newState.__id = entID

	data.push(newState)
	map[entID] = data.length - 1
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

	// TODO: onRemove

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





ECS.prototype.update = function(dt) {
	// this.ecs.update(dt)
}



