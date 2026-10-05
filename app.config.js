// Extends app.json. google-services.json (Firebase settings for Android push) is kept out of Git:
// - EAS builds get it from the secret file variable GOOGLE_SERVICES_JSON
//   (set with `eas env:create --name GOOGLE_SERVICES_JSON --type file --visibility secret ...`).
// - Local builds use ./google-services.json if you have a copy.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
