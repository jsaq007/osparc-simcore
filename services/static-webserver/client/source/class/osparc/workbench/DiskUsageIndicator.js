/* ************************************************************************

   osparc - the simcore frontend

   https://osparc.io

   Copyright:
     2020 IT'IS Foundation, https://itis.swiss

   License:
     MIT: https://opensource.org/licenses/MIT

   Authors:
     * Odei Maiz (odeimaiz)

************************************************************************ */

/**
 * Widget that shows an image well centered and scaled.
 * | _________________________________ |
 * | XXXXXXXXXXXX______ X GB__________ |
 * |___________________________________|
 */
qx.Class.define("osparc.workbench.DiskUsageIndicator", {
  extend: qx.ui.core.Widget,

  construct: function() {
    this.base(arguments);
    const lowDiskSpacePreferencesSettings = osparc.Preferences.getInstance();
    lowDiskSpacePreferencesSettings.addListener("changeLowDiskSpaceThreshold", () => this.__updateDiskIndicator());
    this.__lowDiskThreshold = lowDiskSpacePreferencesSettings.getLowDiskSpaceThreshold();
    this.__prevDiskUsageStateList = [];
    const layout = this.__layout = new qx.ui.layout.VBox(2);
    const testIndicator = this.__indicator = new qx.ui.container.Composite(
      new qx.ui.layout.VBox().set({
        alignY: "middle",
        alignX: "center"
      })
    ).set({
      decorator: "indicator-border",
      padding: [2, 10],
      margin: 4,
      alignY: "middle",
      allowShrinkX: false,
      allowShrinkY: false,
      allowGrowX: true,
      allowGrowY: false,
      toolTipText: this.tr("Disk usage"),
      visibility: "excluded"
    });
    const label = this.__label = new qx.ui.basic.Label().set({
      value: "5GB",
      font: "text-13",
      textColor: "contrasted-text-light",
      alignX: "center",
      alignY: "middle",
      rich: false
    })
    // eslint-disable-next-line no-underscore-dangle
    testIndicator._add(label);
    this.__buildLayout();

    // layout.add(indicator, 0, {
    //   flex: 1
    // });
    this._setLayout(layout);
    // this._applyCurrentNode(this.getCurrentNode());


    this.addListener("changeSelectedNode", e => this.__applyCurrentNode(e.getData()), this);
    // Subscribe to node selection changes
    this.addListener("changeCurrentNode", e => this.__applyCurrentNode(e.getData()), this);
  },

  properties: {
    currentNode: {
      check: "osparc.data.model.Node",
      init: null,
      nullable: true,
      event: "changeCurrentNode",
      apply: "__applyCurrentNode",
    },
    selectedNode: {
      check: "osparc.data.model.Node",
      init: null,
      nullable: true,
      event: "changeSelectedNode",
      apply: "__applyCurrentNode",
    }
  },

  members: {
    __indicator: null,
    __label: null,
    __lowDiskThreshold: null,
    __prevDiskUsageStateList: null,
    __lastDiskUsage: null,

    __buildLayout: function() {
      const testIndicator = this.__indicator;
      this._add(testIndicator);
    },

    _createChildControlImpl: function(id) {
      let control;
      switch (id) {
        case "disk-indicator": {
          control = new qx.ui.container.Composite(
            new qx.ui.layout.VBox().set({
              alignY: "middle",
              alignX: "center"
            })
          ).set({
            decorator: "indicator-border",
            padding: [2, 10],
            margin: 4,
            alignY: "middle",
            allowShrinkX: false,
            allowShrinkY: false,
            allowGrowX: true,
            allowGrowY: false,
            toolTipText: this.tr("Disk usage"),
            // visibility: "excluded"
          });
          this._add(control)
          break;
        }
        case "disk-indicator-label": {
          const indicator = this.getChildControl("disk-indicator")
          control = new qx.ui.basic.Label().set({
            value: "",
            font: "text-13",
            textColor: "contrasted-text-light",
            alignX: "center",
            alignY: "middle",
            rich: false
          })
          indicator.add(control);
          break;
        }
      }
      return control || this.base(arguments, id);
    },

    __applyCurrentNode: function(node, prevNode) {
      console.log("_applyCurrentNode", "node", node, "prevNode", prevNode)
      // Unsubscribe from previous node's disk usage data
      // const previousNode = this.getCurrentNode();
      // const previousSelectedNode = this.getSelectedNode();
      if (prevNode) {
        osparc.workbench.DiskUsageController.getInstance().unsubscribe(prevNode.getNodeId(), e => {
          console.log("unsubscribe", e)
          this.__updateDiskIndicator(e)
        });
      }

      // Subscribe to disk usage data for the new node
      osparc.workbench.DiskUsageController.getInstance().subscribe(node.getNodeId(), e => {
        console.log("subscribe", e["node_id"], node.getNodeId())
        this.__updateDiskIndicator(e);
      });
    },

    getIndicatorColor: function(freeSpace) {
      const warningSize = osparc.utils.Utils.gBToBytes(this.__lowDiskThreshold); // 5 GB Default
      const criticalSize = osparc.utils.Utils.gBToBytes(0.01); // 0 GB
      let color = qx.theme.manager.Color.getInstance().resolve("success");

      if (freeSpace <= criticalSize) {
        color = qx.theme.manager.Color.getInstance().resolve("error")
      } else if (freeSpace <= warningSize) {
        color = qx.theme.manager.Color.getInstance().resolve("warning")
      } else {
        color = qx.theme.manager.Color.getInstance().resolve("success")
      }
      return color
    },

    __updateDiskIndicator: function(diskUsage) {
      if (!diskUsage || !this.__lastDiskUsage) {
        console.log("return")
        return;
      }
      if (!diskUsage) {
        diskUsage = this.__lastDiskUsage;
      }
      this.__lastDiskUsage = diskUsage;
      const indicator = this.getChildControl("disk-indicator");
      const indicatorLabel = this.getChildControl("disk-indicator-label");
      const usage = diskUsage["usage"]["/"]
      const warningColor = this.getIndicatorColor(usage.free);
      const progress = `${usage["used_percent"]}%`;
      const labelDiskSize = osparc.utils.Utils.bytesToSize(usage.free);
      const color1 = warningColor;
      const bgColor = qx.theme.manager.Color.getInstance().resolve("tab_navigation_bar_background_color");
      const color2 = qx.theme.manager.Color.getInstance().resolve("info");

      indicator.getContentElement().setStyles({
        "background-color": bgColor,
        "background": `linear-gradient(90deg, ${color1} ${progress}, ${color2} ${progress})`,
      });

      indicatorLabel.setValue(`${labelDiskSize} Free`);
      const indicatorIsVisible = (this.getSelectedNode() && this.getSelectedNode().getNodeId() === diskUsage["node_id"]) || (this.getCurrentNode() && this.getCurrentNode().getNodeId() === diskUsage["node_id"]);
      indicator.setVisibility(indicatorIsVisible ? "visible" : "excluded");
    },

    // Cleanup method
    destruct: function() {
      const currentNode = this.getCurrentNode();
      if (currentNode) {
        osparc.workbench.DiskUsageController.getInstance().unsubscribe(currentNode.getNodeId(), this.__updateDiskIndicator);
      }
    }
  }
});
