import { Actions } from "../actions/createActions"

function simulateServerCall(collectPath) {
  let children = {}
  const count = Math.floor(Math.random() * 4 + 3);
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
      request.target.properties.expanded = false
      payload = { ...request.children, ...request.target.properties }
      break
    case "expand":
    default:
      request.target.properties.expanded = true
      let children = simulateServerCall(collectPath)
      payload = { ...children, ...request.target.properties }
      break
  }

  return next(
    Actions.TREE.propagate(action, {
      params: collectPath,
      payload
    })
  )
}

export const reduxService = store => next => action => {
  // Perform reduction logic
  let matched = Actions.match(action)

  switch (matched.type) {
    case Actions.TREE.REQUEST:
      const state = store.getState()[Actions.TREE.getReducerKey()]
      handleTree(state, matched, next)
      break
    default:
  }

  // Pass the action to following middlewares
  return action
}
