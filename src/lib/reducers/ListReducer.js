import { equalGraphs, flatMap } from "../functions";

export default class ListReducer {
  static instance(...actionDefinitions) {
    const reduction = (state, action) => {
      let reducedState = Object.assign({}, state);

      let collectKey = null;
      let actionPayload = action.payload;
      if (
        !Array.isArray(actionPayload) &&
        Object.keys(actionPayload).length === 1
      ) {
        collectKey = Object.keys(actionPayload)[0];
        actionPayload = actionPayload[collectKey];
      }
      if (!Array.isArray(actionPayload)) {
        throw "The action payload must be an array or an object with a single property where the key is the collect key and the value an array";
      }

      let reduced = {
        type: action.type,
        payload: { page: actionPayload, list: [] },
        pages: reducedState.pages || {},
        pagination: action.pagination || {},
        sorting: action.sorting || [null, ""],
        filter: action.filter || {},
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

    return (state = {}, action) => {
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
