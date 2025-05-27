import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform, InteractionManager } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fauth, Fstore } from '../FirebaseConfig'; // Ensure this path is correct
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Slot, useRouter } from 'expo-router'; // Removed useSegments for this approach to simplify
import * as SplashScreen from 'expo-splash-screen';

// 1. Keep the native splash screen visible initially
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
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
      console.log("Attempting to get push token...");
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
      return token;
    } catch (e) {
      console.error("Error getting Expo push token:", e);
      Alert.alert('Token Error', `Failed to get push token: ${e.message}`);
      return null;
    }
  } else {
    console.log('Push notifications not supported for this device (emulator/simulator).');
    return null;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const [showJsLoading, setShowJsLoading] = useState(true); // Controls your custom JS loading screen
  const [authProcessed, setAuthProcessed] = useState(false); // Tracks if onAuthStateChanged has run at least once

  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    let authUnsubscribe;

    const initializeApp = async () => {
      try {
        // Optional: Forcing sign out on every app start (usually for debugging)
        // await AsyncStorage.clear();
        // await signOut(Fauth);
        // console.log('User signed out (debug).');

        authUnsubscribe = onAuthStateChanged(Fauth, async (user) => {
          console.log('onAuthStateChanged triggered. User:', user ? user.uid : 'null');
          try {
            if (user) {
              const token = await registerForPushNotificationsAsync();
              if (token) {
                await setDoc(
                  doc(Fstore, 'users', user.uid),
                  { expoPushToken: token, lastLogin: serverTimestamp() },
                  { merge: true }
                );
                console.log('✅ Push token saved to Firestore for user:', user.uid);
              } else if (Device.isDevice) {
                console.warn('⚠️ No push token retrieved for user on device:', user.uid);
              }

              InteractionManager.runAfterInteractions(() => {
                router.replace(user.emailVerified ? '/Main_pages/Home' : '/Logins/VerifyEmail');
              });
            } else {
              InteractionManager.runAfterInteractions(() => {
                router.replace('/Logins/Onboarding');
              });
            }
          } catch (error) {
            console.error('Error within onAuthStateChanged (after user check):', error);
            InteractionManager.runAfterInteractions(() => {
              router.replace('/Logins/Onboarding'); // Fallback
            });
          } finally {
            if (!authProcessed) setAuthProcessed(true); // Mark auth as processed
            // We will hide JS loader in another effect based on authProcessed
          }
        });

        // 2. Hide the NATIVE splash screen once JS is loaded and ready to show your JS loading screen.
        await SplashScreen.hideAsync();
        console.log("Native splash hidden. Custom JS loading screen should be visible.");

      } catch (initError) {
        console.warn('⚠️ Error during app initialization (before onAuthStateChanged setup or splash hide):', initError);
        if (!authProcessed) setAuthProcessed(true); // Ensure we can proceed to hide JS loader
        try { await SplashScreen.hideAsync(); } catch (e) { console.error("Error hiding splash in catch: ", e)}
      }
    };

    initializeApp();

    // Notification Listeners
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Notification received in foreground:', notification);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📲 User tapped notification:', response);
      const data = response.notification.request.content.data;
      if (router.isReady()) { // Check if router is ready before navigation
        if (data && data.screen) {
          router.push(data.screen);
        } else if (data && data.postId) {
          router.push(`/Main_pages/ForumPost/${data.postId}`); // Adjust path to your route structure
        }
      }
    });

    return () => {
      console.log('🛑 Cleaning up RootLayout useEffect...');
      if (authUnsubscribe) authUnsubscribe();
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [router]); // Added router as dependency for notification response handling

  // This effect handles hiding your custom JS loading screen
  useEffect(() => {
    if (authProcessed) {
      // Once Firebase auth state has been processed at least once,
      // the navigation logic inside onAuthStateChanged should have been triggered.
      // Now it's safe to hide your custom JS loading screen.
      const timer = setTimeout(() => { // Optional small delay to ensure navigation has started
        setShowJsLoading(false);
        console.log("Custom JS loading screen hidden.");
      }, 100); // Adjust or remove delay as needed
      return () => clearTimeout(timer);
    }
  }, [authProcessed]);


  return (
    <>
      {/* 3. Always render Slot so expo-router is happy */}
      <Slot />
      {/* 4. Conditionally render your custom JS loading screen as an overlay */}
      {showJsLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer, { zIndex: 10 }]}>
          <ActivityIndicator size="large" color="#20394A" />
          <Text style={styles.loadingText}>Initializing App...</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fefaf5', // Your loading screen background
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#20394A',
    fontSize: 16,
  },
});