/**
 * Crash and error reporting (Sentry).
 *
 * Reporting is on only in release builds, and only when EXPO_PUBLIC_SENTRY_DSN
 * is set. Without a DSN every function here does nothing, so the app runs fine.
 *
 * Privacy: we send the user's id and role, never their email, name, health
 * data or request bodies. Query strings are stripped from network breadcrumbs.
 */
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

export const monitoringEnabled = !!dsn && !isDev;

/** Records screen changes so a crash report shows which screen the user was on. */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

function stripQuery(url: unknown): unknown {
  return typeof url === 'string' ? url.split('?')[0] : url;
}

export function initMonitoring() {
  if (!monitoringEnabled) return;

  Sentry.init({
    dsn,
    environment: Updates.channel || 'production',
    sendDefaultPii: false,
    // Performance traces for 20% of sessions; errors are always sent.
    tracesSampleRate: 0.2,
    integrations: [navigationIntegration],
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') return null;
      if (breadcrumb.data?.url) {
        breadcrumb.data = { ...breadcrumb.data, url: stripQuery(breadcrumb.data.url) };
      }
      return breadcrumb;
    },
  });

  // Lets us tell whether a crash came from the APK's built-in code or from an OTA update.
  const scope = Sentry.getGlobalScope();
  scope.setTag('update_id', Updates.updateId ?? 'embedded');
  scope.setTag('embedded_launch', String(Updates.isEmbeddedLaunch));
  scope.setTag('channel', Updates.channel ?? 'none');
  scope.setTag('runtime_version', Updates.runtimeVersion ?? 'unknown');
}

/** Attach the signed-in user (id + role only) to future reports; pass null on sign-out. */
export function setMonitoringUser(userId: string | null, role?: string) {
  if (!monitoringEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
  Sentry.setTag('role', userId && role ? role : undefined);
}

/**
 * Called by logger.error in release builds. Sends the Error object if there is
 * one, otherwise just the message text; other arguments are not sent because
 * they may hold user data.
 */
export function reportError(args: unknown[]) {
  if (!monitoringEnabled) return;
  const message = typeof args[0] === 'string' ? args[0] : undefined;
  const error = args.find((a): a is Error => a instanceof Error);
  if (error) {
    Sentry.captureException(error, message ? { extra: { context: message } } : undefined);
  } else if (message) {
    Sentry.captureMessage(message, 'error');
  }
}

export const wrapRoot = Sentry.wrap;
