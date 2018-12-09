

<!-- Start src/ECS.js -->

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

## components

internals:

Public API

## createEntity()

Creates a new entity id (currently just an incrementing integer).

Optionally takes a list of component names to add to the entity (with default state data).

```js
var id1 = ecs.createEntity()
var id2 = ecs.createEntity([ 'some-component', 'other-component' ])
```

## deleteEntity()

Deletes an entity, which in practice just means removing all its components.
By default the actual removal is deferred (since entities will tend to 
call this on themselves during event handlers, etc).
Pass a truthy second parameter to force immediate removal.

```js
ecs.deleteEntity(id)
ecs.deleteEntity(id2, true) // deletes immediately
```

Note that if you need to delete large numbers of entities at once,
and you know which components they have, this method will be a bit 
slower than removing the components manually.

## createComponent()

Creates a new component from a definition object. 
The definition must have a `name`; all other properties are optional.

Returns the component name, to make it easy to grab when the component
is being `require`d from a module.

```js
var comp = {
	 name: 'some-unique-string',
	 state: {},
	 onAdd:        function(id, state){ },
	 onRemove:     function(id, state){ },
	 system:       function(dt, states){ },
	 renderSystem: function(dt, states){ },
	 multi: false,
}

var name = ecs.createComponent( comp )
// name == 'a-unique-string'
```

Note the `multi` flag - for components where this is true, a given 
entity can have multiple state objects for that component.
For multi-components, APIs that would normally return a state object 
(like `getState`) will instead return an array of them.

## deleteComponent()

Deletes the component definition with the given name. 
First removes the component from all entities that have it.
This probably shouldn't be called in real-world usage
(better to define all components when you begin and leave them be)
but it's here if you need it.

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
ecs.removeComponent(id, 'foo', true) // final arg means "immediately"
ecs.hasComponent(id, 'foo') // false
ecs.removeComponent(id, 'bar')
ecs.hasComponent(id, 'bar') // true - by default the removal is asynchronous
```

## getState()

Get the component state for a given entity.
It will automatically have an `__id` property for the entity id.

```js
ecs.createComponent({
	name: 'foo',
	state: { val: 0 }
})
ecs.addComponent(id, 'foo')
ecs.getState(id, 'foo').val  // 0
ecs.getState(id, 'foo').__id // equals id
```

## getStatesList()

Get an array of state objects for every entity with the given component. 
Each one will have an `__id` property for the entity id it refers to.
Don't add or remove elements from the returned list!

```js
var arr = ecs.getStatesList('foo')
// returns something shaped like:
//   [ {__id:0, x:1}, {__id:7, x:2}  ]
```

## getStateAccessor()

Returns a `getState`-like accessor bound to a given component name. 
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

## tick()

Tells the ECS that a game tick has occurred, causing component 
`system` functions to get called.

The optional parameter simply gets passed to the system functions. 
It's meant to be a timestep, but can be used (or not used) as you like.    

```js
ecs.createComponent({
	name: foo,
	system: function(dt, states) {
		// states is the same array you'd get from #getStatesList()
		states.forEach(state => {
			console.log('Entity ID: ', state.__id)
		})
	}
})
ecs.tick(30) // triggers log statements
```

## render()

Functions exactly like `tick`, but calls `renderSystem` functions.
this effectively gives you a second set of systems that are 
called with separate timing, in case you want to 
[tick and render in separate loops](http://gafferongames.com/game-physics/fix-your-timestep/)
(which you should!).

```js
ecs.createComponent({
	name: foo,
	renderSystem: function(dt, states) {
		// states is the same array you'd get from #getStatesList()
	}
})
ecs.render(16.666)
```

## removeMultiComponent()

Removes a particular state instance of a multi-component.
Pass a final truthy argument to make this happen synchronously - 
but be careful, that will splice an element out of the multi-component array,
changing the indexes of subsequent elements.

```js
ecs.getState(id, 'foo')   // [ state1, state2, state3 ]
ecs.removeMultiComponent(id, 'foo', 1, true)  // true means: immediately
ecs.getState(id, 'foo')   // [ state1, state3 ]
```

internal implementation of various delete operations

internals for handling deferrals

<!-- End src/ECS.js -->

