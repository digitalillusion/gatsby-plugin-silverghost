import {Actions} from "../actions/createActions"
import {combineReducers} from "redux"
import {accumulate, DefaultReducer} from "gatsby-plugin-silverghost/lib/reducers"

const initialMessage = "Server says hello"
const initialState = Actions.WELCOME.instance({
  params: ["broadcast", initialMessage],
  payload: {
    broadcast: {
      timestamp: new Date(),
      message: initialMessage,
      channel: "broadcast"
    },
    room: {}
  }
})

const rootReducer = combineReducers({
  [Actions.WELCOME.getReducerKey()]: accumulate(
    DefaultReducer.instance(initialState, Actions.WELCOME)
  )
})

export default rootReducer
