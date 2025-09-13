import { Stack } from 'expo-router';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="analytics" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="social" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="task-crusher" />
      </Stack>
    </ThemeProvider>
  );
}