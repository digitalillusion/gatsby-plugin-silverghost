import {
  makeAction,
  AbstractActions
} from "gatsby-plugin-silverghost/lib/actions"

const definitions = {
  WELCOME: makeAction("@@App/WELCOME", "welcome", "/:channel/:message", {
    channel: ["room", "broadcast"]
  })
}
export const Actions = AbstractActions.instance(definitions)
