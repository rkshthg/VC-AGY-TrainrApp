/**
 * Centralized Logger for Trainr
 *
 * In development (__DEV__ === true): logs normally for debugging.
 * In production (__DEV__ === false): silences all output to prevent
 * PII, tokens, and sensitive state from leaking via adb logcat or
 * iOS console output. logger.error is reported to Sentry instead.
 *
 * This module is the ONLY place console.* should be called.
 * All other files should import and use `logger` instead.
 */

import { reportError } from './monitoring';

const noop = (..._args: any[]) => {};

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

const logger = {
  log: isDev ? console.log.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  // In production, errors go to Sentry (see lib/monitoring.ts) instead of the console.
  error: isDev ? console.error.bind(console) : (...args: any[]) => reportError(args),
  info: isDev ? console.info.bind(console) : noop,
  debug: isDev ? console.debug.bind(console) : noop,
};

export default logger;
