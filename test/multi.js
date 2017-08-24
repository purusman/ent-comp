'use strict'

var ECS = require('..')
var tape = require('tape')


tape('Multi component basics', function (t) {
    var ecs = new ECS()
    var id = ecs.createEntity()
    var normal = { name: 'normal' }
    var multi = { name: 'multi', multi: true }
    ecs.createComponent(normal)

    t.doesNotThrow(function () { ecs.createComponent(multi) }, 'create multi component')

    t.throws(function () { ecs.createComponent({ name: 'multi' }) }, 'overlapping multi/normal comps')
    t.throws(function () { ecs.createComponent({ name: 'normal', multi: true }) }, 'overlapping multi/normal comps')

    t.doesNotThrow(function () { ecs.removeComponent(id, multi.name) }, 'remove non-present multi comp')

    t.end()
})



tape('Multi component adding / removing', function (t) {
    var ecs = new ECS()
    var id = ecs.createEntity()
    var comp = {
        name: 'multi-component',
        state: { value: 37 },
        multi: true,
    }
    ecs.createComponent(comp)

    var result
    t.doesNotThrow(function () { result = ecs.getState(id, comp.name) }, 'getState on empty multi comp')
    t.ok(!result, 'getState returned falsey')

    t.doesNotThrow(function () { ecs.addComponent(id, comp.name) }, 'add multi comp')

    t.doesNotThrow(function () { result = ecs.getState(id, comp.name) }, 'getState on multi comp')
    t.ok(result, 'getState  returned truthy')
    t.equals(result.length, 1, 'getState an array[1]')
    t.equals(result[0].value, 37, 'getState returned default state')

    t.doesNotThrow(function () { ecs.removeComponent(id, comp.name, true) }, 'remove multi comp')

    t.doesNotThrow(function () { result = ecs.getState(id, comp.name) }, 'getState on empty multi comp')
    t.ok(!result, 'getState returned falsey')

    t.doesNotThrow(function () { ecs.addComponent(id, comp.name, { value: 2 }) }, 'add multi comp with state')
    t.doesNotThrow(function () { ecs.addComponent(id, comp.name, { value: 3 }) }, 'add multi comp with state')
    t.doesNotThrow(function () { result = ecs.getState(id, comp.name) }, 'getState on multi comp length 2')
    t.equals(result.length, 2, 'getState an array[2]')
    var values = result.map(o => o.value)
    t.ok(values.includes(2), 'getState array included state.value = 2')
    t.ok(values.includes(3), 'getState array included state.value = 3')

    t.end()
})


tape('Multi component remove by index', function (t) {
    var ecs = new ECS()
    var id = ecs.createEntity()
    var comp = {
        name: 'multi-component',
        state: { value: 37 },
        multi: true,
    }
    ecs.createComponent(comp)

    ecs.addComponent(id, comp.name, { value: 1 })
    ecs.addComponent(id, comp.name, { value: 5 })
    ecs.addComponent(id, comp.name, { value: 9 })

    var states = ecs.getState(id, comp.name)
    t.equals(states.length, 3, 'multi comp states list')
    
    t.doesNotThrow(function () { ecs.removeMultiComponent(id, comp.name, 1) }, 'removeMultiComp deferred')
    t.equals(ecs.getState(id, comp.name).length, 3, 'deferred removal still pending')
    t.doesNotThrow(function () { ecs.tick() }, 'tick with deferral')
    t.equals(ecs.getState(id, comp.name).length, 2, 'deferred removal done')
    
    t.doesNotThrow(function () { ecs.removeMultiComponent(id, comp.name, 0, true) }, 'removeMultiComp immediate')
    t.equals(ecs.getState(id, comp.name).length, 1, 'immediate removal done')
    t.equals(ecs.getState(id, comp.name)[0].value, 9, 'removals were correct')

    t.end()
})



tape('Multi component systems', function (t) {
    var ecs = new ECS()
    var systemAccumulator = 0
    var renderAccumulator = 0
    var comp = {
        name: 'multi-component',
        state: { value: 0 },
        multi: true,
        system: function (dt, stateArrays) {
            systemAccumulator = 0
            for (var stateArr of stateArrays) {
                for (var state of stateArr) {
                    systemAccumulator += state.value
                }
            }
        },
        renderSystem: function (dt, stateArrays) {
            renderAccumulator = 0
            for (var stateArr of stateArrays) {
                for (var state of stateArr) {
                    renderAccumulator += state.value / 2
                }
            }
        },
    }

    var id = ecs.createEntity()
    ecs.createComponent(comp)

    ecs.addComponent(id, comp.name)
    ecs.addComponent(id, comp.name, { value: 37 })
    ecs.addComponent(id, comp.name, { value: 42 })
    ecs.addComponent(id, comp.name, { value: 17 })

    t.doesNotThrow(function () { ecs.tick(1) }, 'tick with multi comp')
    t.equals(systemAccumulator, 37 + 42 + 17, 'multi comp system works')

    t.doesNotThrow(function () { ecs.render(1) }, 'render with multi comp')
    t.equals(renderAccumulator, (37 + 42 + 17) / 2, 'multi comp renderSystem works')

    t.end()
})


