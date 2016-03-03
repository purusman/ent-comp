

<!-- Start ecs.js -->

# ent-comp API Documentation:

## ECS 
Creates a new entity-component-system manager.

	var ECS = require('ent-comp')
	var ecs = new ECS()
	
	// properties:
	ecs.components   // hash of component objects, by name
	ecs.comps        // alias of same

## createEntity()

Creates a new entity id. Currently just returns monotonically increasing integers.

	var id = ecs.createEntity()

## deleteEntity()

Deletes an entity, which in practice just means removing all its components.
The actual removal is deferred until before the next tick, since 
entities will tend to call this on themselves during event handlers, etc.

	ecs.deleteEntity(id)
	ecs.tick() // removal happens next tick

## createComponent()

Creates a new component from a definition object.

	var comp = {
		name: 'a-unique-string'
	}
	ecs.createComponent( comp )

## deleteComponent()

Deletes the component with the given name. 
First removes the component from all entities that have it.

	ecs.deleteComponent( comp.name )

## addComponent()

Adds a component to an entity, optionally initializing the state object.

	ecs.addComponent(id, 'comp-name', {val:20})

## hasComponent()

Checks if an entity has a component.

	ecs.hasComponent(id, 'comp-name')
	// returns true or false

## removeComponent()

Removes a component from an entity, deleting any state data.

	ecs.removeComponent(id, 'comp-name')

## getState()

Get the component state for a given entity.
It will automatically be populated with an extra `__id` property denoting the entity id.

	ecs.createComponent({
		name: 'foo',
		state: { num: 1 }
	})
	ecs.addComponent(id, 'foo')
	ecs.getState(id, 'foo').num = 2

## getStatesList()

Get an array of state objects for every entity with the given component. 
Each one will have an `__id` property for which entity it refers to.

	var arr = ecs.getStatesList('foo')
	// returns something like:
	//   [ { __id:0, num:1 },
	//     { __id:7, num:6 }  ]

<!-- End ecs.js -->

