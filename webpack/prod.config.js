const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },

  plugins: [
    new CleanWebpackPlugin('./dist', {
      root: path.resolve(__dirname, '../'),
    })
  ],
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, '../dist')
  }
}