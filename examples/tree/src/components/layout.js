import React, { useEffect } from "react"
import { useSelector, useStore } from "react-redux"
import { NavigationBuilder } from "gatsby-plugin-silverghost/lib/components/NavigationBuilder"
import { globalHistory } from "@reach/router"
import { Actions } from "../actions/createActions"
import { isEmpty } from "gatsby-plugin-silverghost/lib/functions"

function SessionButton({ onClick, label }) {
  return <button onClick={onClick}>{label}</button>
}

function Anonymous({ navigation }) {
  return (
    <div>
      <SessionButton
        onClick={_ => navigation.onEvent(Actions.SESSION)({ event: "login" })}
        label="Login"
      />
    </div>
  )
}

function Authenticated({ session, navigation, children }) {
  return (
    <div>
      <p>
        <SessionButton
          onClick={_ =>
            navigation.onEvent(Actions.SESSION)({ event: "logout" })
          }
          label="Logout"
        />
        <span> Logged in as {session.authentication.name}</span>
      </p>
      {children}
    </div>
  )
}

export default function Layout({ children }) {
  const store = useStore()
  const session = useSelector(state => state.session).payload
  const isAnonymous = isEmpty(session) || session.anonymous

  const navigation = new NavigationBuilder(store, globalHistory)
    .withEvent(Actions.SESSION, {
      mapper: (action, input) => (action.params = [input.target])
    })
    .build()

  useEffect(() => {
    if (isEmpty(session)) {
      navigation.onEvent(Actions.SESSION)({ event: "whois" })
    } else if (!session.anonymous) {
      navigation.refresh()
    }
  }, [isAnonymous, navigation, session])

  return isAnonymous ? (
    <Anonymous navigation={navigation} />
  ) : (
    <Authenticated session={session} navigation={navigation}>
      {children}
    </Authenticated>
  )
}
