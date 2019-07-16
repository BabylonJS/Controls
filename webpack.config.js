const path = require("path");

var TEST_DIR = path.resolve(__dirname, "./test/dev");
var DEV_DIR = path.resolve(__dirname, "./.temp");

 var buildConfig = function(env) {
    var isProd = env === "prod";
    return {
        context: __dirname,
        entry: {
            timeline: TEST_DIR + "/timeline/index.ts",
        },
        output: {
            path: DEV_DIR,
            publicPath: "/",
            filename: "[name].js",
        },
        devtool: isProd ? "none" : "source-map",
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [{
                test: /\.tsx?$/,
                loader: "ts-loader"
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