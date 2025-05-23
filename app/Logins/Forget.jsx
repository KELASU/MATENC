import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Fauth } from '../../FirebaseConfig';
import { router } from 'expo-router';

const Forget = () => {
  const [email, setEmail] = useState('');

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'Please enter your email address');
      return;
    }

    try {
      await sendPasswordResetEmail(Fauth, email);
      Alert.alert('Reset Email Sent', 'Please check your inbox to reset your password.');
      router.replace('/Logins/Login');
    } catch (error) {
      console.error(error.message);
      switch (error.code) {
        case 'auth/user-not-found':
          Alert.alert('Error', 'No user found with this email.');
          break;
        case 'auth/invalid-email':
          Alert.alert('Error', 'Invalid email address format.');
          break;
        default:
          Alert.alert('Error', error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESET PASSWORD</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#aaa"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetText}>SEND RESET EMAIL</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/Logins/Login')}>
        <Text style={styles.backToLogin}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Forget;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20394A',
    justifyContent: 'center',
    padding: 30,
  },
  title: {
    fontFamily: 'EdoSZ',
    fontSize: 24,
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
  resetButton: {
    backgroundColor: '#dedcd7',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  resetText: {
    fontFamily: 'EdoSZ',
    fontSize: 16,
  },
  backToLogin: {
    color: '#dedcd7',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
