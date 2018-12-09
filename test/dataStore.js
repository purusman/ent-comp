'use strict'

var DataStore = require('../src/dataStore')
var tape = require('tape')


tape('DataStore basics', function (t) {
    var data

    t.doesNotThrow(() => { data = DataStore.create() }, 'create dataStore')
    t.doesNotThrow(() => { DataStore.add(data, 1, { __id: 1 }) }, 'add to dataStore')
    t.doesNotThrow(() => { DataStore.remove(data, 1) }, 'remove from dataStore')

    var obj = {}
    DataStore.add(data, 2, obj)
    t.assert(data.hash[2] === obj)
    t.assert(data.list.indexOf(obj) > -1)

    DataStore.remove(data, 2)
    t.false(data.hash[2])
    t.assert(data.list.indexOf(obj) === -1)

    t.end()
})



tape('DataStore consistency', function (t) {
    var data = DataStore.create()
    var iterateEvery = (every, fn) => {
        for (var i = 0; i < 20; i++) if (i % every === 0) fn(i)
    }
    var objs = []
    iterateEvery(1, i => objs.push({ __id: i }))

    // add ids to data, then remove every 2nd, re-add every 4th, etc..
    iterateEvery(1, i => { DataStore.add(data, i, objs[i]) })
    iterateEvery(2, i => { DataStore.remove(data, i) })
    iterateEvery(4, i => { DataStore.add(data, i, objs[i]) })
    iterateEvery(8, i => { DataStore.remove(data, i) })
    iterateEvery(16, i => { DataStore.add(data, i, objs[i]) })

    // check results
    var hashOk = true
    var listOk = true
    iterateEvery(1, i => {
        var shouldBePresent = true
        if (i % 2 === 0) shouldBePresent = false
        if (i % 4 === 0) shouldBePresent = true
        if (i % 8 === 0) shouldBePresent = false
        if (i % 16 === 0) shouldBePresent = true
        var hashPresent = (data.hash[i] === objs[i])
        var listPresent = (data.list.indexOf(objs[i]) > -1)
        if (hashPresent !== shouldBePresent) hashOk = false
        if (listPresent !== shouldBePresent) hashOk = false
    })

    t.assert(hashOk, 'Hash consistent after adds/removals')
    t.assert(listOk, 'List consistent after adds/removals')

    t.end()
})



