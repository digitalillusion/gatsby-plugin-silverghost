import { encodeURIComponentObject, isEmpty } from "../functions";
import { TreeViewNode } from "./TreeViewNode";

/**
 * Builds a tab/pane/tree/href navigation behaviour
 */
export class NavigationBuilder {
  static historyUnsubscribe = null;

  constructor(store, history = null, authorizations = null) {
    this.tabs = {};
    this.treeRoot = { children: [] };
    this.lastTab = null;
    this.hrefs = {};
    this.store = store;
    this.history = history;
    this.authorizations = authorizations;

    if (history) {
      const dispatchLocationChange = location => {
        this.store.dispatch({
          type: "@@router/LOCATION_CHANGE",
          payload: location
        });
      };
      this.refresh = function() {
        if (typeof window !== "undefined") {
          dispatchLocationChange({
            action: "PUSH",
            location: window.location
          });
        }
      };
      if (!NavigationBuilder.historyUnsubscribe) {
        NavigationBuilder.historyUnsubscribe = this.history.listen(location => {
          dispatchLocationChange(location);
        });
        this.refresh();
      }
    }
  }

  /**
   * Register a pane for navigation
   * @param name The name of the pane matching as needed to select the action pathgroup
   * @param properties 'title', etc...
   * @param actionDefinition The action to trigger on user interaction
   * @param options 'ajax', etc...
   * @param mapper The mapper for the parameters, pagination and filter to pass to the action
   * @returns {NavigationBuilder}
   */
  withPane(name, properties, actionDefinition, options = {}) {
    if (!this.tabs[this.lastTab].panes) {
      this.tabs[this.lastTab].panes = {};
    }
    this.tabs[this.lastTab].panes[name] = {
      name: name,
      tab: this.tabs[this.lastTab],
      properties: Object.assign(
        {
          weight: Object.keys(this.tabs[this.lastTab].panes).length,
          paneSelector: id => {
            if (id) {
              localStorage.setItem("NavigationBuilder.selectedPane", id);
            }
          }
        },
        properties
      ),
      action: actionDefinition,
      options: Object.assign(
        {
          ajax: true,
          mapper: (action, input) => (action.params = [input.tab, input.pane])
        },
        options
      )
    };
    return this;
  }

  /**
   * Register a tab for navigation
   * @param name The name of the tab matching as needed to select the action pathgroup
   * @param properties 'title', etc...
   * @param actionDefinition The action to trigger on user interaction
   * @param options ajax, mapper etc...
   * @returns {NavigationBuilder}
   */
  withTab(name, properties, actionDefinition, options = {}) {
    this.tabs[name] = {
      name: name,
      properties: properties,
      action: actionDefinition,
      options: Object.assign(
        {
          ajax: true,
          mapper: (action, input) => (action.params = [input.tab])
        },
        options
      )
    };
    this.lastTab = name;
    return this;
  }

  /**
   * Register the selected tab
   *
   * @param tab
   * @return {NavigationBuilder}
   */
  withSelectedTab(tab) {
    this.selectedTab = tab;
    return this;
  }

  /**
   * Register a link for navigation or a button click
   * @param action The action to trigger on user interaction
   * @param options ajax, mapper etc...
   * @returns {NavigationBuilder}
   */
  withEvent(action, options = {}) {
    this.hrefs[action.TYPE] = {
      action: action,
      options: Object.assign(
        {
          ajax: true,
          mapper: () => []
        },
        options
      )
    };
    return this;
  }

  /**
   * register a navigation tree
   * @param treeBuilderFunction
   * @return {TreeBuilder}
   */
  withTree(treeBuilderFunction) {
    let builder = this;

    function instanceNode(parentNode, id, properties) {
      let treeNode = new TreeViewNode(id);
      treeNode.withNodeProperties(properties);
      return treeNode;
    }

    class TreeBuilder {
      constructor(parentNode, parentBuilder, treeNode) {
        this.parentNode = parentNode;
        this.parentBuilder = parentBuilder;
        this.treeNode = treeNode;
      }

      withBranch(id, properties) {
        this.refreshNode(id, properties);
        return new TreeBuilder(this.treeNode, this, this.treeNode);
      }

      refreshNode(id, properties) {
        let existing = this.parentNode.children.find(c => c.id === id);
        if (existing) {
          this.treeNode = existing.withNodeProperties(properties);
        } else {
          this.treeNode = instanceNode(this.parentNode, id, properties);
          this.parentNode.children.push(this.treeNode);
        }
      }

      withSibling(id, properties) {
        this.refreshNode(id, properties);
        return this;
      }

      onExpand(action, mapper, ajax) {
        if (this.treeNode && action) {
          this.treeNode.withNodeOnExpand({
            action: action,
            options: {
              ajax: ajax,
              mapper: mapper
            }
          });
        }
        return this;
      }

      onSelect(action, mapper, ajax) {
        if (this.treeNode && action) {
          this.treeNode.withNodeOnSelect({
            action: action,
            options: {
              ajax: ajax,
              mapper: mapper
            }
          });
        }
        return this;
      }

      withSubTree(subTree) {
        this.parentNode.children = subTree;
      }

      endBranch() {
        return this.parentBuilder ? this.parentBuilder : this;
      }
    }

    class TreeBuilderMutator {
      constructor(treeBuilder) {
        this.treeBuilder = treeBuilder;
      }
      withBranch(id, properties) {
        this.treeBuilder = this.treeBuilder.withBranch(id, properties);
        return this;
      }

      withSibling(id, properties) {
        this.treeBuilder = this.treeBuilder.withSibling(id, properties);
        return this;
      }

      onExpand(action, mapper, ajax = true) {
        this.treeBuilder = this.treeBuilder.onExpand(action, mapper, ajax);
        return this;
      }

      onSelect(action, mapper, ajax = true) {
        this.treeBuilder = this.treeBuilder.onSelect(action, mapper, ajax);
        return this;
      }

      withSubTree(subTree) {
        this.treeBuilder = this.treeBuilder.withSubTree(subTree);
        return this;
      }

      endBranch() {
        this.treeBuilder = this.treeBuilder.endBranch();
        return this;
      }
    }

    let mutable = new TreeBuilder(builder.treeRoot);
    let mutator = new TreeBuilderMutator(mutable);
    treeBuilderFunction(mutator);

    return this;
  }

  /**
   * @returns {{getTree: (function(): []), tabSelector: tabSelector, getPaneProperties: (function(*): {}), paneOnEvent: paneOnEvent, onEvent: (function(...[*]): function(*=): Promise<unknown[]>), getTabProperties: (function(): {}), tabOnEvent: tabOnEvent}} The navigation object
   */
  build() {
    let builder = this;

    function performMapping(mapper, mappingContext, mapped = {}) {
      if (!mapper) {
        return [];
      }
      let res = mapper(mapped, mappingContext);
      Object.assign(mappingContext, mapped);
      return res;
    }

    function submitAction(context, mappingContext) {
      let {
        params = [],
        pagination = undefined,
        sorting = undefined,
        filter = undefined,
        exportData = undefined,
        ajax = true
      } = mappingContext;
      return new Promise(resolve => {
        let action = null;
        if (!context.action) {
          resolve(context, action);
        }

        if (ajax) {
          action = context.action.instance({
            type: "REQUEST",
            params: params,
            pagination: pagination,
            sorting: sorting,
            filter: filter,
            exportData: exportData,
            ajax: true
          });
        } else {
          let filterEncoding = {};
          if (Array.isArray(filter)) {
            filter.forEach(
              entry => (filterEncoding[entry.columnName] = entry.value)
            );
          } else {
            filterEncoding = Object.assign({}, filter);
          }
          let queryString = encodeURIComponentObject(
            Object.assign(
              {},
              pagination,
              sorting,
              filterEncoding,
              typeof exportData === "undefined"
                ? {}
                : { exportData: exportData }
            )
          );
          action = context.action.getPathname(params, queryString);
        }

        let unsubscribe = builder.store.subscribe(() => {
          document.body.classList.add("app-navigation");
          resolve(context, action);
          unsubscribe();
        });

        if (ajax || !builder.history) {
          builder.store.dispatch(action);
        } else {
          builder.store.dispatch(builder.history.push(action));
        }
      });
    }

    function onNodeInteraction(actions, node) {
      if (!actions) {
        return new Promise(resolve => resolve());
      }
      let promises = [];
      for (let action of actions) {
        let mappingContext = {
          props:
            builder.context && builder.context.props
              ? builder.context.props
              : {},
          tab: builder.selectedTab,
          pane: localStorage.getItem("NavigationBuilder.selectedPane"),
          ajax: action.options.ajax,
          target: node
        };
        performMapping(action.options.mapper, mappingContext, action.action);
        promises.push(submitAction(action, mappingContext));
      }
      return Promise.all(promises);
    }

    function getSelectedTab(lastSelectedTab) {
      if (lastSelectedTab) {
        builder.selectedTab = lastSelectedTab;
      }
      let tab;
      if (builder.selectedTab) {
        tab = builder.tabs[builder.selectedTab];
      } else if (!isEmpty(builder.tabs)) {
        [builder.selectedTab, tab] = Object.entries(builder.tabs)[0];
      }

      return tab;
    }

    function attemptPreventEventBubbling(target) {
      if (target.stopPropagation || target.preventDefault) {
        if (target.stopPropagation) {
          target.stopPropagation();
        }
        if (target.preventDefault) {
          target.preventDefault();
        }
      } else {
        Object.keys(target).forEach(prop => {
          if (target[prop].stopPropagation) {
            target[prop].stopPropagation();
          }
          if (target[prop].preventDefault) {
            target[prop].preventDefault();
          }
        });
      }
    }

    let navigation = {
      /**
       * Explicitely triggers a new action dispatch on the current location, so that reducers are applied again.
       * It may be useful after certain interdependent actions, like ACTION1 draws a page and afterward ACTION2 logs in, which would
       * need in turn a refresh of the navigation in order that ACTION1 draws the page again.
       */
      refresh: () => {
        builder.refresh();
      },
      /**
       * @returns {Array} The properties used to render panes
       */
      getPaneProperties: tab => {
        let properties = {};
        let panes = builder.tabs[tab].panes;
        if (builder.authorizations) {
          panes = {};
          Object.entries(builder.tabs[tab].panes).forEach(([name, pane]) => {
            let anyAuthorizationMatches = Array.isArray(pane.properties.auth)
              ? pane.properties.auth.reduce((acc, val) => {
                  acc |= !!builder.authorizations[val];
                  return acc;
                }, false)
              : isEmpty(pane.properties.auth) ||
                !!builder.authorizations[pane.properties.auth];
            if (anyAuthorizationMatches) {
              panes[name] = pane;
            }
          });
        }
        if (panes) {
          for (let name of Object.keys(panes)) {
            properties[name] = panes[name].properties;
          }
        }
        return properties;
      },

      /**
       * @returns {Array} The properties used to render tabs
       */
      getTabProperties: () => {
        let properties = {};
        for (let name of Object.keys(builder.tabs)) {
          let paneProperties = navigation.getPaneProperties(name);
          if (!isEmpty(paneProperties)) {
            properties[name] = builder.tabs[name].properties;
          }
        }
        return properties;
      },

      /**
       *
       * @return {*} The tab selector
       */
      tabSelector: lastSelectedTab => {
        let selectedTab = getSelectedTab(lastSelectedTab);
        let tabProperties = navigation.getTabProperties();
        if (isEmpty(selectedTab) || isEmpty(tabProperties[selectedTab.name])) {
          builder.selectedTab = Object.keys(tabProperties)[0];
          return builder.selectedTab;
        }
        return selectedTab.name;
      },

      /**
       * @returns {Object} The tree
       */
      getTree: () => {
        return builder.treeRoot.children;
      },

      /**
       *  The handler of a pane open/close user interaction
       *
       * @param name The name of the pane
       * @param expanded Whether the pane is expanded or collapsed (Default: true)
       * @param rendered Whether the pane is already rendered or not (Default: false)
       * @return {*}
       */
      paneOnEvent: (name, expanded = true, rendered = false) => {
        let tab = getSelectedTab();
        let pane = tab.panes[name];
        let hasPersistentRender = pane && pane.options.ajax && rendered;
        if (!pane || !expanded || hasPersistentRender) {
          return new Promise(resolve => resolve());
        }
        localStorage.setItem("NavigationBuilder.selectedPane", name);
        let mappingContext = {
          props:
            builder.context && builder.context.props
              ? builder.context.props
              : {},
          tab: builder.selectedTab,
          pane: name,
          ajax: pane.options.ajax
        };
        performMapping(pane.options.mapper, mappingContext);
        return submitAction(pane, mappingContext);
      },

      /**
       * The handler of a tab select user interaction
       */
      tabOnEvent: function(name, rendered) {
        builder.selectedTab = name;
        localStorage.setItem("NavigationBuilder.selectedTab", name);
        let hasPersistentRender = builder.tabs[name].options.ajax && rendered;
        if (hasPersistentRender) {
          return new Promise(resolve => resolve());
        }
        let panes = builder.tabs[name].panes;
        let tabPanes = panes ? Object.keys(panes) : [];
        let storedSelectedPane = localStorage.getItem(
          "NavigationBuilder.selectedPane"
        );
        builder.selectedPane = tabPanes.includes(storedSelectedPane)
          ? storedSelectedPane
          : !isEmpty(tabPanes)
          ? tabPanes[0]
          : undefined;
        let mappingContext = {
          props:
            builder.context && builder.context.props
              ? builder.context.props
              : {},
          tab: name,
          pane: builder.selectedPane,
          ajax: builder.tabs[name].options.ajax
        };
        builder.selectedPane = mappingContext.pane;
        performMapping(builder.tabs[name].options.mapper, mappingContext);
        return submitAction(builder.tabs[name], mappingContext);
      },

      /**
       * The handler of a user interaction with a navigation link or a button
       */
      onEvent: (...actions) => {
        return target => {
          let promises = [];
          for (let action of actions) {
            let href = builder.hrefs[action.TYPE];
            if (!href) {
              promises.push(new Promise(resolve => resolve()));
              break;
            }

            let mappingContext = {
              props:
                builder.context && builder.context.props
                  ? builder.context.props
                  : {},
              tab: builder.selectedTab,
              pane: localStorage.getItem("NavigationBuilder.selectedPane"),
              target: target,
              pagination: target.pagination,
              sorting: target.sorting,
              filter: target.filter,
              exportData: target.exportData,
              ajax: href.options.ajax
            };
            let res = performMapping(href.options.mapper, mappingContext);

            if (mappingContext.ajax) {
              attemptPreventEventBubbling(target);
            }

            if (res !== false) {
              promises.push(submitAction(href, mappingContext));
            }
          }
          return Promise.all(promises);
        };
      },
      nodeOnSelect: (node, target) => {
        attemptPreventEventBubbling(target);
        return onNodeInteraction(node.onSelectActions, node);
      },
      nodeOnExpand: (node, target) => {
        attemptPreventEventBubbling(target);
        return onNodeInteraction(node.onExpandActions, node);
      }
    };

    return navigation;
  }
}
