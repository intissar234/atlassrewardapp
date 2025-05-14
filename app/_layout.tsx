// app/_layout.tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { auth } from '../src/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { router } from 'expo-router';

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
      if (!user) {
        router.replace('/auth/LoginScreen');
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#f5f5f5' },
      animation: 'slide_from_right',
    }}>
      {/* Définir les routes */}
      <Stack.Screen name="index" options={{ title: "Redirection..." }} />
      <Stack.Screen name="auth/LoginScreen" options={{ title: "Connexion" }} />
      <Stack.Screen name="auth/RegisterScreen" options={{ title: "Inscription" }} />
      <Stack.Screen name="auth/Forgetpass" options={{ title: "Mot de passe oublié" }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}