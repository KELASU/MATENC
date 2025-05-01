import { Slot, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fauth } from '../FirebaseConfig';

export default function RootLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsub;

    const initAuth = async () => {
      try {
        await AsyncStorage.clear();
        console.log('✅ AsyncStorage cleared');

        await signOut(Fauth);
        console.log('✅ Firebase user signed out');

        // Add short delay to ensure Firebase processes sign-out
        setTimeout(() => {
          console.log('🔁 setting up onAuthStateChanged listener');
          unsub = onAuthStateChanged(Fauth, (user) => {
            console.log('✅ onAuthStateChanged:', user);
            if (user) {
              router.push('./Main_pages/Home');
              console.log('→ routing to /Main_pages/home');
            } else {
              router.push('./Logins/Onboarding');
              console.log('→ routing to /Logins/Onboarding');
            }
            setChecking(false);
          });
        }, 300); // 300ms delay
      } catch (err) {
        console.warn('⚠️ Error during auth init:', err);
        setChecking(false);
      }
    };

    initAuth();

    return () => {
      if (unsub) {
        console.log('🛑 unsubscribing auth listener');
        unsub();
      }
    };
  }, [router]);

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20394A" />
        <Text style={styles.loadingText}>Checking authentication…</Text>
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fefaf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#20394A',
  },
});
