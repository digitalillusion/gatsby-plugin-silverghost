import { Actions } from "../actions/createActions"

function handleWelcome(state, action, params, next) {
  let request = params[0]

  let payload = {}
  switch (request.event) {
    case "change":
      const current = state.payload
      payload.timestamp = current[request.channel].timestamp
      payload.message = current[request.channel].message || ""
      payload.channel = request.channel
      break
    case "submit":
    default:
      payload = request.message ? request : payload
  }
  return next(
    Actions.WELCOME.propagate(action, {
      params: [request.channel],
      payload
    })
  )
}

export const reduxService = store => next => action => {
  // Perform reduction logic
  let matched = Actions.match(action)
  let params = Actions.getParams(matched)

  switch (matched.type) {
    case Actions.WELCOME.REQUEST:
      const state = store.getState()[Actions.WELCOME.getReducerKey()]
      handleWelcome(state, matched, params, next)
      break
    default:
  }

  // Pass the action to following middlewares
  return action
}
