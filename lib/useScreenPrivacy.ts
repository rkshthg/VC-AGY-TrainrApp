import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Custom hook to enforce privacy protection when the app goes into the background
 * (e.g. hiding sensitive details in the iOS/Android app switcher preview).
 *
 * CURRENT STATE: Listens to AppState changes and invokes the callback when the
 * app enters/leaves the background. The callback can be used to toggle a blur
 * overlay or mask sensitive fields in the React layer.
 *
 * NATIVE INTEGRATION NEEDED FOR FULL PROTECTION:
 *
 * Android:
 *   - Add FLAG_SECURE to the MainActivity window to prevent screenshots and
 *     app-switcher preview capture. This requires a native module or the
 *     `expo-screen-capture` plugin:
 *       getWindow().setFlags(
 *         WindowManager.LayoutParams.FLAG_SECURE,
 *         WindowManager.LayoutParams.FLAG_SECURE
 *       );
 *   - Alternatively, install `expo-screen-capture` and call
 *     `ScreenCapture.preventScreenCaptureAsync()` from within this hook.
 *
 * iOS:
 *   - Add a blur overlay in `applicationWillResignActive` via a native module.
 *   - Or use `expo-screen-capture` which handles this cross-platform.
 *
 * TODO: Install and integrate `expo-screen-capture` for managed Expo workflow.
 */
export function useScreenPrivacy(onStateChange?: (inBackground: boolean) => void) {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const isBackground = nextAppState === 'inactive' || nextAppState === 'background';
      if (onStateChange) {
        onStateChange(isBackground);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [onStateChange]);
}
