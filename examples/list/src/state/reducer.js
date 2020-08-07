import { Actions } from "../actions/createActions"
import { combineReducers } from "redux"
import {
  accumulate,
  split,
  DefaultReducer,
  ListReducer
} from "gatsby-plugin-silverghost/lib/reducers"

export const dataSet = []
for (let i = 0; i < 15; i++) {
  function rndOf(...values) {
    return values[Math.floor(Math.random() * values.length)]
  }
  dataSet.push({
    channel: rndOf("broadcast", "room"),
    timestamp: 1494339200000 + 95713620000 * Math.random(),
    message: rndOf(
      "You've been eyeing me all day and waiting for your move like a lion stalking a gazelle in a savannah.",
      "Today arrived with a crash of my car through the garage door.",
      "Truth in advertising and dinosaurs with skateboards have much in common.",
      "They did nothing as the raccoon attacked the lady’s bag of food.",
      "Love is not like pizza.",
      "Had he known what was going to happen, he would have never stepped into the shower.",
      "Of course, she loves her pink bunny slippers.",
      "To the surprise of everyone, the Rapture happened yesterday but it didn't quite go as expected.",
      "He wondered if she would appreciate his toenail collection.",
      "He knew it was going to be a bad day when he saw mountain lions roaming the streets.",
      "It was always dangerous to drive with him since he insisted the safety cones were a slalom course.",
      "Today is the day I'll finally know what brick tastes like.",
      "He wondered if it could be called a beach if there was no sand.",
      "If eating three-egg omelets causes weight-gain, budgie eggs are a good substitute.",
      "As the years pass by, we all know owners look more and more like their dogs."
    )
  })
}

function prepareDataSet(channel) {
  return ListReducer.toList(
    dataSet
      .filter(m => m.channel === channel)
      .sort((m1, m2) => m2.timestamp - m1.timestamp)
      .slice(0, 5),
    { number: 0, size: 5 },
    [{ columnName: "message", operation: "contains", value: "" }],
    ["timestamp", "desc"]
  )
}

const initialState = Actions.WELCOME.instance({
  params: ["broadcast", ""],
  payload: {
    broadcast: [{}, prepareDataSet("broadcast")],
    room: [{}, prepareDataSet("room")]
  }
})

const rootReducer = combineReducers({
  [Actions.WELCOME.getReducerKey()]: accumulate(
    split(
      [Actions.WELCOME],
      DefaultReducer.instance(initialState, Actions.WELCOME),
      ListReducer.instance(initialState, Actions.WELCOME)
    )
  )
})

export default rootReducer
