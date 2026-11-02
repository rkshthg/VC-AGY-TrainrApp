// Sentry's Metro config adds debug IDs to the JS bundle so crash reports can be
// matched to the original source code (source maps).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
