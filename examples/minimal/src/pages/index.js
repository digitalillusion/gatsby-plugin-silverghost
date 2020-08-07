import React from "react"
import { NavigationBuilder } from "gatsby-plugin-silverghost/lib/components/NavigationBuilder"
import { isEmpty } from "gatsby-plugin-silverghost/lib/functions"
import { useSelector, useStore } from "react-redux"
import { Actions } from "../actions/createActions"
import { graphql, useStaticQuery } from "gatsby"

const WelcomeMessage = () => {
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

  const store = useStore()
  const welcome = useSelector(state => state.welcome, [])
  const channel = welcome.params[0]

  const navigation = new NavigationBuilder(store)
    .withEvent(Actions.WELCOME, {
      mapper: (action, input) => {
        const event = input.target.event
        const target = input.target.target
        switch (event) {
          case "change":
            return Object.assign(action, {
              params: [target.currentTarget.value, { event }]
            })
          case "submit":
          default:
            const formData = new FormData(target.currentTarget)
            return Object.assign(action, {
              params: [
                formData.get("channel"),
                {
                  event,
                  timestamp: new Date(),
                  message: formData.get("message")
                }
              ]
            })
        }
      }
    })
    .build()

  const isRoomChannel = channel === "room"
  return (
    <div>
      <h1>{data.site.siteMetadata.title}</h1>
      <p>{data.site.siteMetadata.description}</p>
      <form
        key={channel}
        onSubmit={target =>
          navigation.onEvent(Actions.WELCOME)({ event: "submit", target })
        }
        autoComplete="off"
      >
        <label htmlFor="message">Set message of the day: </label>
        <p>
          <input
            type="radio"
            name="channel"
            value="room"
            {...(isRoomChannel ? { defaultChecked: true } : {})}
            onChange={target =>
              navigation.onEvent(Actions.WELCOME)({ event: "change", target })
            }
          />
          <label htmlFor="channel">Room</label>
          <input
            type="radio"
            name="channel"
            value="broadcast"
            {...(!isRoomChannel ? { defaultChecked: true } : {})}
            onChange={target =>
              navigation.onEvent(Actions.WELCOME)({ event: "change", target })
            }
          />
          <label htmlFor="channel">Broadcast</label>
        </p>
        <p>
          <input
            id="message"
            name="message"
            type="text"
            defaultValue={welcome.payload[channel].message}
          />
          <input type="submit" value="Send" />
        </p>
      </form>
      <hr />
      <h3>Room Message</h3>
      <table>
        <tbody>
          {!isEmpty(welcome.payload.room.message) && (
            <tr>
              <td>{welcome.payload.room.timestamp.toString()}</td>
              <td>{welcome.payload.room.message}</td>
            </tr>
          )}
        </tbody>
      </table>
      <h3>Broadcast Message</h3>
      <table>
        <tbody>
          {!isEmpty(welcome.payload.broadcast.message) && (
            <tr>
              <td>{welcome.payload.broadcast.timestamp.toString()}</td>
              <td>{welcome.payload.broadcast.message}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default WelcomeMessage
