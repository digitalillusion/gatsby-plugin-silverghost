
# gatsby-plugin-silverghost minimal example  
  
Demonstrating how reductions accumulate into redux state according to action parameters  
  
Configuration  
--  

 In order to take advantage of the framework, the following configuration is needed. The files' location is arbitrary as long as they are correctly referenced in `gatsby-config.js`.
 
 - *./src/actions/createActions* contains the actions definitions
 - *./src/actions/createStore* creates the redux store as needed

There are other files which are necessary to the example but not directly referenced by the framework:

 - *./src/services/reduxService* contains the reduction logic
 - *./src/state/reducer* defines initial application state and root reducer
 - *./src/pages/index.js* the view


**Actions**

The createActions file contains the following definition:
      
    const definitions = {  
      WELCOME: makeAction("@@App/WELCOME", "welcome", "/:channel", {  
        channel: ["room", "broadcast"]  
      })  
    }  
    
It exports an `Actions` class having a `Actions.WELCOME` static field that represent the *welcome* action definition, made by `makeAction` function. The function takes the following parameters:
* *actionName* The action name, UPPER_SNAKE_CASE prepended with @@App/ as convention  
* *reducerKey* An unique key used in the redux state store  
* *pathname* The pathname this action replies to; it can include path parameters in any part, prepended by colon (:)  
* *pathgroups* The possible values for the path parameters, given as an array of 
		
		{ pathGroupKey : [ ...parameterValues ] }
	

> **Pathgroups are useful when they bind to a structure, as it will reflect the structure of the redux state afterwards.** Moreover, a path parameter which has an associated pathgroup will always have a value

Pathgroups definition allow for hierarchical structuring. For instance, if an action defines a pathname of :tab/:pane there is the possibility to define all available tabs and, for each tab, all the available panes in the following way: 

    EXAMPLES_ACTION : makeAction('@@App/EXAMPLES_ACTION', 'examples', '/:tab/:pane', {
        'tab': ['tables', 'layouts', 'charts'],
        'pane': [['simple', 'local', 'remote'], ['vertical', 'horizontal'], ['pie', 'grid', 'flow', 'sequence']]
    }),
    
Intuitively, the structure which is formed by the definition above reflect the following tree

 - tables
	 - simple
	 - local
	 - remote
 - layouts
	 - vertical
	 - horizontal
 - charts
	 - pie
	 - grid
	 - flow
	 - sequence
 

> You can add as many levels as you want; with n levels, the last pathgroup `parameterValues` will be an array of dimension n-1

NOTE: Ordering of the actions matters! Only the first path matching all path parameters and fixed url parts will be retained.

**Store**

In this example, we just use a root reducer and a single middleware that receives the actions and updates the redux state, but there can be many middlewares.
The createStore file contains the following definition:
      
    export default preloadedState =>  
      createStore(rootReducer, preloadedState, applyMiddleware(reduxService))

It exports an arrow function called by the plugin. The preloaded state is the initial state passed by the plugin after ssr has occurred. Next, let's give a look at the rootReducer
    
**Root reducer**

A way to define a root reducer is to use [combineReducers](https://redux.js.org/api/combinereducers) function, specifying a key-value pair: for each action that needs to be reduced, the reducer that should take care of it.

    const initialState = Actions.WELCOME.instance({
	  params: ...
	  payload: ...
    })
      
    const rootReducer = combineReducers({  
      [Actions.WELCOME.getReducerKey()]: accumulate(  
        DefaultReducer.instance(initialState, Actions.WELCOME)  
      )  
    })  

    export default rootReducer

 In this minimal example we have only one action and we request to **accumulate** the state changes. The `DefaultReducer` is the simplest reducer you can imagine: For the given action definitions (our *welcome* action), return the matching runtime action as-is or return the state otherwise (initialState will be returned upon initialization). 
 

> In order to correctly integrate with the framework, initialState must be created as an action, with at least two properties, params and payload.

> *accumulate* effect is to create a structure based on action path groups. For our action, the redux state at the key *welcome* will be split in two sub-keys, one for each pathgroup: *room* and *broadcast*. This allows an action at a given time (with some given pathgroup parameters) to make non interfering changes on a specifc sub-key, without the need to bother about other sub-keys; this is trivial in this simple scenario but being capable of performing this kind of processing automatically greatly improves readability of written code as complexity rises

What this code is doing will be clearer once we give a look at the middleware:

**Reduction services**

    import { Actions } from "../actions/createActions"  
    	  
    export const reduxService = store => next => action => {  
      // Perform reduction logic
      let matched = Actions.match(action)
      
      switch (matched.type) {
        case Actions.WELCOME.REQUEST:
          const state = store.getState()[Actions.WELCOME.getReducerKey()]
          handleWelcome(state, matched, next)
          break
        default:
      }
      
      // Pass the action to following middlewares
      return action
    }
    
The reduction service is dispatching every action to a different function, so that it can be easily handled. Next, we give a look at the `handleWelcome` function in detail:

    function handleWelcome(state, action, next) {
      let [channel, request] = action.params
    
      let payload
      switch (request ? request.event : "") {
        case "change":
          const current = state.payload[channel]
          payload = {
            timestamp: current.timestamp,
            message: current.message || ""
          }
          break
        case "submit":
        default:
          payload = request.message ? request : {}
      }
      return next(
        Actions.WELCOME.propagate(action, {
          params: [channel],
          payload
        })
      )
    }
    
Note that we expect the first parameter, channel, as per action definition. The definition does not bind any other parameter, so the request occupies the second position;
One could add as many unbound parameter as needed after the expected ones.
The service has access to the whole previous state, is aware it is an accumulated object, and can do business logic on it. However, the produced payload is completely agnostic about the current reduction state, and **the service focus only on producing the effect of this specific invocation**: only the payload for the current channel propagates.
The call to next() propagates the input action, modified by the resulting payload, toward the next stages of the middleware and lastly toward the view.

**View**

That was a lot of preparation before we reach the view, but hopefully it will all make sense as soon as we look how things go altogether.
The WelcomeMessage component in ./src/pages/welcome.js can retrieve the redux state from the store and gain access to both last action's parameters and payload:

    const welcome = useSelector(state => state.welcome, [])  
    const channel = welcome.params[0]
    
It's easy now to know what part of the view is going to get updated. There is the possibility of writing conditional expressions:

    const isRoomChannel = channel === "room"
    <input type="radio" name="channel" value="room" {...(isRoomChannel ? { defaultChecked: true} : {})}  
       onChange={target => navigation.onEvent(Actions.WELCOME)({ event: "change", target})} />

To output all or part of the payload accordingly:

    <h3>Room Message</h3>  
    <table>  
      <tbody>  
        {!isEmpty(welcome.payload.room.message  ) && <tr>  
          <td>{welcome.payload.room.timestamp.toString()}</td>  
          <td>{welcome.payload.room.message}</td>  
        </tr>}  
      </tbody>  
    </table>
    
As briefly seen above, the `navigation.onEvent(Actions.WELCOME)` is responsible for triggering an event. Its curry 
holds all the necessary data, for instance `({ event: "change", target})` where `target` contains information about html 
event that happened (a radio button click here above).

The code builds the navigation as follows:

    case "change" :
        return Object.assign(action, { params : [
            target.currentTarget.value,
            { event }
        ] })
    case "submit" :
    default:
        const formData = new FormData(target.currentTarget)
        return Object.assign(action, { params: [
            formData.get("channel"),
            {
                event,
                timestamp: new Date(),
                message: formData.get("message")
            }
        ] })
        
The above code maps an event toward an action that depends on the input context, which assembles a mapping context and the curry from the invocation.
It is executed when the user triggers an event correspondent to our *welcome* action, right before the execution goes to
the reduction services for matching and processing. 
> The mapper must return the action passed in so that the matching occurs; furthermore it can add several `params` to the request,
as needed by the processing phase  

 
Run the example application  
--  
  
    yarn install 
    yarn start
    
License  
--  

BSD
      