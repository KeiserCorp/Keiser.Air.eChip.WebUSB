const fs = require('fs')
const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WriteJsonPlugin = require('write-json-webpack-plugin')
const CreateFileWebpack = require('create-file-webpack')
const DIST = path.resolve(__dirname, '../dist')
const package = Object.assign(require('../package.json'), {
  main: 'index.js',
  types: 'index.d.ts',
  private: false,
  devDependencies: {},
  scripts: {}
})

function DtsBundlePlugin(options) { this.options = options }
DtsBundlePlugin.prototype.apply = function (compiler) {
  compiler.hooks.afterEmit.tap('DtsBundlePlugin', () => {
    require('dts-bundle').bundle(this.options)
    replace(this.options.out, [
      {
        search: 'const _default: ChipReaderWatcher;',
        replace: 'declare const _default: ChipReaderWatcher;'
      },
      {
        search: /\/\/ Generated by dts-bundle v\S*/,
        replace: ''
      },
      {
        search: /global \{/,
        replace: 'declare global {'
      },
      {
        search: /^\n/g,
        replace: ''
      },
      {
        search: /^\s*\n/gm,
        replace: ''
      },
      {
        search: /^}/gm,
        replace: '}\n'
      }
    ])
  })
}

function replace(file, rules) {
  const src = path.resolve(file)
  let template = fs.readFileSync(src, 'utf8')

  template = rules.reduce(
    (template, rule) => template.replace(
      rule.search, (typeof rule.replace === 'string' ? rule.replace : rule.replace.bind(global))
    ),
    template
  )

  fs.writeFileSync(src, template)
}

module.exports = {
  mode: 'production',
  entry: './src/chipReaderWatcher.ts',
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
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [DIST],
      cleanAfterEveryBuildPatterns: [path.join(DIST, 'types')]
    }),
    new CopyWebpackPlugin([{ from: 'types', to: 'types' }]),
    new CopyWebpackPlugin([{ from: 'README.md', to: 'README.md' }]),
    new CopyWebpackPlugin([{ from: 'LICENSE.md', to: 'LICENSE.md' }]),
    new CreateFileWebpack({
      path: './dist',
      fileName: '.npmrc',
      content: '//registry.npmjs.org/:_authToken=${NPM_TOKEN}'
    }),
    new WriteJsonPlugin({
      object: package,
      filename: 'package.json',
      pretty: true
    }),
    new DtsBundlePlugin({
      name: 'ChipReaderWatcher',
      main: path.join(DIST, 'types/chipReaderWatcher.d.ts'),
      out: path.join(DIST, 'index.d.ts'),
      removeSource: true,
      newLine: 'lf',
      indent: '  ',
      outputAsModuleFolder: true
    })
  ],
  output: {
    filename: 'index.js',
    path: DIST,
    libraryTarget: 'umd',
    library: 'EChip'
  }
}
