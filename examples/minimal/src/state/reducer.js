import { Actions } from "../actions/createActions"
import { combineReducers } from "redux"
import {
  accumulate,
  DefaultReducer
} from "gatsby-plugin-silverghost/lib/reducers"

const initialState = {
  message: "Server says hello"
}

const reducer = () =>
  combineReducers({
    [Actions.HOME_PAGE.getReducerKey()]: accumulate(
      DefaultReducer.instance(initialState, Actions.HOME_PAGE)
    )
  })

export default reducer
