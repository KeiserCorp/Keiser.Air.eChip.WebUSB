const HtmlWebpackPlugin = require('html-webpack-plugin')

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
    extensions: ['.tsx', '.ts', '.js']
  },
  devServer: {
    contentBase: './dev'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './dev/index.html'
    }),
  ],
  output: {
    filename: 'index.js',
    libraryTarget: 'umd',
    library: 'EChip'
  }
}