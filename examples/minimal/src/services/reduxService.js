import { Actions } from "../actions/createActions"

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
