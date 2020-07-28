import { Actions } from "../actions/createActions"

function handleHomePage(action, params, next) {
  console.log(action, params)
}

export const reduxService = store => next => action => {
  // Perform reduction logic
  let matched = Actions.match(action)
  let params = Actions.getParams(matched)

  switch (matched.type) {
    case Actions.HOME_PAGE.REQUEST:
      handleHomePage(action, params, next)
      break
    default:
  }

  // Pass the action to following middlewares
  return action
}
