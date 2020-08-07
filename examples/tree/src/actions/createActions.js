import {
  AbstractActions,
  makeAction
} from "gatsby-plugin-silverghost/lib/actions"

const definitions = {
  SESSION: makeAction("@@App/SESSION", "session"),
  TREE: makeAction("@@App/TREE", "tree", "/tree/:level0/:level1/:level2", {
    level0: [],
    level1: [[]],
    level2: [[[]]]
  })
}
export const Actions = AbstractActions.instance(definitions)
