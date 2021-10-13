const path = require("path");

var DIST_DIR = path.resolve(__dirname, "./www");
var DEV_DIR = path.resolve(__dirname, "./.temp");

 var buildConfig = function(env) {
    const isProd = env.prod === true;
    return {
        context: __dirname,
        entry: {
            timeline: DIST_DIR + "/timeline/index.ts",
            resizer: DIST_DIR + "/resizer/index.ts",
            amp: DIST_DIR + "/resizer/amp.ts",
            imageFilter: DIST_DIR + "/imageFilter/index.ts",
        },
        output: {
            path: (isProd ? DIST_DIR : DEV_DIR) + "/scripts/",
            filename: "[name].js",
            publicPath: '/scripts/',
        },
        devtool: isProd ? false : 'source-map',
        devServer: {
            static: ['www'],
        },
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [{
                test: /\.tsx?$/,
                loader: "ts-loader",
                options: {
                    configFile: 'dev.tsconfig.json'
                }
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            }]
        },
        mode: isProd ? "production" : "development"
    };
 }

module.exports = buildConfig;