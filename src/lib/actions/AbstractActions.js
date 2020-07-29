import { isEmpty } from "../functions";

function matchByPathname(pathname, definitions) {
  for (let definition of definitions) {
    if (definition.isMatching(pathname)) {
      try {
        definition.getPathgroupParams(pathname, true, true, true);
        return definition;
      } catch (e) {
        if (e.code !== "PGP_MISMATCH") {
          console.error(e.msg);
        }
        continue;
      }
    }
  }
}

function matchByType(type, definitions) {
  for (let definition of definitions) {
    if (type === definition.REQUEST || type === definition.DATA) {
      return definition;
    }
  }
}

export function splitPathnameParts(pathname) {
  if (!pathname) {
    return [];
  }
  let parts = pathname.split(/[/#?]/).filter(part => part !== "");
  return parts;
}

/**
 * Contains common Actions behavior
 */
export class AbstractActions {
  static definitions = {};

  static instance(definitions) {
    AbstractActions.definitions = Object.values(definitions);
    Object.assign(AbstractActions, definitions);
    return AbstractActions;
  }

  /**
   * @returns {any[]} All action definitions
   */
  static getDefinitions = () => {
    return AbstractActions.definitions;
  };

  /**
   * @param action
   * @returns {*|undefined} The definition from which the given action was created
   */
  static getDefinition = action => {
    let definition;
    if (isEmpty(action)) {
      return undefined;
    }
    if (
      action.type &&
      (definition = matchByType(action.type, AbstractActions.definitions))
    ) {
      return definition;
    }
    if (
      action.payload.location.pathname &&
      (definition = matchByPathname(
        action.payload.location.pathname,
        AbstractActions.definitions
      ))
    ) {
      return definition;
    }
    return definition;
  };

  /**
   * Used to reroute ReactJS router redux LOCATION_CHANGE actions toward the appropriate middleware
   * @param action
   * @returns {*} The same action transformed into a REQUEST according to the definition matched by pathname
   */
  static match = action => {
    let matching = {};
    Object.entries(action).forEach(([k, v]) => (matching[k] = v));
    if (action.type === "@@router/LOCATION_CHANGE") {
      let matched = AbstractActions.getDefinition(action);

      if (matched) {
        matching.type = matched.REQUEST;
      }
    }
    return matching;
  };

  /**
   * @param action
   * @returns {Array} The parametrs of the action defined in the payload or in the window location
   */
  static getParams = action => {
    if (!action) {
      return [];
    }
    let definition = action.type
      ? matchByType(action.type, AbstractActions.definitions)
      : action.payload
      ? matchByPathname(
          action.payload.location.pathname,
          AbstractActions.definitions
        )
      : undefined;
    let params = [];
    if (!definition) {
      return [];
    } else if (action.params) {
      params = action.params;
    } else {
      params = definition.getPathgroupParams(
        window.location.pathname + window.location.hash,
        true
      );
    }

    if (
      action.payload &&
      action.payload.location &&
      action.payload.location.search
    ) {
      let queryParams = action.payload.location.search.substring(1).split("&");
      for (let i = 0; i < queryParams.length; i++) {
        if (queryParams[i] !== "") {
          params.push(queryParams[i]);
        }
      }
    }

    return params;
  };

  /**
   * @param action
   * @param pathgroupKey
   * @param routerPathname
   * @returns {*|null} Return the current parameter of the action according to the given pathGroupKey
   */
  static extractParam = (action, pathgroupKey, routerPathname) => {
    let params = AbstractActions.getParams(action);
    if (!params || !params.length) {
      return null;
    }
    let definition = AbstractActions.getDefinition(action);
    let pathname = definition.getPathname(params);

    let defGroupParams = definition.getPathgroupParams(pathname, true, true);
    let queryParams = params.slice(defGroupParams.length, params.length);
    let groupParams = routerPathname
      ? splitPathnameParts(routerPathname)
      : defGroupParams;
    let allParams = groupParams.concat(queryParams);

    let paramIndex = splitPathnameParts(definition.PATHNAME)
      .filter(part => part.startsWith(":"))
      .map((part, index) => {
        if (":" + pathgroupKey === part) {
          return index;
        }
        return null;
      })
      .find(item => item != null);
    return allParams[paramIndex];
  };
}
