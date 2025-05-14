import React from 'react';
import { Stack } from 'expo-router';
// Import auth from your config file with the correct path
import { auth } from '../../src/config/firebase';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/LoginScreen" />
      <Stack.Screen name="auth/RegisterScreen" />
      <Stack.Screen name="auth/Forgetpass" />
    </Stack>
  );
}