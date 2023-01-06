const path = require('path');

module.exports = {
  entry: './parser.js',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  devServer: {
    static: {
      directory: path.join(__dirname),
    },
    compress: true,
    port: 8080,
  },
};

// TODO: https://webpack.js.org/guides/getting-started/
