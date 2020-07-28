import { isEmpty } from "../functions";

/**
 * Instantiate a new applcation action definition, called to add static members to the Action class
 *
 * @param actionName The action name, CAPITAL_UNDERSCORE_CASE prepended with @@App/ as convention
 * @param pathname An unique key used in the redux state store
 * @param pathname The pathname this action replies to; it can include path parameters in any part, prepended by colon (:)
 * @param pathgroups The possible values for the path parameters, given as an array of { pathGroupKey : [ ...parameterValues ] }
 * @returns {*} The action definition
 */
export function makeAction(actionName, reducerKey, pathname, pathgroups) {
  let definition = {
    TYPE: actionName,
    PATHNAME: pathname,
    REQUEST: actionName + "_REQUEST",
    DATA: actionName + "_DATA",
    ERROR: actionName + "_ERROR",
    pathgroups: pathgroups || {},

    /**
     * @returns {*} An unique key used in the redux state store
     */
    getReducerKey: () => {
      return reducerKey;
    },

    /**
     * Used to dispatch a location change
     * It will fill the pathname parameters and append the ones in excess as queryString
     *
     * @param params parameters for the pathname and for the redux service
     * @param queryString Initial query string to append to the constructed pathname
     * @returns {*} The action pathname where the parameter parts were replaced with the given parameters
     */
    getPathname: (params = [], queryString = "") => {
      let url = "";
      if (definition.PATHNAME) {
        let paramIndex = 0;
        definition.PATHNAME.split("/").forEach(part => {
          let urlPart;
          let param = params[paramIndex];
          if (typeof param !== "undefined") {
            urlPart = "" + (part.startsWith(":") ? params[paramIndex++] : part);
          } else if (!part.startsWith(":")) {
            urlPart = "" + part;
          }
          if (urlPart) {
            url += "/" + urlPart;
          }
        });

        for (let i = paramIndex; i < params.length; i++) {
          queryString += queryString !== "" ? "&" : params[i];
        }
      }
      if (queryString !== "" && queryString.indexOf("?") !== 0) {
        queryString = "?" + queryString;
      }
      return url + queryString;
    },

    /**
     * Used to create a route
     *
     * @param queryParams Action parameters in excess with respect to pathname parameters, append as queryString
     * @returns {*} The path for the router
     */
    getRoutePath: queryParams => {
      let queryString = "";
      if (queryParams) {
        for (let queryParam of queryParams) {
          queryString += queryString !== "" ? "&" : "?" + queryParam;
        }
      }

      if (!definition.pathgroups) {
        if (typeof definition.PATHNAME !== "undefined") {
          return definition.PATHNAME + queryString;
        }
        return definition.PATHNAME;
      }
      let definitionPathParts = splitPathnameParts(definition.PATHNAME);
      let implicitParamsCount = Object.keys(definition.pathgroups).length;

      let paramsCount = 0;
      for (let part of definitionPathParts) {
        if (part.startsWith(":")) {
          paramsCount++;
        }
      }
      let lastDefinitionIndex = definitionPathParts.indexOf(
        definitionPathParts
          .slice(0)
          .reverse()
          .find(e => !e.startsWith(":"))
      );

      let routePath = "";
      let explicitParamsCount = 0;
      let partsCount = 0;
      do {
        let part = definitionPathParts[partsCount++];
        if (!part) {
          continue;
        }
        if (part.startsWith(":")) {
          explicitParamsCount++;
        }
        routePath += "/" + part;
      } while (
        partsCount < lastDefinitionIndex + 1 ||
        explicitParamsCount < paramsCount - implicitParamsCount
      );

      return routePath + queryString;
    },

    /**
     * Used to correctly construct an action
     *
     * @param params parameters for the pathname and for the redux service
     * @param pagination pagination state of result list
     * @param sorting sorting state of result list
     * @param filter filter state of result list
     * @returns {{type: string|*, params: *[], payload: {pathname: *|}}} Use this definition to generate a REQUEST action with the pathname modified by getPathname
     */
    instance: properties => {
      let type;
      switch (properties.type) {
        case "REQUEST":
          type = definition.REQUEST;
          break;
        default:
          type = definition.DATA;
      }
      if (typeof properties.params === "undefined") {
        console.error(
          "No parameters specified for the action " +
            type +
            '. If you intend to use no parameters, please set an empty array as value for the "params" field'
        );
      }
      properties.pagination = properties.pagination || {};
      let actionInstance = {
        type: type,
        params: properties.params,
        pagination: {
          number: properties.pagination.number,
          size: properties.pagination.size,
          totalElements: properties.pagination.totalElements
        },
        sorting: properties.sorting,
        filter: properties.filter,
        payload:
          typeof properties.payload === "undefined"
            ? { location: { pathname: pathname } }
            : properties.payload,
        exportData: properties.exportData
      };
      return actionInstance;
    },

    /**
     * Analog to instance() but takes a previous action to propagate (typically a request)
     * just after setting the required changed properties (typically a data payload)
     *
     * @param previous
     * @param properties
     */
    propagate: (previous, properties) => {
      return definition.instance(
        Object.assign(
          {
            payload: previous.payload,
            params: previous.params || [],
            pagination: previous.pagination,
            sorting: previous.sorting,
            filter: previous.filter,
            exportData: previous.exportData
          },
          properties
        )
      );
    },

    /**
     * @param pathname the pathname to match
     * @returns {boolean} True if this action definition matches the pathname, false otherwise
     */
    isMatching(pathname) {
      if (!definition.PATHNAME) {
        return false;
      }
      let definitionPathParts = splitPathnameParts(definition.PATHNAME);
      let actionPathParts = splitPathnameParts(pathname);

      let lastDefinitionIndex = definitionPathParts.indexOf(
        definitionPathParts
          .slice(0)
          .reverse()
          .find(e => !e.startsWith(":"))
      );
      let matched = false;
      if (actionPathParts.length >= 0) {
        let implicitParamsCount = definition.pathgroups
          ? Object.keys(definition.pathgroups).length
          : 0;
        let isAllParametersSpecifiedExceptImplictOnes =
          definitionPathParts.length - implicitParamsCount <=
            actionPathParts.length &&
          definitionPathParts.length + implicitParamsCount >=
            actionPathParts.length;
        matched =
          definitionPathParts.length === actionPathParts.length ||
          isAllParametersSpecifiedExceptImplictOnes;
      }
      for (
        let i = 0;
        i < Math.max(lastDefinitionIndex + 1, actionPathParts.length) &&
        matched;
        i++
      ) {
        matched &=
          !isEmpty(definitionPathParts[i]) &&
          (definitionPathParts[i].startsWith(":") ||
            definitionPathParts[i] === actionPathParts[i]);
      }
      return matched;
    },

    /**e
     * Starting from a partial pathname returns the group of implicit or explicit parameters that identifies a path according to this definition
     * (eg: given locations/123 the explicit params are [123] and the implicit params are [view, properties] are for a definition having pathname locations/:id/:tab/:pane)
     * @param pathname The pathname to consider
     * @param includeExplicitParams True to return explicit parameters as well, false by default
     * @param includeImplicitParams True to return implicit parameters, default behavior
     * @param failOnMismatch True to throw exception when any path group parameter is not one of the corresponding definition
     * @returns {Array} The current path implicit parameters according to a matched group
     */
    getPathgroupParams(
      pathname,
      includeExplicitParams = false,
      includeImplicitParams = true,
      failOnMismatch = false
    ) {
      let definitionPathParts = splitPathnameParts(definition.PATHNAME);
      let actionPathParts = splitPathnameParts(pathname);

      let allParams = [];

      let tree = [];
      for (let i = 0; i < definitionPathParts.length; i++) {
        if (definitionPathParts[i].substring(0, 1) !== ":") {
          continue;
        }
        let pathGroupKey = definitionPathParts[i].substring(1);
        if (definition.pathgroups[pathGroupKey]) {
          if (!includeImplicitParams) {
            continue;
          }
          let value = definition.pathgroups[pathGroupKey];
          if (Array.isArray(value)) {
            for (let depth = 0; depth < tree.length; depth++) {
              value = value[tree[depth]];
            }
            if (!Array.isArray(value)) {
              throw {
                msg:
                  'Expected array but received string "' +
                  value +
                  '" on key "' +
                  pathGroupKey +
                  '"',
                code: "PGP_INVALID_DEF"
              };
            }
            if (actionPathParts[i] && value.includes(actionPathParts[i])) {
              tree.push(value.indexOf(actionPathParts[i]));
              value = actionPathParts[i];
            } else {
              if (typeof actionPathParts[i] !== "undefined") {
                let errMismatch =
                  "Path group parameter " +
                  actionPathParts[i] +
                  " not defined for " +
                  definition.TYPE;
                if (failOnMismatch) {
                  throw { msg: errMismatch, code: "PGP_MISMATCH" };
                } else {
                  console.debug(errMismatch + "; defaulting to " + value[0]);
                }
              }
              tree.push(0);
              value = value[0];
            }
          }
          allParams.push(value);
        } else if (includeExplicitParams && actionPathParts[i]) {
          allParams.push(actionPathParts[i]);
        }
      }
      return allParams;
    }
  };
  return definition;
}

function splitPathnameParts(pathname) {
  if (!pathname) {
    return [];
  }
  let parts = pathname.split(/[/#?]/).filter(part => part !== "");
  return parts;
}

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
