
  
# gatsby-plugin-silverghost list example    
Demonstrating how reductions split into redux state, initialization through URL parameters and list filtering, sorting and pagination
    
Configuration 
--    

In order to take advantage of the framework, the following configuration is needed. The files' location is arbitrary as long as they are correctly referenced in `gatsby-config.js`.  
   
 - *./src/actions/createActions* contains the actions definitions  
 - *./src/actions/createStore* creates the redux store as needed  
  
There are other files which are necessary to the example but not directly referenced by the framework:  
  
 - *./src/services/reduxService* contains the reduction logic  
 - *./src/state/reducer* defines initial application state and root reducer
 - *./src/pages/index.js*, *./src/pages/welcome.js* the view  
  
**Actions**  
  
The createActions file contains the following definition:  
  
    const definitions = {  
      WELCOME: makeAction("@@App/WELCOME", "welcome", "/welcome/:channel/:query", {  
        channel: ["room", "broadcast"]  
      })  
    }
    
For a detailed explanation refer to the [minimal](https://github.com/digitalillusion/gatsby-plugin-silverghost/tree/master/examples/minimal) example. The difference here is that we allow an unbound action parameter `:query` that has the function of initialising the view from the URL the end user navigated to;  it is unbound because it may assume any string value.
Along with payload and params, the actions provide other fields that can be populated during a request, namely:
 - filter: an array of filters to apply to a list, defined as objects with the following properties:
	 - columnName: the name of the field to filter. it support traversal so it is not necessary that it is a field in the first level of the rows to filter
	 - operation: the kind of matching that must be done in order to decide to keep or to discard a row. Typical operations are *contains*, *equal*, *less than*, *greater than*...
	 - value: the value for the filter to match against
 - pagination: contains pagination information like:
	 - number: the current page number
	 - size: the number of rows in a page
	 - totalElements: the count of rows that need to be paged
 - sorting: an array containing the name of the field to sort and the direction, *asc* for ascendant or *desc* for descendant

> Sorting on multiple fields is unsupported, but it can be obtained by defining a hidden field that aggregates the respective weight of the rows according to the fields to sort onto. Sorting can afterward be applied to this hidden field.

The action fields descrivibed above are all handled by a specific reducer called `ListReducer` which we will focus on next.

      
**Root reducer**  
  
The root reducer deals with both setting a message of the day and searching messages, on two pages (one for each channel). Therefore, it uses a `DefaultReducer` for the message of the day and a `ListReducer` for the search. The two reducers' result go through accumulation first and then **split**.

    const rootReducer = combineReducers({  
      [Actions.WELCOME.getReducerKey()]: accumulate(  
        split(  
          [Actions.WELCOME],  
          DefaultReducer.instance(initialState, Actions.WELCOME),  
          ListReducer.instance(initialState, Actions.WELCOME)  
        )  
      )  
    })

In order to have the two sections of the view updated by the same action, the payload gets split among the two reducers. As seen in the [minimal](https://github.com/digitalillusion/gatsby-plugin-silverghost/tree/master/examples/minimal) example, the state once again accumulates by the `:channel` path group parameter.

> The initial state is the global state for all reducers; it must be coherent with the structure of the state the reducers will create subsequently. Even if it is assigned to several reducers, it will be applied by the one which gets called first, so it must be the same constant object for every reducer instantiation.

The order of concatenation of the macros is relevant. Infact calling accumulate on a split payload would cause the redux state to be populated as follows, which is our case:
	
    {     
      room: [defaultPayload1, listPayload1],     
      broadcast: [defaultPayload2, listPayload2]   
    }

Conversely, if split applies to accumulate, the state would result like this:

    [     
      { room: defaultPayload1, broadcast: defaultPayload2 },
      { room: listPayload1, broadcast: listPayload2 }
    ]

One way of organizing the structure of the state may result more elegant than the other, depending on how the view implementation.
  
**Reduction services**  
  
The reduction service contains a simulated call to a server that encodes the action information about the filter, pagination and sorting and return a result from a local dataset instead. This is done through the library function `encodeSearchQuery`.

The reduction services propagates an action which has a payload composed of an array of two elements that will be split on the two reducers: an object containing the query string for the `DefaultReducer` and an object representing a list for the `ListReducer`. In the event of setting the message of the day, for optimal performance, the list of messages gets recovered from the state and in the event of searching the list of message the converse happens.

> There is no guarantee for the previous state to be defined. There is a condition under which the accumulation must restart: change of pathgroup parameters. Such parameters identify several paths whose state must not be mixed. If accumulation didn't restart, there would end up a portion of the old state (from the previous path) merged with a portion of the new state (from the action having changed pathgroup parameters), which is incoherent and inconvenient. This is the reason why the page resets when we change channel, but not when we just go back to index. 

    function handleWelcome(state, action, next) {
      let [channel, query, request] = action.params
      let payload
      let previousState = state.payload[channel] || [{}, {}]
      switch (request ? request.event : "") {
        case "change":
          payload = [
            {
              message: request.message,
              timestamp: request.timestamp
            },
            previousState[1]
          ]
          break
        case "search":
        default:
          payload = [previousState[0], simulateServerCall(previousState[1], action)]
      }
    
      return next(
        Actions.WELCOME.propagate(action, {
          params: [channel, query],
          payload
        })
      )
    }

As always, accumulate macro avoids to bother about which is the part of the redux state correspondent to the selected channel that we are going to update, performing automatically the merge based on the current pathgroup parameters

> Always make sure that the length of the payload array equals the count of the reducers passed to the split macro, otherwise the action won't produce any effect
  
**View**  
  
On the index page, the example presents two links by mean of which to search the welcome messages of the channel "room" rather than those of the channel "broadcast" using a predefined search keyword in the latter case.
Upon transitions coming from outside the framework, like clicking such links, we need to match the landing location to an action (rather then showing the content from the redux state). This way the action parameters are updated reflecting the ones in the URL and the framework is bootstrapped.

This magic is done inside `NavigationBuilder` as soon as we pass the router history:

    new NavigationBuilder(store, globalHistory)

It will dispatch a special `@@router/LOCATION_CHANGE` action request that will be transformed in an appropriate action (`@@App/WELCOME` in the example) when the end user lands on the welcome messages page

> Make sure that `NavigationBuilder` construction is present before you attempt to retrieve data from the redux state or else such data will not be up to date

The welcome page shows a text input box capable of setting the message of the day and a filtered, paginated, sorted list of welcome messages from the currently selected channel.
The navigation event makes a request by filling the necessary fields on the action, depending on the event that occurs

    const navigation = navigationBuilder
        .withEvent(Actions.WELCOME, {
            mapper: (action, input) => {
                const event = input.target.event
                const target = input.target.target
                const formData = new FormData(target.currentTarget ? target.currentTarget : target)
                switch (event) {
                    case "change":
                        const message = formData.get("message");
                        Object.assign(action, {
                            params: [
                                channel,
                                query,
                                {
                                    event,
                                    timestamp: new Date(),
                                    message
                                }
                            ]
                        })
                        break
                    case "search":
                    default:
                        const newQuery = formData.get("query");
                        action.params = [channel, newQuery]
                        return Object.assign(action, {
                            params: [
                                channel,
                                newQuery,
                                {event}
                            ],
                            pagination: {number: formData.get("page") - 1},
                            filter: [{columnName: "message", value: newQuery, operation: "contains"}],
                            sorting: ["timestamp", formData.get("sort")]
                        })
                }

            }, ajax: true
        })
        .build()
        
 Run the example application
--        
    yarn install   
    yarn start  

License 
--   
BSD