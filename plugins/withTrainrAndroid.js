/**
 * Trainr's custom Android build setup, re-applied every time `npx expo prebuild`
 * regenerates the android/ folder (which is not in git):
 *
 *  - versionCode = number of git commits, versionName = app.json "version"
 *  - release signing from MYAPP_RELEASE_* (env vars or ~/.gradle/gradle.properties);
 *    falls back to the debug key when they are missing
 *  - copies credentials/trainr-release.keystore into android/app/
 *  - APK named trainr-v<versionName>(<versionCode>)-<buildType>.apk
 *  - R8 code shrinking + resource shrinking in release builds
 *  - network security config that blocks cleartext (HTTP) traffic
 *  - Windows build fixes: newer CMake via local.properties, Java prefers IPv4
 */
const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withGradleProperties,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');

const MARKER = '// @trainr-build-setup';
const KEYSTORE_NAME = 'trainr-release.keystore';

const HELPERS = `
${MARKER}
def trainrVersionCode() {
    try {
        def process = "git rev-list --count HEAD".execute(null, rootDir)
        process.waitFor()
        if (process.exitValue() == 0) {
            def count = process.text.trim().toInteger()
            if (count > 0) return count
        }
    } catch (Exception ignored) {}
    return 1
}

def trainrVersionName() {
    try {
        def appJson = new File(rootDir.getParentFile(), "app.json")
        if (appJson.exists()) {
            def parsed = new groovy.json.JsonSlurper().parseText(appJson.text)
            if (parsed?.expo?.version) return parsed.expo.version
        }
    } catch (Exception ignored) {}
    return "1.0.0"
}

def trainrSigningValue(String name) {
    return System.getenv(name) ?: (project.hasProperty(name) ? project.property(name) : null)
}
def trainrHasReleaseKeys = ["MYAPP_RELEASE_STORE_FILE", "MYAPP_RELEASE_STORE_PASSWORD",
                            "MYAPP_RELEASE_KEY_ALIAS", "MYAPP_RELEASE_KEY_PASSWORD"].every { trainrSigningValue(it) }
`;

const RELEASE_SIGNING = `
        release {
            if (trainrHasReleaseKeys) {
                storeFile file(trainrSigningValue("MYAPP_RELEASE_STORE_FILE"))
                storePassword trainrSigningValue("MYAPP_RELEASE_STORE_PASSWORD")
                keyAlias trainrSigningValue("MYAPP_RELEASE_KEY_ALIAS")
                keyPassword trainrSigningValue("MYAPP_RELEASE_KEY_PASSWORD")
            }
        }`;

const APK_NAMING = `
${MARKER} apk naming
android.applicationVariants.all { variant ->
    variant.outputs.all { output ->
        outputFileName = "trainr-v\${variant.versionName}(\${variant.versionCode})-\${variant.buildType.name}.apk"
    }
}
`;

function replaceOnce(src, pattern, replacement, what) {
  if (!pattern.test(src)) {
    throw new Error(`withTrainrAndroid: could not find ${what} in app/build.gradle`);
  }
  return src.replace(pattern, replacement);
}

function patchBuildGradle(src) {
  if (src.includes(MARKER)) return src; // already applied

  src = replaceOnce(
    src,
    /(def projectRoot = .*\n)/,
    `$1${HELPERS}`,
    'projectRoot definition'
  );
  src = replaceOnce(src, /versionCode \d+/, 'versionCode trainrVersionCode()', 'versionCode');
  src = replaceOnce(src, /versionName "[^"]*"/, 'versionName trainrVersionName()', 'versionName');
  src = replaceOnce(src, /(signingConfigs \{)/, `$1${RELEASE_SIGNING}`, 'signingConfigs block');
  src = replaceOnce(
    src,
    /(release \{\s*\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
    '$1signingConfig trainrHasReleaseKeys ? signingConfigs.release : signingConfigs.debug',
    'release build type signingConfig'
  );
  return src + APK_NAMING;
}

const withTrainrBuildGradle = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withTrainrAndroid: expected a Groovy app/build.gradle');
    }
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });

const withTrainrGradleProperties = (config) =>
  withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    };
    set('android.enableMinifyInReleaseBuilds', 'true');
    set('android.enableShrinkResourcesInReleaseBuilds', 'true');
    // Java on this network times out on GitHub/Maven IPv6 addresses; force IPv4 for Gradle downloads.
    set('systemProp.java.net.preferIPv4Stack', 'true');
    return cfg;
  });

// CMake 3.22 (the Android default) loops forever on Windows with
// "build.ninja still dirty after 100 tries". Use a newer SDK CMake when installed.
const PREFERRED_CMAKE = '3.31.6';
const withTrainrCmake = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
      const cmakeDir = sdk && path.join(sdk, 'cmake', PREFERRED_CMAKE);
      if (!cmakeDir || !fs.existsSync(cmakeDir)) {
        console.warn(`withTrainrAndroid: SDK CMake ${PREFERRED_CMAKE} not found; install it with sdkmanager "cmake;${PREFERRED_CMAKE}".`);
        return cfg;
      }
      const file = path.join(cfg.modRequest.platformProjectRoot, 'local.properties');
      const escaped = cmakeDir.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
      let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      text = text.replace(/^cmake\.dir=.*\n?/m, '');
      fs.writeFileSync(file, `${text}${text && !text.endsWith('\n') ? '\n' : ''}cmake.dir=${escaped}\n`);
      return cfg;
    },
  ]);

const withTrainrNetworkSecurity = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, 'network_security_config.xml'),
        path.join(xmlDir, 'network_security_config.xml')
      );
      return cfg;
    },
  ]);
};

const withTrainrKeystore = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const source = path.join(cfg.modRequest.projectRoot, 'credentials', KEYSTORE_NAME);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(cfg.modRequest.platformProjectRoot, 'app', KEYSTORE_NAME));
      } else {
        console.warn(`withTrainrAndroid: credentials/${KEYSTORE_NAME} not found; release builds will use the debug key.`);
      }
      return cfg;
    },
  ]);

module.exports = (config) => {
  config = withTrainrBuildGradle(config);
  config = withTrainrGradleProperties(config);
  config = withTrainrNetworkSecurity(config);
  config = withTrainrKeystore(config);
  config = withTrainrCmake(config);
  return config;
};
