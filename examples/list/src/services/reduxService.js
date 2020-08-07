import {Actions} from "../actions/createActions"
import {dataSet} from "../state/reducer"
import {encodeSearchQuery} from "gatsby-plugin-silverghost/lib/actions/query/localEncoder"
import {isEmpty} from "gatsby-plugin-silverghost/lib/functions"

function simulateServerCall(state, action) {
  let [channel, query, request] = action.params

  let channelData = dataSet.filter(m => (m.channel = channel))
  if (request && request.event === "search") {
    return encodeSearchQuery(channelData, action)
  } else {
    let newPsfState = {
      filter: [
        {
          columnName: "message",
          operation: "contains",
          value: query
        }
      ],
      pagination: {},
      sorting: ["timestamp", "desc"]
    }
    Object.assign(action, state.psfState ? state.psfState : newPsfState)
    if (!isEmpty(query)) {
      action.filter[0].value = query
    }
    return encodeSearchQuery(channelData, action)
  }
}

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
