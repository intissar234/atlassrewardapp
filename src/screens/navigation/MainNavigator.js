import React from 'react';
import  { useState} from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Importez vos écrans principaux
import HomeScreen from '../screens/main/HomeScreen';
import ScannerScreen from '../screens/main/ScannerScreen';
import RewardsScreen from '../screens/main/RewardsScreen';
import GamesScreen from '../screens/main/GamesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Navigateur Stack pour l'écran d'accueil (si vous avez des sous-écrans)
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      {/* Ajoutez d'autres écrans liés à l'accueil ici */}
    </Stack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'qrcode-scan' : 'qrcode';
          } else if (route.name === 'Rewards') {
            iconName = focused ? 'gift' : 'gift-outline';
          } else if (route.name === 'Games') {
            iconName = focused ? 'gamepad-variant' : 'gamepad-variant-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        headerShown: false,
        tabBarActiveTintColor: '#C12433', // Rouge RAM
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingBottom: 5,
          height: 60
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Scanner" component={ScannerScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Games" component={GamesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default MainNavigator;