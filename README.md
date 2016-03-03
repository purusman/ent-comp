# ent-comp

A light, fast, slightly opinionated entity-component system in Javascript.

## Features

Coming soon.

## Installation:

	npm install ent-comp

## To use:

	var ECS = require('ent-comp')
    
	var ecs = new ECS()
	
	// make components
	ecs.createComponent({
		name: 'hit-points',
		state: { hp: 100 },
		processor: function(dt) { /* ... */ }
	})
	
	// make an entity and give it a component
	var id = ecs.createEntity()
	ecs.addComponent(id, 'hit-points')
	
	// check its component state
	ecs.getState(id, 'hit-points').hp // 100
	
	// calling tick causes processor functions to execute
	ecs.tick( dt )
	ecs.tickRender( dt )

See the [API reference](api.md) for details.

## Component definition object:

Component definitions look like this:

	var comp = {
		name: 'any string',  // only required property
		state: {
			// default state object
		},
		onAdd: function(entID, state) {
			// called when this component is added to an entity
		},
		onRemove: function(entID, state) {
			// called when this component is removed from an entity
		},
		processor: function(dt, states) {
			// called each time ECS#tick is called.
			// "states" is the same array you'd get if you called
			//   ecs.getStatesList() on this component
		},
		renderProcessor: function(dt, states) {
			// same as above, but called each render rather than tick
		}
	} 

## For developers:

	cd ent-comp
	npm install
	npm test        # run tests
	npm run bench   # run benchmarks
	npm run doc     # rebuild API docs

### Author: Andy Hall

### License: MIT

