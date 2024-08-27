import path from 'path';
import {fileURLToPath} from 'url';
import nodeExternals from 'webpack-node-externals';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import Dotenv from 'dotenv-webpack';
import {EsbuildPlugin} from 'esbuild-loader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    entry: './app.ts',
    devtool: 'inline-source-map',
    experiments: {
        outputModule: true
    },
    output: {
        filename: 'bundle.cjs',
        path: path.resolve(__dirname, 'dist'),
        chunkFormat: 'module',
        module: false
    },
    resolve: {
        /* alias: {
            './subscriptionGroupManager.js': path.resolve(__dirname, 'src/selenium/subscriptionGroupManager.js')
        }, */
        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'esbuild-loader',
                options: {
                    target: 'es2015'
                }
            }
        ]
    },
    plugins: [
        new EsbuildPlugin(),
        new CopyWebpackPlugin({
            patterns: [
                {from: 'config', to: 'config'},
                {from: 'src/ui/template/mustache', to: 'src/ui/template/mustache'},
                {from: 'package.json', to: 'package.json'},
                {from: 'package-build.json', to: 'package-build.json'},
                {from: 'package-lock.json', to: 'package-lock.json'}
            ]
        })
    ],
    optimization: {
        minimize: true
    },
    externals: [nodeExternals()],
    mode: 'development',
    target: 'node'
};
