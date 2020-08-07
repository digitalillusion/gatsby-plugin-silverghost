import {AbstractActions, makeAction} from "gatsby-plugin-silverghost/lib/actions"

const definitions = {
  WELCOME: makeAction("@@App/WELCOME", "welcome", "/welcome/:channel/:query", {
    channel: ["room", "broadcast"]
  })
}
export const Actions = AbstractActions.instance(definitions)
