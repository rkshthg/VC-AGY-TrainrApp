import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const isOnboarded = useAuthStore((state) => state.isOnboarded);
  const session = useAuthStore((state) => state.session);

  if (isOnboarded) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
