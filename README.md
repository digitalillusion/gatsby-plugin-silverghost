
  
# gatsby-plugin-silverghost    
 Gatsby plugin offering a simple action framework based on redux. It is thought for highly dynamic pages where real time synchronization between the model and the view is needed and it aims to be generic enough to integrate with other means of synchronization (e.g: the Gatsby Node API)  
  
Configuration  
-- In order to understand how to use the framework, please refer to the examples. However, in order to configure the plugin, add the necessary definition in `./gatsby-config.js`  
  
 module.exports = { plugins: [ { resolve: `gatsby-plugin-react-redux`, options: { // [required] - path to your createStore module pathToCreateStoreModule: './src/state/createStore', // [optional] - options passed to `serialize-javascript` // info: https://github.com/yahoo/serialize-javascript#options // will be merged with these defaults: serialize: { space: 0, isJSON: true, unsafe: false, }, }, }, ], };  
Install  
--    
      npm install --save gatsby-plugin-silverghost react-redux redux  
  
  Installing the module locally  
--    
 If you want to modify this plugin and try the examples you need to install this module locally first.     
    
 1 From the root folder, where this readme is, execute:    

    npm pack    
    mv *.tgz local_modules/  
         
 2 Then, in the package.json of the chosen example, modify the dependencies section to point to the archive  
  

      "dependencies": {  
          "gatsby-plugin-silverghost": "file:../../local_modules/gatsby-plugin-silverghost-0.1.0.tgz",  
           ...  
      }  

Finally, if there are changes made in the plugin code, in order to redeploy to the example you must delete the existing tgz archive from local_modules, repeat step 1 and perform a clean install of the example dependencies.  

> A possible way to perform the clean install is to remove the interested line, performing `npm install`, adding again the dependency on local_modules and performing another `npm install`.

  
When the plugin is installed in local_modules, you can install and start the examples from theiir respective folders:  
  
 - [minimal](https://github.com/digitalillusion/gatsby-plugin-silverghost/tree/master/examples/minimal): Demonstrating how reductions accumulate into redux state according to action parameters   
    
License -- MIT  
    
References --    
 The redux store creation code and ssr are copied from [gatsby-plugin-react-redux](https://github.com/le0nik/gatsby-plugin-react-redux/)    
    
Silver Ghost is a speculation about the name of the yellow Rolls-Royce that Gatsby drives in F. Scott Fitzgerald's novel.
