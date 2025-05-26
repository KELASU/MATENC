// app/profile/_layout.jsx
import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[userId]" 
        options={{ 
          headerShown: true, 
          // Title is set dynamically in [userId].jsx
          headerBackTitleVisible: false, // Optional: hide "Back" text on iOS for cleaner look
        }} 
      />
      {/* You can add other screens related to profiles here, e.g., edit profile */}
      {/* <Stack.Screen name="EditProfile" options={{ headerTitle: "Edit Profile" }} /> */}
    </Stack>
  );
}