import { applyMiddleware, createStore } from "redux"
import reducer from "./reducer"
import { reduxService } from "../services/reduxService"

export default preloadedState =>
  createStore(reducer, preloadedState, applyMiddleware(reduxService))
