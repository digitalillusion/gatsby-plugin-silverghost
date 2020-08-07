import { applyMiddleware, createStore } from "redux"
import rootReducer from "./reducer"
import { reduxService } from "../services/reduxService"

export default preloadedState =>
  createStore(rootReducer, preloadedState, applyMiddleware(reduxService))
