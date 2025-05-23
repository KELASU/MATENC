// app/Logins/Loggedin.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router'; // If you need navigation

export default function LoggedInPage() {
  // Your screen content
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome! You are logged in.</Text>
      {/* Example button to navigate somewhere else */}
      {/* <TouchableOpacity onPress={() => router.replace('/Main_pages/Home')}>
        <Text>Go to Home</Text>
      </TouchableOpacity> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
  },
});