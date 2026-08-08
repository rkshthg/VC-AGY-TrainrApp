import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0A1913' },
        headerTintColor: '#E5C158',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0A1913' },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create Account' }} />
      <Stack.Screen name="role-selection" options={{ title: 'Choose Your Role', headerLeft: () => null }} />
    </Stack>
  );
}

