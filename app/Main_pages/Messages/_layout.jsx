import { Stack } from 'expo-router';
import React from 'react';

export default function MessagesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index" // Refers to Messages/index.jsx (Chat List)
        options={{
          headerTitle: 'My Messages',
          headerShown: true, // You can customize this header
          headerStyle: { backgroundColor: '#2B4C5C' }, // Example dark theme
          headerTintColor: '#EAEAEA',
          headerTitleStyle: { fontFamily: 'Roboto-Bold' },
        }}
      />
      <Stack.Screen
        name="ChatRoom/[chatId]" // Dynamic route for individual chat rooms
        options={{
          headerShown: true,
          // Title can be set dynamically in the ChatRoom component using Stack.Screen
          headerStyle: { backgroundColor: '#2B4C5C' },
          headerTintColor: '#EAEAEA',
          headerBackTitle: "Messages", // For iOS back button
          headerTitleStyle: { fontFamily: 'Roboto-Bold' },
        }}
      />
    </Stack>
  );
}