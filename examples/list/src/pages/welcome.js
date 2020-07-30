import React from "react"
import { NavigationBuilder } from "gatsby-plugin-silverghost/lib/components/NavigationBuilder"
import { isEmpty } from "gatsby-plugin-silverghost/lib/functions"
import { globalHistory } from "@reach/router"

import {useSelector, useStore} from "react-redux";
import {Actions} from "../actions/createActions";
import {Link} from "gatsby";

const WelcomeMessage = () => {
    const store = useStore();
    const navigationBuilder = new NavigationBuilder(store, globalHistory);

    const welcome = useSelector(state => state.welcome, [])
    const channel = welcome.params[0]
    const message = welcome.payload[channel][0]
    const list = welcome.payload[channel][1]
    const query = isEmpty(welcome.params[1]) && list.psfState.filter.length > 0 ? list.psfState.filter[0].value : welcome.params[1]


    const navigation = navigationBuilder
        .withEvent(Actions.WELCOME, {
            mapper: (action, input) => {
                const event = input.target.event
                const target = input.target.target
                const formData = new FormData(target.currentTarget ? target.currentTarget : target)
                switch (event) {
                    case "change":
                        const message = formData.get("message");
                        Object.assign(action, {
                            params: [
                                channel,
                                query,
                                {
                                    event,
                                    timestamp: new Date(),
                                    message
                                }
                            ]
                        })
                        break
                    case "search":
                    default:
                        const newQuery = formData.get("query");
                        action.params = [channel, newQuery]
                        return Object.assign(action, {
                            params: [
                                channel,
                                newQuery,
                                {event}
                            ],
                            pagination: {number: formData.get("page") - 1},
                            filter: [{columnName: "message", value: newQuery, operation: "contains"}],
                            sorting: ["timestamp", formData.get("sort")]
                        })
                }

            }, ajax: true
        })
        .build()

    const isSortDesc = !list.psfState.sorting[0] || list.psfState.sorting[1] === "desc"
    return (
        <div>
            <h1>Messages on {channel}</h1>
            <form key={channel + "-change"} onSubmit={target => navigation.onEvent(Actions.WELCOME)({ event : "change", target })} autoComplete="off">
                <label htmlFor="message">Set message of the day: </label>
                <p>
                    <input name="message" type="text" />
                    <input type="submit" value="Send" />
                </p>
                <Link to="/">Go back to the homepage</Link>
            </form>
            <hr />
            <table>
                <tbody>
                {!isEmpty(message) && (
                    <tr>
                        <td>{message.timestamp.toString()}</td>
                        <td>{message.message}</td>
                    </tr>
                )}
                </tbody>
            </table>
            <hr />
            <form key={channel + "-search"} onSubmit={target => navigation.onEvent(Actions.WELCOME)({ event : "search", target })} autoComplete="off">
                <label htmlFor="query">Search a message: </label>
                <p>
                    <input key={query} name="query" type="text" defaultValue={query} />
                    <input type="submit" value="Search" />
                </p>
                <p>
                    <input type="radio" name="sort" value="desc" {...(isSortDesc ? { defaultChecked: true} : {})}
                           onChange={target => navigation.onEvent(Actions.WELCOME)({ event : "search", target: target.currentTarget.form })} />
                    <label htmlFor="channel">Recent first</label>
                    <input type="radio" name="sort" value="asc" {...(!isSortDesc ? { defaultChecked: true} : {})}
                           onChange={target => navigation.onEvent(Actions.WELCOME)({ event : "search", target: target.currentTarget.form })} />
                    <label htmlFor="channel">Oldest first</label>
                </p>
                {list.psfState && <p>
                    Page <input name="page" type="number" defaultValue={list.psfState.pagination.number + 1}
                                min={1} max={Math.ceil(list.psfState.pagination.totalElements/list.psfState.pagination.size)}
                                onChange={target => navigation.onEvent(Actions.WELCOME)({ event : "search", target: target.currentTarget.form })} />
                </p>}
                <table>
                    <tbody>
                    {list.page && list.page
                        .map((row, index) => (
                        <tr key={index}>
                            <td>{new Date(row.timestamp).toString()}</td>
                            <td>{row.message}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </form>
        </div>
    )
}

export default WelcomeMessage
