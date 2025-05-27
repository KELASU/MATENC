// app/Logins/Register.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Fauth, Fstore } from '../../FirebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile as updateAuthProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { router } from 'expo-router';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(''); // This is the primary display name
  const [location, setLocation] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !name) {
      Alert.alert('Missing fields', 'Please fill out Name, Email, and Password fields!');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match!');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(Fauth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile (displayName will be 'name' from form)
      await updateAuthProfile(user, {
        displayName: name,
        // photoURL will be set via EditProfile later
      });

      await sendEmailVerification(user);
      Alert.alert('Verify your email', 'A verification email has been sent.');

      const userDocRef = doc(Fstore, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email.toLowerCase(),
        name: name, // Primary display name stored in Firestore
        avatarUrl: '', // Initialize, to be updated in EditProfile
        bio: '',       // Initialize, to be updated in EditProfile
        location: location || '',
        followerCount: 0,
        followingCount: 0,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        expoPushToken: null,
        unitPreferences: {
          temperature: 'Celsius',
          distance: 'Kilometers',
        },
        notificationSettings: {
          forumPosts: true,
          marketplaceUpdates: true,
          supplierListings: true,
        },
        favorites: {
          blueprints: [],
          forums: [],
        },
        followedUsers: [],      // Consider if these top-level arrays are still needed
        followedSuppliers: [],  // if fully relying on subcollections for following/followers
      });

      router.replace('/Logins/VerifyEmail');
    } catch (error) {
      console.error("Registration Error:", error.message, error.code);
      Alert.alert('Registration Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>REGISTER</Text>
      <TextInput
        style={styles.input}
        placeholder="Name*"
        placeholderTextColor="#aaa"
        onChangeText={setName}
        value={name}
      />
      <TextInput
        style={styles.input}
        placeholder="Location (Optional)"
        placeholderTextColor="#aaa"
        onChangeText={setLocation}
        value={location}
      />
      <TextInput
        style={styles.input}
        placeholder="Email*"
        placeholderTextColor="#aaa"
        onChangeText={setEmail}
        value={email}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password*"
        placeholderTextColor="#aaa"
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password*"
        placeholderTextColor="#aaa"
        secureTextEntry
        onChangeText={setConfirmPassword}
        value={confirmPassword}
      />
      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerText}>REGISTER</Text>
      </TouchableOpacity>
      {/* <Text style={styles.socialText}>Or sign up with your socials</Text>
      <View style={styles.socialIcons}>
        <FontAwesome name="google" size={24} style={styles.icon} />
        <FontAwesome name="github" size={24} style={styles.icon} />
        <FontAwesome name="facebook" size={24} style={styles.icon} />
      </View> */}
      <TouchableOpacity onPress={() => router.replace('/Logins/Login')}>
        <Text style={styles.loginText}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
};

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

export default Register;