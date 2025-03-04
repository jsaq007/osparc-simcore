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


qx.Class.define("osparc.desktop.preferences.pages.GeneralPage", {
  extend: osparc.desktop.preferences.pages.BasePage,

  construct: function() {
    const iconSrc = "@FontAwesome5Solid/cogs/24";
    const title = this.tr("General Settings");
    this.base(arguments, title, iconSrc);

    this.add(this.__createCreditsIndicatorSettings());
    this.add(this.__createInactivitySetting());
    this.add(this.__createJobConcurrencySetting());
    this.add(this.__createUserPrivacySettings());
  },

  statics: {
    patchPreference: function(preferenceId, preferenceField, newValue) {
      const preferencesSettings = osparc.Preferences.getInstance();

      const oldValue = preferencesSettings.get(preferenceId);
      if (newValue === oldValue) {
        return;
      }

      preferenceField.setEnabled(false);
      osparc.Preferences.patchPreference(preferenceId, newValue)
        .then(() => preferencesSettings.set(preferenceId, newValue))
        .catch(err => {
          console.error(err);
          osparc.FlashMessenger.logAs(err.message, "ERROR");
          preferenceField.setValue(oldValue);
        })
        .finally(() => preferenceField.setEnabled(true));
    }
  },

  members: {
    __createCreditsIndicatorSettings: function() {
      // layout
      const box = this._createSectionBox(this.tr("Credits Indicator"));

      const form = new qx.ui.form.Form();

      const preferencesSettings = osparc.Preferences.getInstance();

      const walletIndicatorVisibilitySB = new qx.ui.form.SelectBox().set({
        allowGrowX: false
      });
      [{
        id: "always",
        label: "Always"
      }, {
        id: "warning",
        label: "Warning"
      }].forEach(options => {
        const lItem = new qx.ui.form.ListItem(options.label, null, options.id);
        walletIndicatorVisibilitySB.add(lItem);
      });
      const value2 = preferencesSettings.getWalletIndicatorVisibility();
      walletIndicatorVisibilitySB.getSelectables().forEach(selectable => {
        if (selectable.getModel() === value2) {
          walletIndicatorVisibilitySB.setSelection([selectable]);
        }
      });
      walletIndicatorVisibilitySB.addListener("changeValue", e => {
        const selectable = e.getData();
        this.self().patchPreference("walletIndicatorVisibility", walletIndicatorVisibilitySB, selectable.getModel());
      });
      form.add(walletIndicatorVisibilitySB, this.tr("Show indicator"));

      const creditsWarningThresholdField = new qx.ui.form.Spinner().set({
        minimum: 100,
        maximum: 10000,
        singleStep: 10,
        allowGrowX: false
      });
      preferencesSettings.bind("creditsWarningThreshold", creditsWarningThresholdField, "value");
      creditsWarningThresholdField.addListener("changeValue", e => this.self().patchPreference("creditsWarningThreshold", creditsWarningThresholdField, e.getData()));
      form.add(creditsWarningThresholdField, this.tr("Show warning when credits below"));

      box.add(new qx.ui.form.renderer.Single(form));

      return box;
    },
    __createInactivitySetting: function() {
      const box = this._createSectionBox(this.tr("Automatic Shutdown of Idle Instances"));
      const label = this._createHelpLabel(this.tr("Enter 0 to disable this function"), "text-13-italic");
      box.add(label);
      const form = new qx.ui.form.Form();
      const inactivitySpinner = new qx.ui.form.Spinner().set({
        minimum: 0,
        maximum: Number.MAX_SAFE_INTEGER,
        singleStep: 1,
        allowGrowX: false
      });
      const preferences = osparc.Preferences.getInstance();
      preferences.bind("userInactivityThreshold", inactivitySpinner, "value", {
        converter: value => Math.round(value / 60) // Stored in seconds, displayed in minutes
      });
      inactivitySpinner.addListener("changeValue", e => this.self().patchPreference("userInactivityThreshold", inactivitySpinner, e.getData() * 60));
      form.add(inactivitySpinner, this.tr("Idle time before closing (in minutes)"));
      box.add(new qx.ui.form.renderer.Single(form));
      return box;
    },
    __createJobConcurrencySetting: function() {
      const box = this._createSectionBox(this.tr("Job Concurrency"));
      const form = new qx.ui.form.Form();
      const jobConcurrencySpinner = new qx.ui.form.Spinner().set({
        minimum: 1,
        maximum: 10,
        singleStep: 1,
        allowGrowX: false,
        enabled: false
      });
      const preferences = osparc.Preferences.getInstance();
      preferences.bind("jobConcurrencyLimit", jobConcurrencySpinner, "value");
      jobConcurrencySpinner.addListener("changeValue", e => this.self().patchPreference("jobConcurrencyLimit", jobConcurrencySpinner, e.getData()));
      form.add(jobConcurrencySpinner, this.tr("Maximum number of concurrent jobs"));
      box.add(new qx.ui.form.renderer.Single(form));
      return box;
    },
    __createUserPrivacySettings: function() {
      const box = this._createSectionBox("Privacy Settings");

      const label = this._createHelpLabel(this.tr("Help us improve Sim4Life user experience"), "text-13-italic");
      box.add(label);

      const preferencesSettings = osparc.Preferences.getInstance();

      const cbAllowMetricsCollection = new qx.ui.form.CheckBox(this.tr("Share usage data"));
      preferencesSettings.bind("allowMetricsCollection", cbAllowMetricsCollection, "value");
      cbAllowMetricsCollection.addListener("changeValue", e => this.self().patchPreference("allowMetricsCollection", cbAllowMetricsCollection, e.getData()));
      box.add(cbAllowMetricsCollection);

      return box;
    }
  }
});
