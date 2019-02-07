const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WriteJsonPlugin = require('write-json-webpack-plugin')
const DIST = path.resolve(__dirname, '../dist')
const package = Object.assign(require('../package.json'), { private: false, devDependencies: {} })

module.exports = {
  mode: 'production',
  entry: './src/echipReaderWatcher.ts',
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
    new CleanWebpackPlugin(DIST, { root: path.resolve(__dirname, '../'), }),
    new CopyWebpackPlugin([{ from: 'types', to: 'types' }]),
    new CopyWebpackPlugin([{ from: 'README.md', to: 'README.md' }]),
    new CopyWebpackPlugin([{ from: 'LICENSE.md', to: 'LICENSE.md' }]),
    new WriteJsonPlugin({
      object: package,
      filename: 'package.json',
      pretty: true
    })
  ],
  output: {
    filename: 'index.js',
    path: DIST,
    libraryTarget: 'umd',
    library: 'EChip'
  }
}