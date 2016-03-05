

<!-- Start ecs.js -->

# ent-comp API Documentation:

## ECS 
Creates a new entity-component-system manager.

	var ECS = require('ent-comp')
	var ecs = new ECS()
	
	// properties:
	ecs.components   // hash of component objects, by name
	ecs.comps        // alias of same

## components

Hash of component definitions. Also aliased to `comps`.

	var comp = { name: 'foo' }
	ecs.createComponent(comp)
	ecs.components['foo'] === comp // true
	ecs.comps['foo'] // same

## createEntity()

Creates a new entity id (currently just an incrementing integer).

Optionally takes a list of component names to add to the entity (with default state data).

	var id1 = ecs.createEntity()
	var id2 = ecs.createEntity([ 'my-component' ])

## deleteEntity()

Deletes an entity, which in practice just means removing all its components.
By default the actual removal is deferred (since entities will tend to call this 
on themselves during event handlers, etc).

The second optional parameter forces immediate removal.

	ecs.deleteEntity(id)
	ecs.deleteEntity(id2, true) // deletes immediately

## createComponent()

Creates a new component from a definition object. 
The definition must have a `name` property; all others are optional.

	var comp = {
		name: 'a-unique-string',
		state: {},
		onAdd: function(id, state){ },
		onRemove: function(id, state){ },
		processor: function(dt, states){ },
		renderProcessor: function(dt, states){ },
	}
	ecs.createComponent( comp )

## deleteComponent()

Deletes the component with the given name. 
First removes the component from all entities that have it.

	ecs.deleteComponent( comp.name )

## addComponent()

Adds a component to an entity, optionally initializing the state object.

	ecs.createComponent({
		name: 'foo',
		state: { val: 0 }
	})
	ecs.addComponent(id, 'foo', {val:20})
	ecs.getState(id, 'foo').val // 20

## hasComponent()

Checks if an entity has a component.

	ecs.addComponent(id, 'foo')
	ecs.hasComponent(id, 'foo') // true

## removeComponent()

Removes a component from an entity, deleting any state data.

	ecs.removeComponent(id, 'foo')
	ecs.hasComponent(id, 'foo') // false

## getState()

Get the component state for a given entity.
It will automatically be populated with an `__id` property denoting the entity id.

	ecs.createComponent({
		name: 'foo',
		state: { val: 0 }
	})
	ecs.addComponent(id, 'foo')
	ecs.getState(id, 'foo').val // 0
	ecs.getState(id, 'foo').__id // equals id

## getStateAccessor()

Returns a `getState`-like accessor function bound to a given component name. 
The accessor is much faster than `getState`, so you should create an accessor 
for any component whose state you'll be accessing a lot.

	ecs.createComponent({
		name: 'foo',
		state: { val: 0 }
	})
	ecs.addComponent(id, 'foo')
	var accessor = ecs.getStateAccessor('foo')
	accessor(id).val // 0

## getStatesList()

Get an array of state objects for every entity with the given component. 
Each one will have an `__id` property for which entity it refers to.

	var arr = ecs.getStatesList('foo')
	// returns something like:
	//   [ { __id:0, num:1 },
	//     { __id:7, num:6 }  ]

## tick()

Tells the ECS that a game tick has occurred, 
causing component `render` processors to fire.

	ecs.createComponent({
		name: foo,
		processor: function(dt, states) {
			// states is the same array you'd get from #getStatesList()
		}
	})
	ecs.tick(30)

## render()

Functions exactly like, but calls `renderProcessor` functions.
This gives a second set of processors, called at separate timing, for games that 
[tick and render in separate loops](http://gafferongames.com/game-physics/fix-your-timestep/).

	ecs.createComponent({
		name: foo,
		renderProcessor: function(dt, states) {
			// states is the same array you'd get from #getStatesList()
		}
	})
	ecs.render(16.666)

<!-- End ecs.js -->

