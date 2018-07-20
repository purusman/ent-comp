'use strict'

var path = require('path')

module.exports = {
    entry: './suite.js',
    mode: 'production',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
    },
}

