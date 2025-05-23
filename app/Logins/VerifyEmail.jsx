import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Fauth } from '../../FirebaseConfig';
import { sendEmailVerification } from 'firebase/auth';
import { router } from 'expo-router';

const VerifyEmail = () => {
  const [isSending, setIsSending] = useState(false);

  const handleResendVerification = async () => {
    const user = Fauth.currentUser;

    if (user) {
      try {
        setIsSending(true);
        await sendEmailVerification(user);
        Alert.alert('Verification Sent', 'A new verification email has been sent to your inbox.');
      } catch (error) {
        Alert.alert('Error', error.message);
      } finally {
        setIsSending(false);
      }
    } else {
      Alert.alert('No user logged in', 'Please log in first.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VERIFY YOUR EMAIL</Text>
      <Text style={styles.subtitle}>
        A verification link has been sent to your email. Please check your inbox and verify your account before logging in.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleResendVerification} disabled={isSending}>
        <Text style={styles.buttonText}>{isSending ? 'Sending...' : 'Resend Verification Email'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/Logins/Login')}>
        <Text style={styles.loginLink}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default VerifyEmail;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20394A',
    padding: 30,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'EdoSZ',
    fontSize: 26,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#dedcd7',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontFamily: 'EdoSZ',
    fontSize: 16,
  },
  loginLink: {
    color: '#dedcd7',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
