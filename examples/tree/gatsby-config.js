module.exports = {
  siteMetadata: {
    title: `SilverGhost tree example`,
    description: `Demonstrating how reductions collect into redux state and dealing with concurrent actions`,
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
