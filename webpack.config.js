import path from 'path';
import {fileURLToPath} from 'url';
import nodeExternals from 'webpack-node-externals';
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
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'module',
        chunkFormat: 'module'
    },
    resolve: {
        modules: ['node_modules'],
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            /* {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            } , */
            {
                test: /\.ts$/,
                loader: 'esbuild-loader',
                options: {
                    target: 'es2020'
                }
            }
        ]
    },
    plugins: [
        new EsbuildPlugin(),
        new Dotenv({
            path: './config/server/.env'
        })
    ],
    optimization: {
        //minimize: true
    },
    externals: [nodeExternals()],
    mode: 'development',
    target: 'node'
};
