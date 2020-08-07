import { Actions } from "../actions/createActions"
import { combineReducers } from "redux"
import {
  accumulate,
  collect,
  DefaultReducer
} from "gatsby-plugin-silverghost/lib/reducers"

const initialState = {
  tree: Actions.instance({
    payload: {
      _0: {
        label: "_0",
        leaf: false,
        expanded: false
      }
    },
    params: []
  })
}

const rootReducer = combineReducers({
  [Actions.TREE.getReducerKey()]: collect(
    accumulate(DefaultReducer.instance(initialState.tree, Actions.TREE))
  )
})

export default rootReducer
