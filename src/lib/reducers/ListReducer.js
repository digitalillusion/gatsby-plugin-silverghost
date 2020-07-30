import { equalGraphs, flatMap } from "../functions";

export default class ListReducer {
  /**
   * Return a list out of an array, useful for initializing inital state
   * @param array
   * @returns {Object} A reduced list of the array
   */
  static toList(
    array,
    pagination = { number: 0, size: 10 },
    filter = [],
    sorting = [null, ""]
  ) {
    pagination.totalElements = array.length;
    return {
      page: array,
      list: array,
      nextPage: {
        number: null,
        timestamp: new Date().getTime()
      },
      psfState: {
        pagination: pagination,
        filter: Array.isArray(filter) ? filter : [filter],
        sorting: sorting
      }
    };
  }
  /**
   * @param initialState
   * @param actionDefinitions
   * @returns {Function} For the given action definitions, return the welcome reduction or return the initialstate otherwise
   */
  static instance(initialState, ...actionDefinitions) {
    const reduction = (state, action) => {
      let reducedState = Object.assign({}, state);

      let collectKey = null;
      let actionPayload = action.payload;
      let psfState = action.payload.psfState || {};
      if (
        !Array.isArray(actionPayload) &&
        Object.keys(actionPayload).length === 1
      ) {
        collectKey = Object.keys(actionPayload)[0];
        actionPayload = actionPayload[collectKey];
      }
      if (
        !Array.isArray(actionPayload) &&
        actionPayload.page &&
        actionPayload.list &&
        actionPayload.psfState &&
        actionPayload.nextPage
      ) {
        actionPayload = actionPayload.page;
      }

      if (!Array.isArray(actionPayload)) {
        throw "The action payload must be a ListReducer result, an array or an object with a single property where the key is the collect key and the value an array";
      }

      let reduced = {
        type: action.type,
        payload: { page: actionPayload, list: [] },
        pages: reducedState.pages || {},
        pagination:
          typeof action.pagination.number != "undefined" &&
          typeof action.pagination.size != "undefined" &&
          typeof action.pagination.totalElements != "undefined"
            ? action.pagination
            : typeof psfState.pagination.number != "undefined" &&
              typeof psfState.pagination.size != "undefined" &&
              typeof psfState.pagination.totalElements != "undefined"
            ? psfState.pagination
            : {},
        sorting: action.sorting || psfState.sorting || [null, ""],
        filter: action.filter || psfState.filter || [],
        params: action.params
      };

      if (action.exportData) {
        let from =
          reducedState.pagination.number * reducedState.pagination.size;
        let to =
          (reducedState.pagination.number + 1) * reducedState.pagination.size;
        let sliced = actionPayload.slice(from, to);
        Object.assign(reducedState, {
          payload: { page: sliced, list: sliced, exportData: actionPayload }
        });
        return reducedState;
      } else if (actionPayload && reducedState.payload) {
        if (
          !reducedState.pagination ||
          action.pagination.size !== reducedState.pagination.size ||
          !equalGraphs(action.sorting, reducedState.sorting) ||
          !equalGraphs(action.filter, reducedState.filter)
        ) {
          reduced.pages = {};
        }

        if (!Object.keys(reduced.pages).includes(action.pagination.number)) {
          reduced.pages[action.pagination.number] = [];
          for (let entry of actionPayload) {
            reduced.pages[action.pagination.number].push(entry);
          }
        } else {
          reduced.payload.page = reducedState.pages[action.pagination.number];
        }
      } else {
        reduced.pages[action.pagination.number] = [];
        for (let entry of actionPayload) {
          reduced.pages[reduced.pagination.number].push(entry);
        }
      }

      reduced.payload.list = flatMap(
        Object.values(reduced.pages),
        page => page
      );
      reduced.payload.nextPage = {
        number: null,
        timestamp: new Date().getTime()
      };
      reduced.payload.psfState = {
        pagination: reduced.pagination,
        filter: reduced.filter,
        sorting: reduced.sorting
      };
      for (
        let i = 0;
        reduced.payload.nextPage.number === null &&
        i < action.pagination.totalElements / action.pagination.size;
        i++
      ) {
        if (!reduced.pages[i]) {
          reduced.payload.nextPage.number = i;
        }
      }
      if (collectKey) {
        reduced.payload = { [collectKey]: reduced.payload };
      }
      return reduced;
    };

    return (state = initialState, action) => {
      let index = actionDefinitions
        .map(definition => definition.DATA)
        .indexOf(action.type);
      if (index >= 0) {
        action.definition = actionDefinitions[index];
        document.body.classList.remove("app-navigation");
        return reduction(state, action);
      } else {
        return state;
      }
    };
  }
}
