import serializeJavascript from "serialize-javascript";
import { DEFAULT_SERIALIZE_OPTIONS } from "../constants";

export const flatMap = (xs, f) =>
  (xs || []).reduce((acc, x) => acc.concat(f(x)), []);


/**
 * @param o
 * @return {boolean|arg is Array<any>} True if the parameter is null, undefined, empty string,
 * empty array or empty object, false otherwise
 */
export const isEmpty = o => {
  let isEmptyArray = Array.isArray(o) && o.length === 0;
  let isEmptyObject = o === Object(o) && Object.keys(o).length === 0;
  return (
    o == null ||
    typeof o === "undefined" ||
    "" === o ||
    isEmptyArray ||
    isEmptyObject
  );
};

/**
 *
 * @param value
 * @return {*|boolean} true if value is an object
 */
export const isObject = value => {
  return value && typeof value === "object" && value.constructor === Object;
};

/**
 * Compares the JSOG (JavaScript Object Graph) stringification of the input parameters to determine if they are deeply equals
 * @param o1
 * @param o2
 * @param excluder a traversing function that returns whether to exclude from the comparison a specific object subgraph, or not
 * @return {boolean} True if the input parameters are deeply equal, false otherwise
 */
export const equalGraphs = (o1, o2, excluder) => {
  if (o1 === o2) {
    return true;
  }
  let serialized1 = serializeJavascript(o1, DEFAULT_SERIALIZE_OPTIONS);
  let serialized2 = serializeJavascript(o2, DEFAULT_SERIALIZE_OPTIONS);
  if (excluder) {
    traverse(serialized1, (obj, key) => {
      if (excluder(obj, key)) {
        delete obj[key];
      }
    });
    traverse(serialized2, (obj, key) => {
      if (excluder(obj, key)) {
        delete obj[key];
      }
    });
  }
  let graphEquality =
    JSON.stringify(serialized1) === JSON.stringify(serialized2);
  return graphEquality;
};

/**
 * Allow to traverse an object descending inside all its fields and applying a function on each of them, recursively
 * @param obj
 * @param fn
 * @param visited
 * @return {*} The input object after the given function was applied
 */
export const traverse = (obj, fn, visited = []) => {
  if (!isEmpty(obj) && !visited.includes(obj)) {
    visited.push(obj);
    let interrupted = false;
    Object.keys(obj).forEach(key => {
      if (interrupted) {
        return;
      }
      if (fn(obj, key) === false) {
        interrupted = true;
        return;
      }
      if (obj[key] instanceof Object && !visited.includes(obj[key])) {
        traverse(obj[key], fn, visited);
      } else if (Array.isArray(obj[key])) {
        for (let el of obj[key]) {
          if (!visited.includes(el)) {
            traverse(el, fn, visited);
          }
        }
      }
    });
  }
  return obj;
};

/**
 * @param obj
 * @return {string} The URI encoded version of the input parameter
 */
export const encodeURIComponentObject = function(obj) {
  let str = [];
  for (let p in obj) {
    if (obj.hasOwnProperty(p)) {
      if (Array.isArray(p)) {
        if (p.length > 0) {
          str.push(
            encodeURIComponent(p) + "=" + encodeURIComponent(obj[p].join(","))
          );
        }
      } else {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    }
  }
  const encoded = str.join("&");
  return encoded;
};
