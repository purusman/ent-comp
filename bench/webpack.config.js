'use strict'

var path = require('path')

module.exports = {
    entry: './suite.js',
    mode: 'development',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build'),
    },
    module: {
        noParse: /perf/
    },
    devServer: {
        contentBase: 'build',
    },
}

