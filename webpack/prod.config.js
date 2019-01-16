const path = require('path')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const DIST = path.resolve(__dirname, '../dist')

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
    new CopyWebpackPlugin([{ from: 'types', to: 'types' }])
  ],
  output: {
    filename: 'index.js',
    path: DIST,
    libraryTarget: 'umd',
    library: 'EChip'
  }
}