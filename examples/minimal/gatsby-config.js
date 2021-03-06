module.exports = {
  siteMetadata: {
    title: `SilverGhost minimal example`,
    description: `Demonstrating how reductions accumulate into redux state according to action parameters`,
    author: `@digitalillusion`
  },
  plugins: [
    {
      resolve: `gatsby-plugin-silverghost`,
      options: {
        // [required] - path to your createStore module
        pathToCreateStoreModule: "./src/state/createStore",
        // [required] - path to your createActions module
        pathToCreateActions: "./src/actions/createActions",
        // [optional] - options passed to `serialize-javascript`
        // info: https://github.com/yahoo/serialize-javascript#options
        // will be merged with these defaults:
        serialize: {
          space: 0,
          isJSON: true,
          unsafe: false
        }
      }
    }
  ]
}
