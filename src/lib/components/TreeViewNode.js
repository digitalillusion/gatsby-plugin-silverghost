export class TreeViewNode {
  constructor(id) {
    this.id = id;
    this.onExpandActions = [];
    this.onSelectActions = [];
    this.children = [];
  }

  withNodeProperties(properties) {
    this.properties = Object.assign(
      {
        label: this.id,
        expanded: undefined
      },
      properties
    );
    return this;
  }

  withNodeOnExpand(onExpandAction) {
    if (
      onExpandAction &&
      !this.onExpandActions.find(
        a => a.action.TYPE === onExpandAction.action.TYPE
      )
    ) {
      this.onExpandActions.push(onExpandAction);
    }
    return this;
  }

  withNodeOnSelect(onSelectAction) {
    if (
      onSelectAction &&
      !this.onSelectActions.find(
        a => a.action.TYPE === onSelectAction.action.TYPE
      )
    ) {
      this.onSelectActions.push(onSelectAction);
    }
    return this;
  }

  withChildren(children, nodeCreationFunction = node => node) {
    if (children && children.length > 0) {
      children.forEach(child => {
        this.children.push(nodeCreationFunction(child));
      });
    }
    return this;
  }
}
