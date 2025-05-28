
import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';


import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { createUserProfile } from '../../src/services/firebaseService'; // 🔥
import { router } from 'expo-router';

export default function Register () {
  // États pour les champs du formulaire
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Validation du formulaire
  const validateForm = () => {
    // Vérifier les champs vides
    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return false;
    }
    
    // Validation simple de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return false;
    }
    
    // Vérification de la longueur du mot de passe
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return false;
    }
    
    return true;
  };

  // Gestion de l'inscription avec Firebase
  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Créer l'utilisateur avec Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Utilisateur créé avec ID:", user.uid);
      
      // Stocker les informations supplémentaires dans Firestore
      await createUserProfile({
        firstName,
        lastName,
        email
      });
      
      console.log("Profil utilisateur créé avec succès");
      
      setLoading(false);
      Alert.alert(
        "Success", 
        "Account created successfully!\nRedirecting to login...",
        [{ 
          text: "OK", 
          onPress: () => {
            console.log("Redirection vers l'écran de connexion");
            router.push('/auth/login');
          } 
        }]
      );
    } catch (error: any) {
  setLoading(false);
  console.error("Erreur lors de l'inscription:", error.code, error.message);

  if (error.code === 'auth/email-already-in-use') {
    Alert.alert("Error", "This email is already registered.");
  } else if (error.code === 'auth/invalid-email') {
    Alert.alert("Error", "Invalid email address.");
  } else if (error.code === 'auth/weak-password') {
    Alert.alert("Error", "Password is too weak.");
  } else {
    Alert.alert("Error", "Something went wrong. Please try again.");
  }
}

  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.container}>
            {/* En-tête */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <View style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: 20 }} />
                </View>
              </View>
              
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join Atlas Rewards for CAN 2025</Text>
            </View>
            
            {/* Formulaire d'inscription */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={(text) => setFirstName(text)}
                placeholder="First Name"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={(text) => setLastName(text)}
                placeholder="Last Name"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => setEmail(text)}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => setPassword(text)}
                placeholder="Password"
                secureTextEntry
                placeholderTextColor="#999"
              />
              
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By registering, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.registerButtonText}>SIGN UP</Text>
                )}
              </TouchableOpacity>
              
              <View style={styles.loginPromptContainer}>
                <Text style={styles.loginPromptText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/auth/login')}>
                  <Text style={styles.loginPromptLink}>Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 10,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6f42c1', // Violet
    fontWeight: '500',
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#dc3545', // Rouge RAM
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(150, 113, 76, 0.9)', // Beige/marron
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 16,
    color: 'rgba(150, 113, 76, 0.9)', // Beige/marron
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(150, 113, 76, 0.5)', // Beige/marron clair
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  termsContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  termsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: '#dc3545', // Rouge
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loginPromptContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  loginPromptText: {
    color: '#666666',
    fontSize: 16,
  },
  loginPromptLink: {
    color: '#6f42c1', // Violet
    fontSize: 16,
    fontWeight: 'bold',
  }
});