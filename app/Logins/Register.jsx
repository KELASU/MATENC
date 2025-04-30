import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Fauth } from '../../FirebaseConfig'; // Import Firebase Auth
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { router } from 'expo-router'; // Import router for navigation

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (email && password && confirmPassword) {
      if (password === confirmPassword) {
        try {
          await createUserWithEmailAndPassword(Fauth, email, password); // Use Fauth to create a user
          alert('Registration successful!');
          // Navigate to login page or home page after successful registration
        } catch (error) {
          console.error(error.message);
          Alert.alert('Error', error.message); // Show Firebase error message
        }
      } else {
        alert('Passwords do not match!');
      }
    } else {
      alert('Please fill out all fields!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>REGISTER</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        onChangeText={setConfirmPassword}
        value={confirmPassword}
      />

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerText}>REGISTER</Text>
      </TouchableOpacity>

      <Text style={styles.socialText}>Or sign up with your socials</Text>
      <View style={styles.socialIcons}>
        <FontAwesome name="google" size={24} style={styles.icon} />
        <FontAwesome name="github" size={24} style={styles.icon} />
        <FontAwesome name="facebook" size={24} style={styles.icon} />
      </View>

      <TouchableOpacity onPress={() => router.replace('/Logins/Login')}>
        <Text style={styles.loginText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20394A',
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'EdoSZ',
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 15,
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#dedcd7',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  registerText: {
    fontFamily: 'EdoSZ',
    fontSize: 16,
  },
  socialText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 40,
    marginBottom: 20,
  },
  icon: {
    color: '#fff',
  },
  loginText: {
    color: '#dedcd7',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
