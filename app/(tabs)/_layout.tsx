import React from 'react';
import { Stack } from 'expo-router';
// Only import the auth service, don't initialize Firebase here
import { auth } from '../../src/config/firebase';

export default function RootLayout() {
  // No Firebase initialization here
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      // Vous pouvez ajouter d'autres options de style communes ici
      contentStyle: { backgroundColor: '#f5f5f5' },
      // Animation de transition entre les écrans
      animation: 'slide_from_right',
    }}>
      {/* Définir explicitement vos écrans ici */}
      <Stack.Screen name="index" options={{ title: "Accueil" }} />
      
      {/* Écrans pour les jeux */}
      <Stack.Screen name="games" options={{ 
        title: "Jeux et défis",
        headerShown: true,
        headerTitleStyle: { fontWeight: 'bold' }
      }} />
      <Stack.Screen name="game/[id]" options={{ 
        // Options dynamiques pour l'écran de jeu spécifique
        title: "Détails du jeu",
        headerShown: true 
      }} />
      <Stack.Screen name="game/daily" options={{ 
        title: "Jeu du jour",
        headerShown: true 
      }} />
      <Stack.Screen name="game/quiz" options={{ 
        title: "Quiz",
        headerShown: true 
      }} />
      <Stack.Screen name="game/puzzle" options={{ 
        title: "Puzzle",
        headerShown: true 
      }} />
      
      {/* Écrans pour les récompenses */}
      <Stack.Screen name="rewards" options={{ 
        title: "Récompenses",
        headerShown: true 
      }} />
      <Stack.Screen name="reward/[id]" options={{ 
        title: "Détails de la récompense",
        headerShown: true 
      }} />
      <Stack.Screen name="reward/claim" options={{ 
        title: "Réclamation",
        headerShown: true 
      }} />
      <Stack.Screen name="reward/claimed" options={{ 
        title: "Mes récompenses",
        headerShown: true 
      }} />
      
      {/* Écrans pour les matchs */}
      <Stack.Screen name="matches" options={{ 
        title: "Matchs CAN 2025",
        headerShown: true 
      }} />
      <Stack.Screen name="match/[id]" options={{ 
        title: "Détails du match",
        headerShown: true 
      }} />
      
      {/* Écrans pour les vols */}
      <Stack.Screen name="flight/verify" options={{ 
        title: "Vérification de vol",
        headerShown: true 
      }} />
      
      {/* Écran de scan */}
      <Stack.Screen name="scan" options={{ 
        title: "Scanner un QR code",
        headerShown: true,
        // Mise en page spéciale pour l'écran de scan
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
      }} />
      
      {/* Écrans pour l'historique et profil */}
      <Stack.Screen name="history/points" options={{ 
        title: "Historique des points",
        headerShown: true 
      }} />
      <Stack.Screen name="profile/edit" options={{ 
        title: "Modifier le profil",
        headerShown: true 
      }} />
      <Stack.Screen name="profile/language" options={{ 
        title: "Langue",
        headerShown: true 
      }} />
      
      {/* Écrans d'assistance */}
      <Stack.Screen name="support" options={{ 
        title: "Centre d'aide",
        headerShown: true 
      }} />
      <Stack.Screen name="legal" options={{ 
        title: "Informations légales",
        headerShown: true 
      }} />
    </Stack>
  );
}