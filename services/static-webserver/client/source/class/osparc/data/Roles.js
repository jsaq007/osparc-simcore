/* ************************************************************************

   osparc - the simcore frontend

   https://osparc.io

   Copyright:
     2023 IT'IS Foundation, https://itis.swiss

   License:
     MIT: https://opensource.org/licenses/MIT

   Authors:
     * Odei Maiz (odeimaiz)

************************************************************************ */


qx.Class.define("osparc.data.Roles", {
  type: "static",

  statics: {
    ORG: {
      0: {
        id: "noRead",
        label: qx.locale.Manager.tr("Restricted user"),
        longLabel: qx.locale.Manager.tr("Restricted user: no Read access"),
        canDo: [
          qx.locale.Manager.tr("- can access content shared within the Organization")
        ]
      },
      1: {
        id: "read",
        label: qx.locale.Manager.tr("User"),
        longLabel: qx.locale.Manager.tr("User: Read access"),
        canDo: [
          qx.locale.Manager.tr("- can see other users"),
          qx.locale.Manager.tr("- can share with other users")
        ]
      },
      2: {
        id: "write",
        label: qx.locale.Manager.tr("Manager"),
        longLabel: qx.locale.Manager.tr("Manager: Read/Write access"),
        canDo: [
          qx.locale.Manager.tr("- can Add/Delete members"),
          qx.locale.Manager.tr("- can Promote/Demote members"),
          qx.locale.Manager.tr("- can Edit Organization details")
        ]
      },
      3: {
        id: "delete",
        label: qx.locale.Manager.tr("Administrator"),
        longLabel: qx.locale.Manager.tr("Admin: Read/Write/Delete access"),
        canDo: [
          qx.locale.Manager.tr("- can Delete the Organization")
        ]
      }
    },

    // study, templates, services
    RESOURCES: {
      1: {
        id: "read",
        label: qx.locale.Manager.tr("User"),
        longLabel: qx.locale.Manager.tr("User: Read access"),
        canDo: [
          qx.locale.Manager.tr("- can open it")
        ]
      },
      2: {
        id: "write",
        label: qx.locale.Manager.tr("Editor"),
        longLabel: qx.locale.Manager.tr("Editor: Read/Write access"),
        canDo: [
          qx.locale.Manager.tr("- can make changes")
        ]
      },
      3: {
        id: "delete",
        label: qx.locale.Manager.tr("Owner"),
        longLabel: qx.locale.Manager.tr("Owner: Read/Write/Delete access"),
        canDo: [
          qx.locale.Manager.tr("- can delete it")
        ]
      }
    },

    STUDY: {
      1: {
        id: "read",
        label: qx.locale.Manager.tr("User"),
        longLabel: qx.locale.Manager.tr("User: Read access"),
        canDo: [
          qx.locale.Manager.tr("- can open it")
        ]
      },
      2: {
        id: "write",
        label: qx.locale.Manager.tr("Editor"),
        longLabel: qx.locale.Manager.tr("Editor: Read/Write access"),
        canDo: [
          qx.locale.Manager.tr("- can make changes"),
          qx.locale.Manager.tr("- can share it")
        ]
      },
      3: {
        id: "delete",
        label: qx.locale.Manager.tr("Owner"),
        longLabel: qx.locale.Manager.tr("Owner: Read/Write/Delete access"),
        canDo: [
          qx.locale.Manager.tr("- can delete it")
        ]
      }
    },

    SERVICES: {
      1: {
        id: "read",
        label: qx.locale.Manager.tr("User"),
        longLabel: qx.locale.Manager.tr("User: Read access"),
        canDo: [
          qx.locale.Manager.tr("- can use it")
        ]
      },
      2: {
        id: "write",
        label: qx.locale.Manager.tr("Owner"),
        longLabel: qx.locale.Manager.tr("Owner: Read/Write access"),
        canDo: [
          qx.locale.Manager.tr("- can make changes"),
          qx.locale.Manager.tr("- can share it")
        ]
      }
    },

    WALLET: {
      1: {
        id: "read",
        label: qx.locale.Manager.tr("User"),
        longLabel: qx.locale.Manager.tr("User: Read access"),
        canDo: [
          qx.locale.Manager.tr("- can use the credits")
        ]
      },
      2: {
        id: "write",
        label: qx.locale.Manager.tr("Accountant"),
        longLabel: qx.locale.Manager.tr("Accountant: Read/Write access"),
        canDo: [
          qx.locale.Manager.tr("- can Add/Delete members"),
          qx.locale.Manager.tr("- can Edit Credit Account details")
        ]
      }
    },

    __createIntoFromRoles: function(roles) {
      const rolesLayout = new qx.ui.container.Composite(new qx.ui.layout.HBox(5)).set({
        alignY: "middle",
        paddingRight: 10
      });
      rolesLayout.add(new qx.ui.core.Spacer(), {
        flex: 1
      });

      const rolesText = new qx.ui.basic.Label(qx.locale.Manager.tr("Roles")).set({
        font: "text-13"
      });
      rolesLayout.add(rolesText);
      let text = "";
      const values = Object.values(roles);
      values.forEach((role, idx) => {
        text += role.longLabel + ":<br>";
        role.canDo.forEach(can => {
          text += can + "<br>";
        });
        if (idx !== values.length-1) {
          text += "<br>";
        }
      });
      const infoHint = new osparc.ui.hint.InfoHint(text);
      rolesLayout.add(infoHint);
      return rolesLayout;
    },

    createRolesOrgInfo: function() {
      return this.__createIntoFromRoles(osparc.data.Roles.ORG);
    },

    createRolesWalletInfo: function() {
      return this.__createIntoFromRoles(osparc.data.Roles.WALLET);
    },

    createRolesResourceInfo: function() {
      return this.__createIntoFromRoles(osparc.data.Roles.RESOURCES);
    },

    createRolesStudyResourceInfo: function() {
      return this.__createIntoFromRoles(osparc.data.Roles.STUDY);
    },

    createServicesRolesResourceInfo: function() {
      return this.__createIntoFromRoles(osparc.data.Roles.SERVICES);
    }
  }
});
