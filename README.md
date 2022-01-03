
# gatsby-plugin-silverghost      

Gatsby plugin offering a simple action framework based on redux. It is thought for highly dynamic pages in need of real time synchronization between model and view. 
It aims to be generic enough to integrate with others means of synchronization (e.g: the Gatsby Node API) as well.    
 
### Live demo  
 
https://gatsbypluginsilverghost.gtsb.io/  
    
### Examples

 - [minimal](https://github.com/digitalillusion/gatsby-plugin-silverghost/tree/master/examples/minimal): Demonstrating how reductions accumulate into redux state according to action parameters
 - [list](https://github.com/digitalillusion/gatsby-plugin-silverghost/tree/master/examples/list): Demonstrating how reductions split into redux state, initialization through URL parameters and list filtering, sorting and pagination     
 - [tree](https://github.com/digitalillusion/gatsby-plugin-silverghost/tree/master/examples/tree): Demonstrating how reductions collect into redux state and dealing with concurrent actions     
    
### Configuration  

In order to understand how to use the framework, please refer to the examples. However, in order to configure the plugin, add the necessary definition in `./gatsby-config.js`    
    
    module.exports = {  
      plugins: [  
        {  
          resolve: `gatsby-plugin-silverghost`,  
          options: {  
            // [required] - path to your createStore module  
            pathToCreateStoreModule: "./src/state/createStore",  
            // [required] - path to your createActions module  
            pathToCreateActions: "./src/actions/createActions",  
            // [optional] - options passed to `serialize-javascript`  
            // info: https://github.com/yahoo/serialize-javascript#options // will be merged with these defaults:  serialize: {  
              space: 0,  
              isJSON: true,  
              unsafe: false  
            }  
          }  
        }  
      ]  
    }

  
Install 
--      

    yarn add gatsby-plugin-silverghost react-redux redux    

 
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

Finally, if there are changes made in the plugin code, in order to redeploy to the example you must delete the existing tgz archive from local_modules, then repeat step 1 and then perform a clean install of the example dependencies.    
  
> A possible way to perform the clean install is to remove the yarn.lock file and then execute `yarn install`.  
  
When the plugin is installed in local_modules, you can modify it and see the changes directly in the chosen example:    
    
### License 

BSD    
      
### References 
 
The redux store creation code and ssr are copied from [gatsby-plugin-react-redux](https://github.com/le0nik/gatsby-plugin-react-redux/)            
Silver Ghost is a speculation about the name of the yellow Rolls-Royce that Gatsby drives in F. Scott Fitzgerald's novel.
