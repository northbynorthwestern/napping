var webpack = require('webpack'),
    path = require('path'),

    componentPath = path.resolve('./src/js');

module.exports = {
  context: path.join(__dirname),
  entry: [
    "./src/js/index.js"
  ],
  output: {
    path: path.join(__dirname, "./dist/js"),
    filename: "[name].js"
  },
  resolve: {
    root: componentPath
  },
  resolveLoader: {
    root: path.join(__dirname, "node_modules")
  },
  module: {
      loaders: [
        { test: /\.hbs$/, loader: "handlebars-loader" }
      ]
  }
}
