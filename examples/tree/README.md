
  
# gatsby-plugin-silverghost tree example    
Demonstrating how reductions collect into redux state and dealing with concurrent actions
    
### Configuration 

In order to take advantage of the framework, the following configuration is needed. The files' location is arbitrary as long as they are correctly referenced in `gatsby-config.js`.  
   
 - *./src/actions/createActions* contains the actions definitions  
 - *./src/actions/createStore* creates the redux store as needed  
  
There are other files which are necessary to the example but not directly referenced by the framework:  
  
 - *./src/services/reduxService* contains the reduction logic  
 - *./src/state/reducer* defines initial application state and root reducer
 - *./src/pages/index* the view  
 - *./src/components/layout* A page layout to differentiate between logged in and logged out view
  
**Actions**  
  
The createActions file contains the following definition:  
  
    const definitions = {
      SESSION: makeAction("@@App/SESSION", "session"),
      TREE: makeAction("@@App/TREE", "tree", "/tree/:level0/:level1/:level2", {
        level0: [],
        level1: [[]],
        level2: [[[]]]
      })
    }
    
For a detailed explanation refer to the [minimal](https://github.com/digitalillusion/gatsby-plugin-silverghost/tree/master/examples/minimal) example. However, in this case we define two concurrent actions. The login/logout action, SESSION, and a TREE action to work on the view. The particularity of this last action is that it does define pathgroup parameters but they are unbound. This way anything that will actually occurr in the parameter placeholder upon action istantiation will match the definition and there is no need to know it in advance. This action will be used to dynamically display a tree.

> Infact there is a constraint given to the tree here: its maximum dept; if we go deeper than what defined by mean of the pathgroup parameters, the reducer will no longer be capable of structuring the redux state as a tree

The session action has a different peculiarity: it doesn't even have a pathname. It's completely AJAX, it cannot be triggered by a URL, as normally others action do. Even so, it can still take parameters, although it's not the case in this simple example.

**Root reducer**  
  
The root reducer deals with two separate, simple actions that insist on this page and it uses the `DefaultReducer` for both. What is more interesting to see is that the TREE action payload is first accumulated and then goes through **collect**.

    const rootReducer = combineReducers({
      [Actions.SESSION.getReducerKey()]: DefaultReducer.instance(
        initialState.session,
        Actions.SESSION
      ),
      [Actions.TREE.getReducerKey()]: collect(
        accumulate(DefaultReducer.instance(initialState.tree, Actions.TREE))
      )
    })

In order to display each node of the tree we'll need some properties (the fact that it is a leaf, its label, icon, etc.) and the eventual children of such a node. Children are dynamical, so they need to be accumulated in the state. However, they don't go all at the same place, but instead they are parented to a node expanded previously. The collect macro solves this latter problem

> You can also apply collect first and accumulate later. The result will be a list of several collected paths, which may also have a meaning in a different context

Accumulate and collect use the pathgroup parameters to understand what part of the redux state must change. For example, if the action path is `/tree/_0/_0_3/_0_3_1` the action payload will be applied at such position in the existing state.
	
    {     
      tree: { _0: { _0_1: {...}, 
                    _0_2: {...}, 
                    _0_3: { _0_3_0: {...}, 
                            _0_3_1: payload, 
                            ... }
                    ... }
            }
    }

  
**Reduction services**  
  
The reduction service is a bit more complex this time since it handles two concurrent actions. The tree must be visible only to logged users and so the service will not make any TREE action call for anonymous users:

    export const reduxService = store => next => action => {
      // Perform reduction logic
      let matched = Actions.match(action)
      const state = store.getState()
      const authentication = state[Actions.SESSION.getReducerKey()]
      const isAuthenticated =
        !isEmpty(authentication) && !authentication.payload.anonymous
    
      switch (matched.type) {
        case Actions.SESSION.REQUEST:
          handleSession(store.dispatch, matched, next)
          break
        case Actions.TREE.REQUEST:
          const state = store.getState()[Actions.TREE.getReducerKey()]
          isAuthenticated && handleTree(state, matched, next)
          break
        default:
      }

      // Pass the action to following middlewares
      return action
    }

The above is needed since upon first access to the page the navigation builder dispatches a special `@@router/LOCATION_CHANGE` action to resolve to a TREE action, but this call must not reach the server if the user is anonymous. There is the need to skip this call and perform a new one as soon as the state for the SESSION action contains the authentication information, as we will see later.

The two handlers are quite straightforward; the `handleSession()` is faking an HTTP request that returns authentication information after a given delay:

    let isLoggedIn = true
    
    export async function handleSession(dispatch, action, next) {
      let [request] = action.params
      const responseLoggedIn = {
        anonymous: false,
        authentication: { name: "Administrator" }
      }
      const responseLoggedOut = { anonymous: true }
    
      let fetch
      switch (request ? request.event : "") {
        case "login":
          isLoggedIn = true
          fetch = Promise.resolve(responseLoggedIn)
          break
        case "logout":
          isLoggedIn = false
          fetch = Promise.resolve(responseLoggedOut)
          break
        default:
          fetch = new Promise(function(resolve) {
            setTimeout(
              resolve.bind(null, isLoggedIn ? responseLoggedIn : responseLoggedOut),
              1200
            )
          })
      }
      const payload = await fetch
      next(
        Actions.SESSION.propagate(action, {
          params: [],
          payload
        })
      )
    }
    
On the other side, the `handleTree()` is invoked each time a tree node is expanded and it will determine how many children such node will have. To emphasize the dynamicity of the implementation, a random number of children is returned by a simulated server call each time the end user expands a node.

    function handleTree(state, action, next) {
      let keys = [...action.params]
      let request = keys.pop()
      let collectPath = [...keys]
    
      let payload
      switch (request ? request.event : "") {
        case "collapse":
          payload = { ...request.children, ...request.target.properties }
          payload.expanded = false
          break
        case "expand":
        default:
          let children = simulateServerCall(collectPath)
          payload = { ...children, ...request.target.properties }
          payload.expanded = true
      }
    
      return next(
        Actions.TREE.propagate(action, {
          params: collectPath,
          payload
        })
      )
    }
  
>  Since accumulate works at first level, not on a hierarchy, the children cannot be nested in an identifying property (say: "children") but they need to stay along with the node properties (like label, icon, etc.)
  
**View**  
  
The view is a composition two fragments: the home page and the layout, which wraps the home page. In the layout we find the handling of the session:

    export default function Layout({ children }) {
      const store = useStore()
      const session = useSelector(state => state.session, []).payload
      const isAnonymous = isEmpty(session) || session.anonymous
    
      const navigation = new NavigationBuilder(store, globalHistory)
        .withEvent(Actions.SESSION, {
          mapper: (action, input) => (action.params = [input.target])
        })
        .build()
    
      useEffect(() => {
        if (isEmpty(session)) {
          navigation.onEvent(Actions.SESSION)({ event: "whois" })
        } else if (!session.anonymous) {
          navigation.refresh()
        }
      }, [isAnonymous])
    
      return isAnonymous ? (
        <Anonymous navigation={navigation} />
      ) : (
        <Authenticated session={session} navigation={navigation}>
          {children}
        </Authenticated>
      )
    }

Since the refresh that gives initiation to the proper action (`@@App/TREE` in the example) done by `NavigationBuilder` construction upon landing on the page is lost due to the fact that the user is not logged in (as said above, is the redux service that prevents the fulfillment of this call), there is the need to call the hook [useEffect](https://reactjs.org/docs/hooks-effect.html) when the session is no longer anonymous and explicitely perform the

    navigation.refresh()

The home page takes once again advantage of the `NavigationBuilder` to recursively build the tree:

     const treeBuilder = builder => {
        function createNodes(nodes, path = []) {
          for (const [key, node] of Object.entries(nodes)) {
            const nodePath = [...path, key]
            const { label, expanded, leaf, ...children } = node
            const properties = { label, expanded, leaf }
            if (!leaf) {
              builder
                .withBranch(key, properties)
                .onExpand(Actions.TREE, (action, input) => {
                  action.params = [
                    ...nodePath,
                    {
                      event: input.target.properties.expanded
                        ? "collapse"
                        : "expand",
                      target: input.target,
                      children
                    }
                  ]
                  return action
                })
              createNodes(children, nodePath)
              builder.endBranch()
            } else {
              builder.withSibling(key, properties)
            }
          }
          return builder
        }
        createNodes(tree.payload)
      }
    
      const navigation = navigationBuilder.withTree(treeBuilder).build()

Equally recursively, the tree is drawn. Note that the object key we used to uniquely identify the node is later on called id, and a field named properties contains everything that was passed on as such:

      function drawLevel(nodes) {
        return (
          <ul>
            {(nodes || []).map(node => (
              <li
                key={node.id}
                onClick={target => navigation.nodeOnExpand(node, target)}
              >
                {
                  <div>
                    <span>{node.properties.label}</span>
                    {node.properties.expanded && drawLevel(node.children)}
                  </div>
                }
              </li>
            ))}
          </ul>
        )
      }
      
      ...
      
      <div>{drawLevel([...navigation.getTree()])}</div>

### Run the example application

    yarn install   
    yarn start  

### License 
 
BSD