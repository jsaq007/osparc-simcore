/* ************************************************************************

   osparc - the simcore frontend

   https://osparc.io

   Copyright:
     2018 IT'IS Foundation, https://itis.swiss

   License:
     MIT: https://opensource.org/licenses/MIT

   Authors:
     * Odei Maiz (odeimaiz)
     * Tobias Oetiker (oetiker)

************************************************************************ */

/* eslint "qx-rules/no-refs-in-members": "warn" */

/**
 * Widget used mainly by StudyBrowser for displaying Studies
 *
 * It consists of a thumbnail and creator and last change as caption
 */

qx.Class.define("osparc.dashboard.GridButtonItem", {
  extend: osparc.dashboard.GridButtonBase,

  construct: function() {
    this.base(arguments);

    this.setPriority(osparc.dashboard.CardBase.CARD_PRIORITY.ITEM);

    this.addListener("changeValue", this.__itemSelected, this);
  },

  statics: {
    MENU_BTN_DIMENSIONS: 32
  },

  members: {
    // overridden
    _createChildControlImpl: function(id) {
      let control;
      let footerLayout;
      switch (id) {
        case "tsr-rating":
          control = osparc.dashboard.CardBase.createTSRLayout();
          footerLayout = this.getChildControl("footer");
          footerLayout.addAt(control, 0, {
            flex: 1
          });
          break;
        case "workbench-mode":
          control = new qx.ui.basic.Image().set({
            alignY: "bottom"
          });
          this._mainLayout.add(control, osparc.dashboard.GridButtonBase.POS.VIEWER_MODE);
          break;
        case "empty-workbench": {
          control = this._getEmptyWorkbenchIcon();
          this._mainLayout.add(control, osparc.dashboard.GridButtonBase.POS.UPDATES);
          break;
        }
        case "update-study":
          control = new qx.ui.basic.Image().set({
            source: "@MaterialIcons/update/16",
            visibility: "excluded",
            alignY: "bottom"
          });
          osparc.utils.Utils.setIdToWidget(control, "updateStudyBtn");
          this._mainLayout.add(control, osparc.dashboard.GridButtonBase.POS.UPDATES);
          break;
        case "hits-service":
          control = new qx.ui.basic.Label().set({
            toolTipText: this.tr("Number of times you instantiated it"),
            alignY: "bottom"
          });
          this._mainLayout.add(control, osparc.dashboard.GridButtonBase.POS.UPDATES);
          break;
        case "tags":
          control = new qx.ui.container.Composite(new qx.ui.layout.Flow(5, 3)).set({
            anonymous: true
          });
          footerLayout = this.getChildControl("footer");
          footerLayout.addAt(control, 0, {
            flex: 1
          });
          // this._mainLayout.add(control, osparc.dashboard.GridButtonBase.POS.TAGS);
          break;
        case "menu-button":
          this.getChildControl("title").set({
            maxWidth: osparc.dashboard.GridButtonBase.ITEM_WIDTH - 2*osparc.dashboard.GridButtonBase.PADDING - this.self().MENU_BTN_DIMENSIONS
          });
          control = new qx.ui.form.MenuButton().set({
            width: this.self().MENU_BTN_DIMENSIONS,
            height: this.self().MENU_BTN_DIMENSIONS,
            icon: "@FontAwesome5Solid/ellipsis-v/14",
            focusable: false
          });
          // make it circular
          control.getContentElement().setStyles({
            "border-radius": `${this.self().MENU_BTN_DIMENSIONS / 2}px`
          });
          osparc.utils.Utils.setIdToWidget(control, "studyItemMenuButton");
          this._add(control, {
            top: 5,
            right: 5
          });
          break;
        case "tick-unselected":
          control = new qx.ui.basic.Image("@FontAwesome5Solid/circle/16");
          this._add(control, {
            top: 4,
            right: 4
          });
          break;
        case "tick-selected":
          control = new qx.ui.basic.Image("@FontAwesome5Solid/check-circle/16");
          this._add(control, {
            top: 4,
            right: 4
          });
          break;
        case "lock-status":
          control = new osparc.ui.basic.Thumbnail();
          this._add(control, {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          });
          break;
        case "permission-icon":
          control = new qx.ui.basic.Image();
          control.exclude();
          this._add(control, {
            bottom: 2,
            right: 12
          });
          break;
      }

      return control || this.base(arguments, id);
    },

    // overridden
    _applyMultiSelectionMode: function(value) {
      if (value) {
        const menuButton = this.getChildControl("menu-button");
        menuButton.setVisibility("excluded");
        this.__itemSelected();
      } else {
        this.__showMenuOnly();
      }
    },

    __itemSelected: function() {
      if (this.isLocked()) {
        this.setValue(false);
        return;
      }

      if (this.isResourceType("study") && this.isMultiSelectionMode()) {
        const selected = this.getValue();

        const tick = this.getChildControl("tick-selected");
        tick.setVisibility(selected ? "visible" : "excluded");

        const untick = this.getChildControl("tick-unselected");
        untick.setVisibility(selected ? "excluded" : "visible");
      } else {
        this.__showMenuOnly();
      }
    },

    __showMenuOnly: function() {
      const menuButton = this.getChildControl("menu-button");
      menuButton.setVisibility("visible");
      const tick = this.getChildControl("tick-selected");
      tick.setVisibility("excluded");
      const untick = this.getChildControl("tick-unselected");
      untick.setVisibility("excluded");
    },

    // _applyProjectState: function(projectStatus) {
    //   const status = projectStatus["value"];
    //   let icon;
    //   let label;
    //   let border;
    //   switch (status) {
    //     case "STARTED":
    //       icon = "@FontAwesome5Solid/spinner/14";
    //       label = "Running";
    //       border = "info";
    //       break;
    //     case "SUCCESS":
    //       icon = "@FontAwesome5Solid/check/14";
    //       label = "Success";
    //       border = "success";
    //       break;
    //     case "FAILED":
    //       icon = "@FontAwesome5Solid/times/14";
    //       label = "Failed";
    //       border = "error";
    //       break;
    //     default:
    //       icon = "@FontAwesome5Solid/times/14";
    //       label = "Failed";
    //       border = "error";
    //       break;
    //   }
    //   this.__applyProjectLabel(icon, label, border);
    // },
    //
    // __applyProjectLabel: function(icn, lbl, bdr) {
    //   let control;
    //   const border = new qx.ui.decoration.Decorator().set({
    //     width: 1,
    //     style: "solid",
    //     color: bdr,
    //     backgroundColor: bdr
    //   });
    //   control = new qx.ui.basic.Image(icn).set({
    //     height: 26,
    //     width: 26,
    //     alignY: "middle",
    //     alignX: "center",
    //     padding: 5,
    //     decorator: border,
    //     toolTipText: this.tr(`Project ${lbl}`)
    //   });
    //   control.getContentElement().setStyles({
    //     "border-radius": "50%"
    //   });
    //   this._mainLayout.add(control, osparc.dashboard.GridButtonBase.POS.STATUS);
    // },

    // overridden
    _applyLastChangeDate: function(value, old) {
      if (value && (this.isResourceType("study") || this.isResourceType("template"))) {
        const label = this.getChildControl("subtitle-text");
        label.setValue(osparc.utils.Utils.formatDateAndTime(value));
      }
    },

    // overridden
    _applyOwner: function(value, old) {
      if (this.isResourceType("service")) {
        const label = this.getChildControl("subtitle-text");
        if (value === osparc.auth.Data.getInstance().getEmail()) {
          label.setValue(this.tr("me"));
        } else {
          label.setValue(value);
        }
      }
    },

    _applyAccessRights: function(value) {
      if (value && Object.keys(value).length) {
        const shareIcon = this.getChildControl("subtitle-icon");
        this._evaluateShareIcon(shareIcon, value);
      }
    },

    _applyTags: function(tags) {
      if (osparc.data.Permissions.getInstance().canDo("study.tag")) {
        const tagsContainer = this.getChildControl("tags");
        tagsContainer.setVisibility(tags.length ? "visible" : "excluded");
        tagsContainer.removeAll();
        tags.forEach(tag => {
          const tagUI = new osparc.ui.basic.Tag(tag.name, tag.color, "searchBarFilter");
          tagUI.addListener("tap", () => this.fireDataEvent("tagClicked", tag));
          tagUI.setFont("text-12");
          tagsContainer.add(tagUI);
        });
      }
    },

    // overridden
    _applyMenu: function(menu, old) {
      const menuButton = this.getChildControl("menu-button");
      if (menu) {
        menuButton.setMenu(menu);
        menu.setPosition("top-left");
        osparc.utils.Utils.prettifyMenu(menu);
        osparc.utils.Utils.setIdToWidget(menu, "studyItemMenuMenu");
      }
      menuButton.setVisibility(menu ? "visible" : "excluded");
    }
  }
});
