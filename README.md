# ent-comp

A light, *fast* entity-component system in Javascript.

## Overview

An [Entity Component System](http://vasir.net/blog/game-development/how-to-build-entity-component-system-in-javascript) 
(ECS) is a programming construct that solves a very common 
problem in game programming - it lets you model lots of interacting systems 
whose entities cannot easily be described with OO-style inheritance.

This library is the distilled result of my playing with a bunch of ECS libraries,
removing what wasn't useful, and rejiggering what remained to perform well in the 
most important cases. Specifically it's tuned to be fast at accessing the state of a given entity/component, 
and looping over all states for a given component. 

To get started, check the usage examples below, or the [API reference](api.md).

## Installation:

To use as a dependency:

	npm install --save-dev ent-comp

To hack on it:

```sh
git clone https://github.com/andyhall/ent-comp.git
cd ent-comp
npm install
npm test         # run tests
npm run bench    # run benchmarks
npm run doc      # rebuild API docs
```

## Basic usage:

Create the ECS, entities, and components thusly:

```js
var EntComp = require('ent-comp')
var ecs = new EntComp()

// Entities are simply integer IDs:
var playerID = ecs.createEntity() // 0
var monsterID = ecs.createEntity() // 1

// components are defined with a definition object:
ecs.createComponent({
	name: 'isPlayer'
})

// component definitions can be accessed by name
ecs.components['isPlayer']  // returns the definition object
```

Once you have some entities and components, you can add them, remove them, and check their existence:

```js
ecs.addComponent(playerID, 'isPlayer')
ecs.hasComponent(playerID, 'isPlayer') // true

ecs.removeComponent(playerID, 'isPlayer')
ecs.hasComponent(playerID, 'isPlayer') // false

// when creating an entity you can pass in an array of components to add
var id = ecs.createEntity([ 'isPlayer', 'other-component' ]) 
```

The trivial example above implements a flag-like component, that can only be set or unset.
Most real components will also need to manage some data for each entity. This is done by
giving the component a `state` object, and using the `#getState` method. 

```js
// createComponent returns the component name, for convenience
var compName = ecs.createComponent({
	name: 'location',
	state: { x:0, y:0, z:0 },
})

// give the player entity a location component
ecs.addComponent(playerID, compName)

// grab its state to update its data
var loc = ecs.getState(playerID, compName)
loc.y = 37

// you can also pass in initial state values when adding a component:
ecs.addComponent(monsterID, compName, { y: 42 })
ecs.getState(monsterID, compName).y // 42
```

When a component is added to an entity, its state object is automatically populated with 
an `__id` property denoting the entity's ID. 

```js
loc.__id // same as playerID
```

Components can also have `onAdd` and `onRemove` properties, which get called 
as any entity gains or loses the component.

```js
ecs.createComponent({
	name: 'orientation',
	state: { angle:0 },
	onAdd: function(id, state) {
		// initialize to a random direction
		state.angle = 360 * Math.random()
	},
	onRemove: function(id, state) {
		console.log('orientation removed from entity '+id)
	}
})
```

Finally, components can define `system` and/or `renderSystem` functions. 
When your game ticks or renders, call the appropriate library methods, 
and each component system function will get passed a list of state objects
for all the entities that have that component.

```js
ecs.createComponent({
	name: 'hitPoints',
	state: { hp: 100 },
	system: function(dt, states) {
		// states is an array of entity state objects
		for (var i=0; i<states.length; i++) {
			if (states[i].hp <= 0) // an entity died!
		}
	},
	renderSystem: function(dt, states) {
		for (var i=0; i<states.length; i++) {
			var id = states[i].__id
			var hp = states[i].hp
			drawTheEntityHitpoints(id, hp) 
		}
	},
})

// calling tick/render triggers the systems
ecs.tick( tick_time )
ecs.render( render_time )
```

See the [API reference](api.md) for details on each method.


## Further usage:

If you need to query certain components many times each frame, you can create 
bound accessor functions to get the existence or state of a given component.
These accessors will perform a bit faster than `getState` and `hasComponent`.

```js
var hasLocation = ecs.getComponentAccessor('location')
hasLocation(playerID) // true

var getLocation = ecs.getStateAccessor('location')
getLocation(playerID) === loc // true
```


There's also an API for getting an array of state objects for a given component.
Though if you find yourself using this, you might want to just define a system instead.

```js
var states = ecs.getStatesList('hitPoints')
// returns the same array that gets passed to system functions
```

## Caveat about complex state objects:

When you add a component to an entity, a new state object is created for that ent/comp pair. 
This new state object is a **shallow copy** of the component's default state, not a duplicate or deep clone. 
This means any non-primitive state properties will be copied by reference.

What this means to you is, state objects containing nested objects or arrays 
probably won't do what you intended. For example:

```js
ecs.createComponent({
	name: 'foo',
	state: {
		vector3: [0,0,0]
	}
})
```

If you create a bunch of new entities with that component, their state objects will all 
contain references to *the same array*. You probably want each to have its own.
The right way to achieve this is by initializing non-primitives in the `onAdd` handler:

```js
ecs.createComponent({
	name: 'foo',
	state: {
		vector3: null
	},
	onAdd: function(id, state) {
		if (!state.vector3) state.vector3 = [0,0,0]
	}
})
```

Testing for the value before overwriting means that you can pass in an initial
value when adding the component, and it will still do what you expect:

```js
ecs.addComponent(id, 'foo', { vector3: [1,1,1] })
```

## Things this library doesn't do:

 1. Assemblages. I can't for the life of me see how they add any value. 
 If I'm missing something please file an issue.
 
 2. Provide any way of querying which entities have components A and B, but not C, and so on.
 If you need this, I think maintaining your own lists will be faster 
 (and probably easier to use) than anything the library could do automatically.

----

### Author: https://github.com/andyhall

### License: MIT

