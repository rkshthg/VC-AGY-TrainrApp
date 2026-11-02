# Releasing Trainr

There are two ways to get a change to testers:

| Change | How it ships | Testers need to |
| --- | --- | --- |
| JS/TS only (screens, styles, stores, logic) | **OTA update** with `eas update` | Reopen the app (or tap **Restart** on the banner) |
| Native (new native package, `app.json` plugin/permission change, Expo SDK upgrade) | **New APK** | Install the new APK |

## OTA update (EAS Update)

```bash
npm run update:preview -- --message "Fix meal scan crash"
```

Installed apps check for updates when they start and download in the background.
The update applies the next time the app starts, or straight away when the user taps **Restart** on the banner.

**Environment variables.** `eas update` ignores your local `.env`. It uses the
variables stored in the Expo project's **preview** environment (expo.dev → Trainr-App →
Environment variables). When you add or change an `EXPO_PUBLIC_*` value in `.env`,
change it there too. The script (`scripts/publish-update.js`) won't publish if the Supabase values
are missing there. It also checks the built bundle afterwards, and uploads Sentry source maps
when `SENTRY_AUTH_TOKEN` is set.

**Rolling back a bad update:**

```bash
npx eas-cli update:roll-back-to-embedded --branch preview --runtime-version 1.2.6 --platform android --message "Roll back"
```

Devices go back to the code built into their APK the next time they open the app. You can also
republish an earlier update from the EAS dashboard.

**Runtime version rule.** `runtimeVersion` uses the `appVersion` policy, so an
update only reaches APKs whose `version` in `app.json` matches. Whenever you make
a native change, **bump `version`** (e.g. 1.2.6 → 1.3.0) and build a new APK. That stops
JS that needs new native code from being sent to an old APK.

The APK listens on the `preview` channel (`updates.requestHeaders` in `app.json`).

## New APK

```bash
npx expo prebuild --platform android --clean   # only after native/app.json changes
cd android
./gradlew assembleRelease
```

The APK lands in `android/app/build/outputs/apk/release/`. Run one build at a time.
If a Gradle download times out, set `GRADLE_OPTS=-Djava.net.preferIPv4Stack=true` first.

## Crash reporting (Sentry)

- `EXPO_PUBLIC_SENTRY_DSN` in `.env` turns reporting on. It applies to release builds only, and the DSN is baked into the JS, so an OTA update can add or change it.
- Reports include the user id and role, the screen, the device, and the update id. They never include email, names or health data.
- `logger.error(...)` calls are reported too.
- Source maps let stack traces show real file and line numbers. Set `SENTRY_AUTH_TOKEN` as a Windows environment variable and they upload automatically, for APK builds and for `npm run update:preview`. The org and project come from the Sentry plugin in `app.json`. Without a token, the upload is skipped.
