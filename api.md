

<!-- Start ecs.js -->

# ent-comp API Documentation:

## ECS 
Creates a new entity-component-system manager.

```js
var ECS = require('ent-comp')
var ecs = new ECS()
```

## components

Hash of component definitions. Also aliased to `comps`.

```js
var comp = { name: 'foo' }
ecs.createComponent(comp)
ecs.components['foo'] === comp // true
ecs.comps['foo'] // same
```

## createEntity()

Creates a new entity id (currently just an incrementing integer).

Optionally takes a list of component names to add to the entity (with default state data).

```js
var id1 = ecs.createEntity()
var id2 = ecs.createEntity([ 'my-component' ])
```

## deleteEntity()

Deletes an entity, which in practice just means removing all its components.
By default the actual removal is deferred (since entities will tend to call this 
on themselves during event handlers, etc).
Pass a truthy second parameter to force immediate removal.

```js
ecs.deleteEntity(id)
ecs.deleteEntity(id2, true) // deletes immediately
```

## createComponent()

Creates a new component from a definition object. 
The definition must have a `name` property; all others are optional.

Returns the component name, to make it easy to grab when the component definition is 
being `require`d from a module.

```js
var comp = {
	name: 'a-unique-string',
	state: {},
	onAdd:     function(id, state){ },
	onRemove:  function(id, state){ },
	system:       function(dt, states){ },
	renderSystem: function(dt, states){ },
}
var name = ecs.createComponent( comp )
// name == 'a-unique-string'
```

## deleteComponent()

Deletes the component definition with the given name. 
First removes the component from all entities that have it.

```js
ecs.deleteComponent( comp.name )
```

## addComponent()

Adds a component to an entity, optionally initializing the state object.

```js
ecs.createComponent({
	name: 'foo',
	state: { val: 0 }
})
ecs.addComponent(id, 'foo', {val:20})
ecs.getState(id, 'foo').val // 20
```

## hasComponent()

Checks if an entity has a component.

```js
ecs.addComponent(id, 'foo')
ecs.hasComponent(id, 'foo') // true
```

## removeComponent()

Removes a component from an entity, deleting any state data.

```js
ecs.removeComponent(id, 'foo')
ecs.hasComponent(id, 'foo') // false
```

## getState()

Get the component state for a given entity.
It will automatically be populated with an `__id` property denoting the entity id.

```js
ecs.createComponent({
	name: 'foo',
	state: { val: 0 }
})
ecs.addComponent(id, 'foo')
ecs.getState(id, 'foo').val // 0
ecs.getState(id, 'foo').__id // equals id
```

## getStateAccessor()

Returns a `getState`-like accessor function bound to a given component name. 
The accessor is much faster than `getState`, so you should create an accessor 
for any component whose state you'll be accessing a lot.

```js
ecs.createComponent({
	name: 'size',
	state: { val: 0 }
})
ecs.addComponent(id, 'size')
var getSize = ecs.getStateAccessor('size')
getSize(id).val // 0
```

## getComponentAccessor()

Returns a `hasComponent`-like accessor function bound to a given component name. 
The accessor is much faster than `hasComponent`.

```js
ecs.createComponent({
	name: 'foo',
})
ecs.addComponent(id, 'foo')
var hasFoo = ecs.getComponentAccessor('foo')
hasFoo(id) // true
```

## getStatesList()

Get an array of state objects for every entity with the given component. 
Each one will have an `__id` property for which entity it refers to.

```js
var arr = ecs.getStatesList('foo')
// returns something shaped like:
//   [ { __id:0, stateVar:1 },
//     { __id:7, stateVar:6 }  ]
```

## tick()

Tells the ECS that a game tick has occurred, causing component `system` functions to get called.

The optional parameter simply gets passed to the system functions. It's meant to be a 
timestep, but can be used (or not used) as you like.    

```js
ecs.createComponent({
	name: foo,
	system: function(dt, states) {
		// states is the same array you'd get from #getStatesList()
		console.log(states.length)
	}
})
ecs.tick(30) // triggers log statement
```

## render()

Functions exactly like `tick`, but calls `renderSystem` functions.
This effectively gives you a second set of systems that are 
called with separate timing, in case you want to 
[tick and render in separate loops](http://gafferongames.com/game-physics/fix-your-timestep/)
(and you should!).

```js
ecs.createComponent({
	name: foo,
	renderSystem: function(dt, states) {
		// states is the same array you'd get from #getStatesList()
	}
})
ecs.render(16.666)
```

<!-- End ecs.js -->

