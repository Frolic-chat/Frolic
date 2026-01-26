const path = require('path');
const fs = require('fs');
const ForkTsCheckerWebpackPlugin = require('@f-list/fork-ts-checker-webpack-plugin');
const OptimizeCssAssetsPlugin = require('css-minimizer-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const vueTransformer = require('@frolic/vue-ts/transform').default;
const CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const mainConfig = {
    entry: [
        path.join(__dirname, 'main.ts'),
        path.join(__dirname, 'package.json'),
        path.join(__dirname, 'build', 'tray@2x.png'),
        path.join(__dirname, 'build', 'tray-badge@2x.png'),
    ],
    output: {
        path: path.join(__dirname, 'app'),
        filename: 'main.js'
    },
    context: __dirname,
    target: 'electron-main',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: path.join(__dirname, 'tsconfig-main.json'),
                    transpileOnly: true,
                },
            },
            {
                test: path.join(__dirname, 'package.json'),
                type: 'asset/resource',
                generator: { filename: '[base]' },
            },
            {
                test: /\.html$/,
                type: 'asset/resource',
                generator: { filename: '[base]' },
            },
            {
                test: /\.raw\.js$/,
                loader: 'raw-loader',
            },
            {
                test: /(badge|icon|tray)?(@2x)?\.(png|ico)$/,
                type: 'asset/resource',
                generator: { filename: 'system/[base]' },
            },
        ]
    },
    node: {
        __dirname: false,
        __filename: false
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            async: false,
            tslint: path.join(__dirname, '..', 'tslint.json'),
            tsconfig: './tsconfig-main.json',
            ignoreLintWarnings: true,
        })
    ],
    resolve: {
        extensions: ['.ts', '.js']
    },
    optimization: {
        //minimize: true,
        moduleIds: 'named',
        chunkIds: 'named',
    },
};

const rendererConfig = {
    entry: {
        chat: [
            path.join(__dirname, 'chat.ts'),
            path.join(__dirname, 'index.html'),
        ],
        window: [
            path.join(__dirname, 'window.ts'),
            path.join(__dirname, 'window.html'),
        ],
    },
    output: {
        path: __dirname + '/app',
        publicPath: './',
        filename: '[name].js'
    },
    context: __dirname,
    target: 'electron-renderer',
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                    compilerOptions: {
                        preserveWhitespace: false
                    }
                }
            },
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    appendTsSuffixTo: [/\.vue$/],
                    configFile: path.join(__dirname, 'tsconfig-renderer.json'),
                    transpileOnly: true,
                    getCustomTransformers: () => ({before: [vueTransformer]})
                }
            },
            //{test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader'},
            {
                test: /\.woff2?$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'assets/fonts',
                    name: '[name].[ext]',
                },
            },
            // {
            //     test: /\.woff2?$/,
            //     type: 'asset/resource',
            //     generator: { filename: 'assets/fonts/[base]' },
            // },
            {
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'assets/fonts',
                    name: '[name].[ext]',
                },
            },
            // {
            //     test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
            //     type: 'asset/resource',
            //     generator: { filename: 'assets/fonts/[base]' },
            // },
            {
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                type: 'asset/resource',
                generator: { filename: 'assets/[base]' },
            },
            {
                test: /\.mp3$/,
                type: 'asset/resource',
                generator: { filename: 'assets/sounds/[base]' },
            },
            {
                test: /blossom\.png$/,
                loader: 'file-loader',
                options: {
                    outputPath: 'system',
                    name: '[name].[ext]'
                },
            },
            // {
            //     test: /(ic_notification|tray(@2x)?)\.(png|ico)$/,
            //     type: 'asset/resource',
            //     generator: { filename: 'system/[base]' },
            // },
            {
                test: /\.html$/,
                loader: 'file-loader',
                options: { name: '[name].[ext]' }
            },
            // {
            //     test: /\.html$/,
            //     type: 'asset/resource',
            //     generator: { filename: '[base]' },
            // },
            {
                test: /\.vue\.scss/,
                // loader: ['vue-style-loader', {loader: 'css-loader', options: {esModule: false}},'sass-loader']
                use: [
                    'vue-style-loader',
                    {loader: 'css-loader', options: {esModule: false}},
                    {
                        loader: 'sass-loader',
                        options: {
                            warnRuleAsWarning: false,
                            sassOptions: {
                                quietDeps: true
                            }
                        }
                    }
                ]
            },
            {
                test: /\.vue\.css/,
                // loader: ['vue-style-loader', {loader: 'css-loader', options: {esModule: false}}]
                use: [
                    'vue-style-loader',
                    {loader: 'css-loader', options: {esModule: false}}
                ]
            },
            {test: /\.raw\.js$/, loader: 'raw-loader'},
        ]
    },
    node: {
        __dirname: false,
        __filename: false
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            async: false,
            tslint: path.join(__dirname, '../tslint.json'),
            tsconfig: './tsconfig-renderer.json',
            vue: true,
            ignoreLintWarnings: true,
        }),
        new VueLoaderPlugin(),
        new CopyPlugin(
            {
                patterns: [
                    {
                        from: path.resolve(__dirname, '..', 'chat', 'preview', 'assets', '**', '*').replace(/\\/g, '/'),
                        to: path.join('assets', 'preview'),
                        context: path.resolve(__dirname, '..', 'chat', 'preview', 'assets')
                    },
                    {
                        from: path.resolve(__dirname, '..', 'assets', '**', '*').replace(/\\/g, '/'),
                        to: path.join('assets'),
                        context: path.resolve(__dirname, '..', 'assets')
                    }
                ]
            }
        )
    ],
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.css'],
        // alias: {qs: 'querystring'}
    },
    optimization: {
        splitChunks: {chunks: 'all', minChunks: 2, name: 'common'},
        //minimize: true,
        moduleIds: 'named',
        chunkIds: 'named',
    }
};

const storeWorkerEndpointConfig = {
    entry: [path.join(__dirname, '..', 'learn', 'store', 'worker', 'store.worker.endpoint.ts')],
    output: {
        path: path.join(__dirname, 'app'),
        filename: 'storeWorkerEndpoint.js',
        globalObject: 'this'
    },
    context: __dirname,
    target: 'electron-renderer',
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    configFile: path.join(__dirname, 'tsconfig-renderer.json'),
                    transpileOnly: true,
                    getCustomTransformers: () => ({before: [vueTransformer]})
                }
            },
        ]
    },
    node: {
        global: true,
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            async: false,
            tslint: path.join(__dirname, '..', 'tslint.json'),
            tsconfig: path.join(__dirname, 'tsconfig-renderer.json'),
            vue: true,
            ignoreLintWarnings: true,
        })
    ],
    resolve: {
        extensions: ['.ts', '.js']
    },
    optimization: {
        //minimize: true,
        moduleIds: 'named',
        chunkIds: 'named',
    },
};

module.exports = function(mode) {
    const themesDir = path.join(__dirname, '../scss/themes/chat');
    const themes = fs.readdirSync(themesDir);
    for(const theme of themes) {
        if(!theme.endsWith('.scss')) continue;
        const absPath = path.join(themesDir, theme);
        rendererConfig.entry.chat.push(absPath);

        rendererConfig.module.rules.unshift(
            {
                test: absPath,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            outputPath: 'themes',
                            name: '[name].css',
                        },
                    },
                    {
                        loader: 'extract-loader',
                        // webpack doesn't know we're changing the directory relationship between the css files and their referenced fonts, so we tell it here:
                        // options: {
                        //     publicPath: '../',
                        // },
                        // However, for some reason this breaks everything, while leaving webpack to figure it out only breaks SOME things.
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            esModule: false,
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            warnRuleAsWarning: false,
                            sassOptions: {
                                quietDeps: true
                            }
                        }
                    }
                ]
            }
        );
    }

    const faPath = path.join(themesDir, '../../fa.scss');
    rendererConfig.entry.chat.push(faPath);

    rendererConfig.module.rules.unshift(
        {
            test: faPath,
            use: [
                {loader: 'file-loader', options: {name: 'fa.css'}},
                'extract-loader',
                {loader: 'css-loader', options: {esModule: false}},
                {
                    loader: 'sass-loader',
                    options: {
                        warnRuleAsWarning: false,
                        sassOptions: {
                            quietDeps: true
                        }
                    }
                }
            ]
        }
    );

    if(mode === 'production') {
        process.env.NODE_ENV = 'production';

        mainConfig.devtool = false;
        rendererConfig.devtool = false;
        storeWorkerEndpointConfig.devtool = false;

        rendererConfig.plugins.push(new OptimizeCssAssetsPlugin());

        if (process.argv.includes('analyze')) {
            mainConfig.plugins.push(new BundleAnalyzerPlugin({
                openAnalyzer: false,
                analyzerPort: 8880,
                generateStatsFile: true,
                statsFilename: path.join('..', 'stats-main.json'),
            }));
            rendererConfig.plugins.push(new BundleAnalyzerPlugin({
                openAnalyzer: false,
                analyzerPort: 8881,
                generateStatsFile: true,
                statsFilename: path.join('..', 'stats-renderer.json'),
            }));
            storeWorkerEndpointConfig.plugins.push(new BundleAnalyzerPlugin({
                openAnalyzer: false,
                analyzerPort: 8882,
                generateStatsFile: true,
                statsFilename: path.join('..', 'stats-storeworker.json'),
            }));
        }
    } else {
        mainConfig.devtool = 'source-map';
        rendererConfig.devtool = 'source-map';
        storeWorkerEndpointConfig.devtool = 'source-map';
    }

    return [storeWorkerEndpointConfig, mainConfig, rendererConfig];
};
