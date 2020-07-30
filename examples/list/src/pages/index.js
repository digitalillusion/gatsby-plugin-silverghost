import React from "react"
import { graphql, Link, useStaticQuery } from "gatsby"

const IndexPage = () => {
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

  return (
    <div>
      <h1>{data.site.siteMetadata.title}</h1>
      <p>{data.site.siteMetadata.description}</p>
      <ul>
        <li>
          <Link to="/welcome#room">Go to room welcome messages</Link>
        </li>
        <li>
          <Link to="/welcome#broadcast/Today">
            Go to broadcast welcome messages searching for "Today"
          </Link>
        </li>
      </ul>
    </div>
  )
}

export default IndexPage
