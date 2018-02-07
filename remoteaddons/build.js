
var ionicWebpackFactory = require('/Users/dpalou/Development/moodlemobile2/node_modules/@ionic/app-scripts/dist/webpack/ionic-webpack-factory.js');
var path = require('path');
var fs = require("fs");
var ts = require("typescript");
var webpackApi = require('webpack');
var getInMemoryCompilerHostInstance = require("@ionic/app-scripts/dist/aot/compiler-host-factory");
var helpers = require("@ionic/app-scripts/dist/util/helpers");
var FileCache = require("@ionic/app-scripts/dist/util/file-cache");
var template = require("@ionic/app-scripts/dist//template");
var webpackConfig = {
  entry: '/Users/dpalou/Development/moodlemobile2/src/addon/mod/book/book.module.ts',
  output: {
    path: '/Users/dpalou/Development/moodlemobile2/remoteaddons/build',
    publicPath: 'build/',
    filename: 'addon.js',
    // the name exported to window
    library: 'addon',
    // Export to UMD.
    libraryTarget: 'umd',
  },
  devtool: 'source-map',

  resolve: {
    extensions: ['.ts', '.js', '.json'],
    modules: [path.resolve('node_modules')]
  },

  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.ts$/,
        loader: '/Users/dpalou/Development/moodlemobile2/node_modules/@ionic/app-scripts/dist/webpack/loader.js'
      }
    ]
  },


  // Some libraries import Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
};

var context = {
    fileCache: new FileCache.FileCache()
};
helpers.setContext(context);

function transpile() {
    var workerConfig = {
        configFile: '/Users/dpalou/Development/moodlemobile2/tsconfig.json',
        writeInMemory: true,
        sourceMaps: true,
        cache: true,
        inlineTemplate: true,
        useTransforms: true
    };
    return new Promise(function (resolve, reject) {
        // get the tsconfig data
        var tsConfig = getTsConfig(workerConfig.configFile);
        if (workerConfig.sourceMaps === false) {
            // the worker config say, "hey, don't ever bother making a source map, because."
            tsConfig.options.sourceMap = false;
        }
        // collect up all the files we need to transpile, tsConfig itself does all this for us
        var tsFileNames = tsConfig.fileNames;
        // for dev builds let's not create d.ts files
        tsConfig.options.declaration = undefined;
        // let's start a new tsFiles object to cache all the transpiled files in
        var host = getInMemoryCompilerHostInstance.getInMemoryCompilerHostInstance(tsConfig.options);
        // if (workerConfig.useTransforms && helpers_1.getBooleanPropertyValue(Constants.ENV_PARSE_DEEPLINKS)) {
        //     // beforeArray.push(purgeDeepLinkDecoratorTSTransform());
        //     // beforeArray.push(getInjectDeepLinkConfigTypescriptTransform());
        //     // temporarily copy the files to a new location
        //     copyOriginalSourceFiles(context.fileCache);
        //     // okay, purge the deep link files NOT using a transform
        //     var deepLinkFiles = util_1.filterTypescriptFilesForDeepLinks(context.fileCache);
        //     deepLinkFiles.forEach(function (file) {
        //         file.content = util_1.purgeDeepLinkDecorator(file.content);
        //     });
        //     var file = context.fileCache.get(helpers_1.getStringPropertyValue(Constants.ENV_APP_NG_MODULE_PATH));
        //     var hasExisting = util_1.hasExistingDeepLinkConfig(file.path, file.content);
        //     if (!hasExisting) {
        //         var deepLinkString = util_1.convertDeepLinkConfigEntriesToString(helpers_1.getParsedDeepLinkConfig());
        //         file.content = util_1.getUpdatedAppNgModuleContentWithDeepLinkConfig(file.path, file.content, deepLinkString);
        //     }
        // }
        var program = ts.createProgram(tsFileNames, tsConfig.options, host);
        // resetSourceFiles(context.fileCache);
        var beforeArray = [];
        program.emit(undefined, function (path, data, writeByteOrderMark, onError, sourceFiles) {
            if (workerConfig.writeInMemory) {
                writeTranspiledFilesCallback(path, data, workerConfig.inlineTemplate);
            }
        });
        // cache the typescript program for later use
        // cachedProgram = program;
        // var tsDiagnostics = program.getSyntacticDiagnostics()
        //     .concat(program.getSemanticDiagnostics())
        //     .concat(program.getOptionsDiagnostics());
        // var diagnostics = logger_typescript_1.runTypeScriptDiagnostics(context, tsDiagnostics);
        // if (diagnostics.length) {
        //     // darn, we've got some things wrong, transpile failed :(
        //     logger_diagnostics_1.printDiagnostics(context, logger_diagnostics_1.DiagnosticsType.TypeScript, diagnostics, true, true);
        //     reject(new errors_1.BuildError('Failed to transpile program'));
        // }
        // else {
            // transpile success :)
            resolve();
        // }
    });
}

function getTsConfig(tsConfigPath) {
    var tsConfigFile = ts.readConfigFile(tsConfigPath, function (path) { return fs.readFileSync(path, 'utf8'); });

    var parsedConfig = ts.parseJsonConfigFileContent(tsConfigFile.config, ts.sys, '/Users/dpalou/Development/moodlemobile2', {}, tsConfigPath);
    return {
        options: parsedConfig.options,
        fileNames: parsedConfig.fileNames,
        raw: parsedConfig.raw
    };
}


function writeTranspiledFilesCallback(sourcePath, data, shouldInlineTemplate) {
    sourcePath = path.normalize(path.resolve(sourcePath));
    if (sourcePath.endsWith('.js')) {
        var file = context.fileCache.get(sourcePath);
        if (!file) {
            file = { content: '', path: sourcePath };
        }
        if (shouldInlineTemplate) {
            file.content = template.inlineTemplate(data, sourcePath);
        }
        else {
            file.content = data;
        }
        context.fileCache.set(sourcePath, file);
    }
    else if (sourcePath.endsWith('.js.map')) {
        var file = context.fileCache.get(sourcePath);
        if (!file) {
            file = { content: '', path: sourcePath };
        }
        file.content = data;
        context.fileCache.set(sourcePath, file);
    }
}

function webpack() {
    return new Promise(function(resolve, reject) {
        var compiler = webpackApi(webpackConfig);
        compiler.run(function(err, stats) {
            if (err) {
                reject(err);
            }
            else {
                var info = stats.toJson();
                if (stats.hasErrors()) {
                    reject(info.errors);
                }
                else if (stats.hasWarnings()) {
                    console.log(info.warnings);
                    resolve(stats);
                }
                else {
                    resolve(stats);
                }
            }

        });
    });
}

transpile().then(function() {
    webpack();
});
