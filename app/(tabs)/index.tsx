import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image au lieu du logo RAM */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/images/homescreen.png')} 
            style={styles.image}
            resizeMode="contain"
            onError={(error) => console.error("Erreur de chargement d'image:", error.nativeEvent.error)}
          />
        </View>
        
        {/* Texte en gras */}
        <View style={styles.textContainer}>
          <Text style={styles.boldText}>
            Vibrez au rythme
          </Text>
          <Text style={styles.boldText}>
            de la CAN 2025
          </Text>
          <Text style={styles.boldText}>
            avec RAM !
          </Text>
          
          <Text style={styles.descriptionText}>
            Rejoignez le programme de fidélité Atlas Rewards et gagnez des avantages 
            exclusifs en soutenant vos équipes préférées.
          </Text>
        </View>
        
        {/* Boutons en bas */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/auth/LoginScreen')}
          >
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={() => router.push('/auth/RegisterScreen')}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>
        
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  image: {
    width: 280,
    height: 280,
  },
  textContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  boldText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 42
  },
  descriptionText: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 24
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: height > 700 ? 40 : 20,
  },
  loginButton: {
    backgroundColor: '#dc3545', // Rouge RAM
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flex: 1,
    marginRight: 10,
    alignItems: 'center'
  },
  registerButton: {
    backgroundColor: '#dc3545', // Rouge RAM
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  },
  forgetButton: {
    backgroundColor: '#96714C', // Beige/marron RAM
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 15,
    alignItems: 'center'
  },
  forgetButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  }
});