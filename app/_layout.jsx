// app/_layout.jsx

import { Slot, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Alert, Platform, InteractionManager } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fauth, Fstore } from '../FirebaseConfig'; // Ensure this path is correct
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
// Constants is not strictly needed if we are not trying to pass an explicit projectId
// import Constants from 'expo-constants'; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch (e) {
      console.warn("Failed to set notification channel for Android", e);
    }
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Push notification permission was denied. Please enable it in settings to receive notifications.'
      );
      return null;
    }

    try {
      console.log("Attempting to get push token with NO explicit projectId...");
      
      // *** Calling getExpoPushTokenAsync WITHOUT any arguments ***
      token = (await Notifications.getExpoPushTokenAsync()).data; 
      
      console.log('Expo Push Token obtained (auto-inferred project):', token);
      return token;
    } catch (e) {
      console.error("Error getting Expo push token:", e);
      const errorMessage = e.message || "An unknown error occurred.";
      
      if (errorMessage.includes("No \"projectId\" found")) {
        Alert.alert(
          'Token Error',
          'Failed to get push token: Expo could not automatically determine the project ID. ' +
          'Ensure app.json (slug) and native configurations (google-services.json, GoogleService-Info.plist) are correct. ' +
          'Using a development build is highly recommended for full push notification support.'
        );
      } else if (errorMessage.includes("Invalid uuid")) {
         Alert.alert(
          'Token Configuration Error',
          `Failed to get push token due to an issue with project identification (often expecting a UUID): ${errorMessage}`
         );
      } else {
        Alert.alert('Token Error', `Failed to get push token: ${errorMessage}`);
      }
      return null;
    }
  } else {
    console.log('Not a physical device, or push notifications not supported for this environment.');
    return null;
  }
}


export default function RootLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    let authUnsubscribe; // Renamed for clarity

    const initializeApp = async () => {
      try {
        // This part runs on every app start as per your original structure
        await AsyncStorage.clear();
        console.log('✅ AsyncStorage cleared');
        await signOut(Fauth);
        console.log('✅ Firebase user signed out');

        // Setup onAuthStateChanged listener immediately after sign out
        console.log('🔁 Setting up onAuthStateChanged listener...');
        authUnsubscribe = onAuthStateChanged(Fauth, async (user) => {
          console.log('✅ onAuthStateChanged triggered. User:', user ? user.uid : null);
          try {
            if (user) {
              const token = await registerForPushNotificationsAsync();
              if (token) {
                try {
                  await setDoc(
                    doc(Fstore, 'users', user.uid),
                    {
                      expoPushToken: token,
                      lastLogin: serverTimestamp(), // Store last login time
                    },
                    { merge: true }
                  );
                  console.log('✅ Push token saved to Firestore for user:', user.uid);
                } catch (error) {
                  console.warn('❌ Failed to save push token to Firestore:', error);
                }
              } else {
                console.warn('⚠️ No push token retrieved for user:', user.uid);
              }
              // Route user
              console.log(`User email verified: ${user.emailVerified}. Routing...`);
              router.replace(user.emailVerified ? '/Main_pages/Home' : '/Logins/VerifyEmail');
            } else {
              // No user
              console.log('No user signed in. Routing to Onboarding...');
              router.replace('/Logins/Onboarding');
            }
          } catch (innerError) {
            console.error('Error within onAuthStateChanged callback:', innerError);
            // Fallback routing if something goes wrong inside
             router.replace('/Logins/Onboarding');
          } finally {
            // Ensure checking is set to false regardless of inner outcomes
            if (checking) setChecking(false); // Only set if still true to avoid re-renders if already false
          }
        });
      } catch (initError) {
        console.warn('⚠️ Error during app initialization (signout/clear):', initError);
        // Fallback routing and ensure checking is false
        router.replace('/Logins/Onboarding'); // Or a dedicated error screen
        if (checking) setChecking(false);
      }
      // Removed the setTimeout to make initialization faster
      // setChecking(false) is now primarily handled within onAuthStateChanged's finally block or initAuth's catch.
      // However, if onAuthStateChanged doesn't fire immediately (e.g. network issues for Firebase)
      // and there's no user, we might still need a timeout or a different way to stop "checking".
      // For now, let's rely on onAuthStateChanged. If it still hangs, this is the area to look at.
      // A failsafe:
      const failsafeTimeout = setTimeout(() => {
          if (checking) {
              console.warn("Failsafe: Still checking after 5s, forcing UI update.");
              setChecking(false);
              // Optionally route to a default page if auth state is still unknown
              if (!Fauth.currentUser) {
                  router.replace('/Logins/Onboarding');
              }
          }
      }, 5000); // 5 seconds failsafe

      // Clean up failsafe timeout
      return () => clearTimeout(failsafeTimeout);
    };

    initializeApp();

    // Setup notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received in foreground:', notification);
      // You can add logic here to update UI or show an in-app message
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📲 User tapped notification:', response);
      const data = response.notification.request.content.data;
      console.log('Notification data:', data);

      // Example: Navigate if the notification has specific data
      if (data && data.screen && router) { // Ensure router is available
        router.push(data.screen);
      } else if (data && data.postId && router) {
        router.push(`/Main_pages/ForumPost/${data.postId}`); // Adjust route as needed
      }
    });

    // Cleanup function
    return () => {
      console.log('🛑 Cleaning up RootLayout useEffect...');
      if (authUnsubscribe) {
        console.log('Unsubscribing Firebase auth listener.');
        authUnsubscribe();
      }
      if (notificationListener.current) {
        console.log('Removing notification received listener.');
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        console.log('Removing notification response listener.');
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]); // router as a dependency for router.replace

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20394A" />
        <Text style={styles.loadingText}>Initializing App...</Text>
      </View>
    );
  }

  return <Slot />; // This renders the rest of your app
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fefaf5', // Or your app's background color
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#20394A', // Or your app's primary text color
    fontSize: 16,
  },
});