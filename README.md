# Jerebu

Prototype mobile app that shows the haze reading for the air-quality station nearest to you in Malaysia.
Built with Expo (React Native), so one codebase runs on Android and iOS.

## Data

| Setup | What the app shows |
| --- | --- |
| No token (default) | Sample data on Malaysia's API scale, labelled as samples on every screen |
| `EXPO_PUBLIC_WAQI_TOKEN` set | Live DOE station readings from the World Air Quality Index Project, on the **US AQI** scale with US colours, labelled as such |

To use live data:

1. Get a free token at https://aqicn.org/data-platform/token
2. Copy `.env.example` to `.env` and paste the token after `EXPO_PUBLIC_WAQI_TOKEN=`
3. Restart `npx expo start`

WAQI terms: the data may not be used in paid apps, must credit WAQI and the original source (DOE),
and may not be redistributed. The token is bundled into the app, which is normal for this API.
The US AQI is not Malaysia's API: the same air gives a higher number and different colours.
For an official release, ask DOE for access to its hourly station data and add it as a third source
in `src/data/api.js` on the `MY_API` scale.

## Run it on your phone

1. Install **Expo Go** on your phone from the Play Store or App Store.
2. In this folder:

   ```
   npm install
   npx expo start
   ```
3. Scan the QR code with the Camera app (iPhone) or with Expo Go (Android). Phone and PC must be on the same Wi-Fi.
   If they can't see each other, use `npx expo start --tunnel`.

## What works

| Tab | Features |
| --- | --- |
| Now | Nearest station by GPS, reading with colour band, primary pollutant, advice (stricter for sensitive groups), pull to refresh, last reading cached for offline start, stale warning after 3 hours. Sample data shows a 24-hour trend; live data shows WAQI's daily PM2.5 forecast instead |
| Stations | Search by town or state, sort worst first or group by state, tap a station to view it, ☆ to follow it |
| Alerts | Turn on alerts, pick a threshold (101 / 151 / 201 / 301), follow current location and starred stations, sensitive-group switch, English / Bahasa Melayu |

When alerts are on, followed places at or above the chosen level are listed in a warning card at
the top of the Now tab.

## Push notifications

Push alerts arrive even when the app is closed. They need three things:

1. **The alerts server deployed.** See [server/README.md](server/README.md). Put its address in `.env`:
   `EXPO_PUBLIC_ALERTS_URL=https://jerebu-alerts.<your-subdomain>.workers.dev`
2. **Live data** (a WAQI token), because the server works with WAQI station IDs.
3. **A development build with Firebase set up** (Android). Push doesn't work in Expo Go.
   1. In the [Firebase console](https://console.firebase.google.com), create a project and add an Android app
      with package name `my.jerebu.app`.
   2. Download `google-services.json` into this folder (it's git-ignored; `app.json` already points to it) and
      store it on EAS so cloud builds can use it without it being in Git:
      `eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment development --environment preview --environment production`
      ([app.config.js](app.config.js) picks the EAS copy on build servers and the local copy on your PC).
   3. In Firebase → Project settings → Service accounts, generate a private key (JSON). Upload it with
      `eas credentials` → Android → development → Google Service Account → FCM V1.
   4. Rebuild: `eas build --profile development --platform android`, and install the new APK.

When alerts are switched on, the app asks for notification permission and registers the phone with the
server: its push token, language, alert level, followed stations and current nearest station. Switching
alerts off removes it from the server. Tapping a notification opens that station.
Without `EXPO_PUBLIC_ALERTS_URL`, alerts stay in-app only.

Stations followed or picked while on sample data have different IDs from live stations,
so follow them again after switching to live data.

## Project layout

```
App.js                      app shell: state, location, refresh, tabs
src/data/api.js             fetchReadings(), fetchStationDetail(): WAQI or sample data
src/data/stations.js        sample-data station list
src/data/bands.js           Malaysian API and US AQI scales, trend and stale helpers
src/data/geo.js             nearest station by distance
src/i18n.js                 English and BM strings, advice copy
src/alerts.js               followed places above the alert level
src/storage.js              settings and offline cache (AsyncStorage)
src/screens/                Now, Stations, Alerts
src/components/             band scale, sparkline, forecast, tab bar, cards
```

## Before release

- Replace WAQI with an official DOE feed, or keep the app free and follow WAQI's terms.
- Have the advice text in `src/i18n.js` reviewed against current DOE and Ministry of Health guidance.
- Add an app icon and splash screen in `app.json`.
