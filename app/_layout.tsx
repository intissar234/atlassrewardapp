// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
// Importer votre configuration Firebase existante
import '../src/config/firebase';
// Importer vos services Firebase (optionnel, pour les pré-charger)
import '../src/services/firebaseService';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}