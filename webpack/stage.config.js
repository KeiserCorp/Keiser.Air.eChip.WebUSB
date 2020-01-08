const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const STAGE = path.resolve(__dirname, '../stage')

module.exports = {
  mode: 'production',
  entry: './dev/index.ts',
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
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      'vue': 'vue/dist/vue.common.js'
    }
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './dev/index.html' }),
    new CopyWebpackPlugin([{ from: './dev/index.html', to: path.join(STAGE, 'index.html') }]),
    new CopyWebpackPlugin([{ from: './dev/style.css', to: path.join(STAGE, 'style.css') }])
  ],
  output: {
    filename: 'index.js',
    path: STAGE,
    libraryTarget: 'umd',
    library: 'EChip'
  }
}
