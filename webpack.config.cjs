/* const path = require('path');
const nodeExternals = require('webpack-node-externals'); */

import path from "path";
import { fileURLToPath } from "url";
import nodeExternals from webpack-node-externals;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    
}

module.exports = {
    entry: './app.ts',
    experiments: {
        outputModule: true
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'module'
    },
    resolve: {
        modules: ['node_modules'],
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    externals: [nodeExternals()],
    mode: 'development',
    target: 'node'
};
