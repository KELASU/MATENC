// app/Main_pages/ForumPost/_layout.jsx
import { Stack } from 'expo-router';
import React from 'react';

export default function ForumPostLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="[id]" 
        options={{ 
          headerShown: false, 
          // The title will be set dynamically in the [id].jsx file
          // headerBackTitleVisible: false, // Optional: hide "Back" text on iOS
        }} 
      />
    </Stack>
  );
}