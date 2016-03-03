'use strict'

var ECS = require('..')
var tape = require('tape')


tape('Instantiation', function(t) {
	var ecs

	t.doesNotThrow(function() { ecs = new ECS() }, 'instantiation')

	t.ok(ecs, 'ecs created')

	t.end()
})


tape('Entities', function(t) {
	var ecs = new ECS()
	var id1, id2

	t.doesNotThrow(function() { id1 = ecs.createEntity() }, 'createEntity')
	t.doesNotThrow(function() { id2 = ecs.createEntity() }, 'createEntity')

	t.assert(id1 != id2, 'entity ids are different')
	t.assert(id1 !== id2, 'entity ids are different')

	t.doesNotThrow(function() { ecs.deleteEntity(id1) }, 'deleteEntity')
	t.doesNotThrow(function() { ecs.deleteEntity() }, 'ok to delete non-existent entities')
	t.doesNotThrow(function() { ecs.deleteEntity(id1) }, 'ok to delete non-existent entities')
	
	t.end()
})


