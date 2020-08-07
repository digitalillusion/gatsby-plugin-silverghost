import { isObject } from "../functions";
import listReducer from "./ListReducer";

export class DefaultReducer {
  /**
   * @param initialState
   * @param actionDefinitions
   * @returns {Function} For the given action definitions, return the matching runtime action as-is or return the state otherwise
   */
  static instance(initialState, ...actionDefinitions) {
    return (state = initialState, action) => {
      let index = actionDefinitions
        .map(definition => definition.DATA)
        .indexOf(action.type);
      if (index >= 0) {
        action.definition = actionDefinitions[index];
        document.body.classList.remove("app-navigation");
        return action;
      }
      return state;
    };
  }
}

export class ErrorToConsoleReducer {
  /**
   * @returns {function(*=, *)} } For all ERROR action definitions, log the matching runtime action payload to browser console or return the state otherwise
   */
  static instance() {
    return (state = {}, action) => {
      if (action.type.endsWith("_ERROR")) {
        document.body.classList.remove("app-navigation");
        console.error(action.payload);
      }
      return state;
    };
  }
}

export const ListReducer = listReducer;

/**
 * Allow to run multiple reducers on an action having a single payload. The fist one performing a reduction stops the chain.
 * @param reducers The reducers to apply
 * @return {Function} The first reduction performed or the state if none is performed
 */
export const chain = (...reducers) => {
  return (state, action) => {
    for (let reducer of reducers) {
      let reduction = reducer(state, action);
      if (typeof reduction === "undefined") {
        continue;
      }
      return reduction;
    }
    return state;
  };
};

/**
 * Allow to run multiple reducers on an action having a multiple (Array) payload. Reducers are applied respectively to the payloads (first to first, second to second, etc.), so they must exist in equal number
 * @param actionDefinitions Restrict the match to the given action definitions (needed in order not to process single payloads which happen also to be an array)
 * @param reducers The reducers to apply
 * @return {Function} A reduction that combines eventual reduction performed by the activated reducers with the state returned by the reducers that were not activated, keeping the same order of the original multiple payload
 */
export const split = (actionDefinitions, ...reducers) => {
  return (state, action) => {
    let matchAction = actionDefinitions.find(
      definition =>
        definition.DATA === action.type || definition.REQUEST === action.type
    );
    action.definition = matchAction;
    let responses = action.payload;
    if (
      !matchAction ||
      (matchAction.DATA === action.type && responses.length !== reducers.length)
    ) {
      if (
        responses &&
        responses.length &&
        responses.length !== reducers.length &&
        matchAction
      ) {
        console.error(
          "Cannot reduce action: registered " +
            reducers.length +
            " reducers but receiving only " +
            responses.length +
            " responses in the action payload"
        );
      }
      if (typeof state === "undefined") {
        let combinedState = {};
        reducers.forEach(r => Object.assign(combinedState, r(state, action)));
        return combinedState;
      }
      return state;
    }

    let reduction = [];
    let states = Object.assign({}, state.payload);
    let statePayloads;
    if (Array.isArray(state.payload)) {
      statePayloads = [];
      state.payload.forEach(p => statePayloads.push(p));
    } else {
      statePayloads = Object.assign({}, state.payload);
    }

    for (let i = 0; i < responses.length; i++) {
      let currentState = statePayloads[i] ? statePayloads[i] : {};
      if (responses[i] == null) {
        reduction.push(currentState);
        continue;
      }
      action.payload = responses[i];
      state.payload = Object.assign({}, currentState);
      let job = reducers[i](state, action);
      if (job !== state) {
        reduction.push(job.payload);
      }
    }
    state.payload = states;

    if (!Object.keys(reduction).length) {
      return state;
    }
    action.payload = reduction;
    return action;
  };
};

function isSamePathgroup(
  definition,
  pathgroupParams,
  pathname,
  state,
  reduction
) {
  let reductionParams = reduction.params
    .filter(e => !pathgroupParams.includes(e))
    .map(e => "" + e);
  let stateParams = state.params
    ? state.params.filter(e => !pathgroupParams.includes(e)).map(e => "" + e)
    : [];

  let explicitParams = definition.getPathgroupParams(pathname, {
    includeExplicitParams: true,
    includeImplicitParams: false
  });
  // If action type and all pathgroup params are the same, accumulation is possible; else state is obsolete
  if (
    state.type === reduction.type &&
    reductionParams
      .slice(0, explicitParams.length)
      .every(e => stateParams.slice(0, explicitParams.length).includes("" + e))
  ) {
    return true;
  }
  return false;
}

/**
 * Allow to add to the previous state the result of a new reduction. The resulting payload will be stored under the same path as identified by the current action pathgroup
 * This allows to call the same action with different parameters and index the corresponding result in the state, useful for partial page re-rendering
 * NOTE: the function relies on the fact that the action has a reference to it's definition in the field action.definition; this is usually set but the upstream reducer
 *
 * @param reducer A reducer to apply. It is possible to use chain() or split() as reducer in order to further control the processing
 * @return {Function} A reduction that combines the previous state with the new reduction if activated or the state if the new reduction was not activated
 */
export const accumulate = reducer => {
  function cloneCursor(cursor, parent, parentParam) {
    if (parentParam == null) {
      return parent;
    }
    parent[parentParam] = Object.assign({}, cursor);
    return parent[parentParam];
  }

  return (state, action) => {
    let reduction = reducer(state, action);
    if (!action.definition || reduction === state) {
      return reduction;
    }

    let definition = action.definition;
    let pathname = definition.getPathname(action.params);
    let pathgroupParams = definition.getPathgroupParams(pathname, {
      params: action.params
    });

    let tree = isSamePathgroup(
      definition,
      pathgroupParams,
      pathname,
      state,
      reduction
    )
      ? Object.assign({}, state.payload)
      : {};

    let cursor = tree,
      parent = tree,
      parentParam = null;
    pathgroupParams.forEach((param, index) => {
      if (index === pathgroupParams.length - 1) {
        cursor = cloneCursor(cursor, parent, parentParam);
        cursor[param] = reduction.payload;
      } else if (!cursor[param]) {
        cursor[param] = {};
      }

      parent = cursor;
      parentParam = param;
      cursor = cursor[param];
    });
    action.payload = tree;

    return action;
  };
};

/**
 * Allow to collect single entries of an array, reduced subsequently, inside the same collection.
 * In order to be activated, the reduction result must have exactly one key. The key may be matched in the accumulated state using the action pathgroup
 * That key will be used to add (or overwrite) the result inside the collection maintained inside the previous state
 * NOTE: the function relies on the fact that the action has a reference to it's definition in the field action.definition; this is usually set but the upstream reducer
 *
 * @param reducer  A reducer to apply. It is possible to use chain() or split() as reducer in order to further control the processing
 * @return {Function} A reduction that combines the previous state with the new reduction if activated or the state if the new reduction was not activated
 */
export const collect = reducer => {
  return (state, action) => {
    let reduction = reducer(state, action);
    if (!action.definition || reduction === state) {
      return reduction;
    }

    let definition = action.definition;
    let pathname = definition.getPathname(action.params);
    let pathgroupParams = definition.getPathgroupParams(pathname, {
      params: action.params
    });
    let statePayload = Object.assign({}, state.payload);
    let reductionPayload = reduction.payload;

    let payload;
    if (pathgroupParams.length > 0) {
      // Attempt match accumulated state
      for (let i = 0; i < pathgroupParams.length; i++) {
        let param = pathgroupParams[i] || action.params[i];
        if (
          statePayload &&
          statePayload[param] &&
          reductionPayload &&
          reductionPayload[param]
        ) {
          statePayload = statePayload[param];
          reductionPayload = reductionPayload[param];
        } else {
          break;
        }
      }

      function collectHierarchy(statePayload, reductionPayload) {
        for (let collectKey of Object.keys(reductionPayload)) {
          if (
            statePayload &&
            statePayload[collectKey] &&
            reductionPayload &&
            reductionPayload[collectKey]
          ) {
            statePayload = statePayload[collectKey];
            reductionPayload = reductionPayload[collectKey];

            if (isObject(statePayload) && isObject(reductionPayload)) {
              let reductionKeys = Object.keys(reductionPayload);
              let stateKeys = Object.keys(statePayload);
              if (reductionKeys.every(v => stateKeys.includes(v))) {
                collectHierarchy(statePayload, reductionPayload);
              }
            }
          } else if (
            statePayload &&
            !statePayload[collectKey] &&
            reductionPayload &&
            reductionPayload[collectKey]
          ) {
            // Attempt to match accumulated state
            statePayload[collectKey] = reductionPayload[collectKey];
          }
        }

        if (isObject(statePayload) && isObject(reductionPayload)) {
          Object.assign(
            reductionPayload,
            statePayload,
            Object.assign({}, reductionPayload)
          );
        }
      }

      if (
        isSamePathgroup(
          definition,
          pathgroupParams,
          pathname,
          state,
          reduction
        ) &&
        isObject(statePayload) &&
        isObject(reductionPayload)
      ) {
        collectHierarchy(statePayload, reductionPayload);
        Object.keys(statePayload)
          .filter(k => !Object.keys(reductionPayload).includes(k))
          .forEach(k => (reductionPayload[k] = statePayload[k]));
      }
      payload = reduction.payload;
    } else {
      payload = Object.assign({}, statePayload, reductionPayload);
    }
    action.payload = payload;
    return action;
  };
};
