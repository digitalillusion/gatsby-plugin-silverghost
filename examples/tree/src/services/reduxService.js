import { Actions } from "../actions/createActions"
import { isEmpty } from "gatsby-plugin-silverghost/lib/functions"

function simulateServerCall(collectPath) {
  let children = {}
  const count = Math.floor(Math.random() * 4 + 3)
  for (let i = 0; i < count; i++) {
    const label = collectPath.join("") + "_" + i
    children[label] = {
      label,
      expanded: false,
      leaf: collectPath.length > 2
    }
  }
  return children
}

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

let isLoggedIn = false

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
