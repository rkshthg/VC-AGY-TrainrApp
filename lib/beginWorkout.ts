import { Alert, Platform } from 'react-native';
import { useWorkoutStore } from '../store/workoutStore';

type RouterLike = { push: (href: any) => void };

/**
 * Start a workout, or offer to resume the unfinished one (sessions survive
 * app restarts, so one may already be in progress).
 */
export function beginWorkout(router: RouterLike, start: () => void): void {
  const { activeSession, cancelSession } = useWorkoutStore.getState();
  const open = () => router.push('/workout/active-session');

  if (!activeSession) {
    start();
    open();
    return;
  }

  const startNew = () => {
    cancelSession();
    start();
    open();
  };
  const title = activeSession.planTitle || 'your workout';

  if (Platform.OS === 'web') {
    if (window.confirm(`You have an unfinished workout (${title}). Press OK to resume it, or Cancel to discard it and start a new one.`)) {
      open();
    } else {
      startNew();
    }
    return;
  }

  Alert.alert('Unfinished Workout', `Resume "${title}" or discard it and start a new one?`, [
    { text: 'Resume', onPress: open },
    { text: 'Discard & Start New', style: 'destructive', onPress: startNew },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
