const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");


const buildMode = process.env.BUILD_MODE === 'DEV' ? "development" : "production";
const isProduction = buildMode === "production";

console.log("building for: ", buildMode);

module.exports = {
  mode: buildMode,
  entry: {
    popup: './src/popup.ts',
    background: './src/background.ts',
    contentScript: './src/contentScript.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'popup.html',
      inject: false
    }),
    new HtmlWebpackPlugin({
      template: './public/styles.css',
      filename: 'popup.css',
      inject: false
    }),
    new CopyWebpackPlugin({
        patterns: [
          { from:  path.resolve(__dirname, 'public/manifest.json'), to:  path.resolve(__dirname, 'dist') },
        ]
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from:  path.resolve(__dirname, 'assets/microphone.png'), to:  path.resolve(__dirname, 'dist') },
      ]
  })
  ],
  devtool: isProduction ? 'source-map' : 'cheap-module-source-map'
};
