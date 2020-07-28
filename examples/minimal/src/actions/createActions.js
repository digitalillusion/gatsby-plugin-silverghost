import {
  makeAction,
  AbstractActions
} from "gatsby-plugin-silverghost/lib/actions"

const definitions = {
  HOME_PAGE: makeAction("@@App/HOME_PAGE", "home", "/:section/:subsection", {
    section: ["home", "reference"],
    subsection: [
      ["presentation", "links"],
      ["store", "actions", "reducers"]
    ]
  })
}
export const Actions = AbstractActions.instance(definitions)
