/* ************************************************************************

   osparc - the simcore frontend

   https://osparc.io

   Copyright:
     2022 IT'IS Foundation, https://itis.swiss

   License:
     MIT: https://opensource.org/licenses/MIT

   Authors:
     * Odei Maiz (odeimaiz)

************************************************************************ */

qx.Class.define("osparc.product.tutorial.s4llite.S4LLiteUI", {
  extend: osparc.product.tutorial.SlideBase,

  construct: function() {
    const title = this.tr("S4L lite");
    this.base(arguments, title);
  },

  members: {
    _populateCard: function() {
      const introText = this.tr("\
      To check the S4L lite manual, please open a project and access the documentation via Help in the menu as shown below. Enjoy!\
      ");
      const intro = osparc.product.tutorial.Utils.createLabel(introText);
      this._add(intro);

      const manualGif = new qx.ui.basic.Image("https://zurichmedtech.github.io/s4l-lite-manual/assets/s4l-docs.gif").set({
        alignX: "center",
        scale: true,
        width: 626,
        height: 392
      });
      this._add(manualGif);
    }
  }
});