const path = require('path');

module.exports = {
  entry: './parser.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
};
