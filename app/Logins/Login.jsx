import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Fauth } from '../../FirebaseConfig';
import { router } from 'expo-router';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter both email and password');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(Fauth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert('Email not verified', 'Please verify your email before logging in.');
        return;
      }

      Alert.alert('Success', `Welcome, ${user.email}`);
      router.replace('/Main_pages/Home');
    } catch (error) {
      console.error(error);
      switch (error.code) {
        case 'auth/user-not-found':
          Alert.alert('User not found', 'No account exists with this email.');
          break;
        case 'auth/wrong-password':
          Alert.alert('Incorrect password', 'Please check your password and try again.');
          break;
        default:
          Alert.alert('Login error', error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LOG IN</Text>

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

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>LOGIN</Text>
      </TouchableOpacity>

      {/* <Text style={styles.socialText}>Or sign in with your socials</Text> */}
      {/* <View style={styles.socialIcons}>
        <FontAwesome name="google" size={24} style={styles.icon} />
        <FontAwesome name="github" size={24} style={styles.icon} />
        <FontAwesome name="facebook" size={24} style={styles.icon} />
      </View> */}

      <TouchableOpacity onPress={() => router.replace('/Logins/Register')}>
        <Text style={styles.registerText}>Don't have an account? Register</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/Logins/Forget')}>
        <Text style={styles.registerText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;

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
  loginButton: {
    backgroundColor: '#dedcd7',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
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
  registerText: {
    color: '#dedcd7',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
