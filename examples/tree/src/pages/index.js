import React from "react"
import { graphql, useStaticQuery } from "gatsby"
import { NavigationBuilder } from "gatsby-plugin-silverghost/lib/components/NavigationBuilder"
import { useSelector, useStore } from "react-redux"
import { Actions } from "../actions/createActions"
import Layout from "../components/layout"

const IndexPage = () => {
  const store = useStore()
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
          description
        }
      }
    }
  `)

  const tree = useSelector(state => state.tree, [])
  let navigationBuilder = new NavigationBuilder(store)

  const treeBuilder = builder => {
    function createNodes(nodes, path = []) {
      for (const [key, node] of Object.entries(nodes)) {
        const nodePath = [...path, key]
        const { label, expanded, leaf, ...children } = node
        const properties = { label, expanded, leaf }
        if (!leaf) {
          builder
            .withBranch(key, properties)
            .onExpand(Actions.TREE, (action, input) => {
              action.params = [
                ...nodePath,
                {
                  event: input.target.properties.expanded
                    ? "collapse"
                    : "expand",
                  target: input.target,
                  children
                }
              ]
              return action
            })
          createNodes(children, nodePath)
          builder.endBranch()
        } else {
          builder.withSibling(key, properties)
        }
      }
      return builder
    }
    createNodes(tree.payload)
  }
  const navigation = navigationBuilder.withTree(treeBuilder).build()

  function drawLevel(nodes) {
    return (
      <ul>
        {(nodes || []).map(node => (
          <li
            key={node.id}
            onClick={target => navigation.nodeOnExpand(node, target)}
          >
            {
              <div>
                <span>{node.properties.label}</span>
                {node.properties.expanded && drawLevel(node.children)}
              </div>
            }
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Layout>
      <h1>{data.site.siteMetadata.title}</h1>
      <p>{data.site.siteMetadata.description}</p>
      <div>{drawLevel([...navigation.getTree()])}</div>
    </Layout>
  )
}

export default IndexPage
