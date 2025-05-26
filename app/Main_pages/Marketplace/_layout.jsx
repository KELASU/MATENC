// app/Main_pages/Marketplace/_layout.jsx
import { Stack } from 'expo-router';
import React from 'react';

export default function MarketplaceLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" // This will refer to Marketplace/index.jsx (your main marketplace page)
        options={{ 
          headerTitle: 'Marketplace',
          headerShown: false // Assuming your main tab layout handles the top header
        }} 
      />
      <Stack.Screen 
        name="CreateBlueprint" 
        options={{ 
          headerTitle: 'List New Blueprint',
          // presentation: 'modal', // Optional: open as a modal
          headerBackTitle: "Market"
        }} 
      />
      <Stack.Screen 
        name="Blueprint/[id]" // For blueprint details
        options={{ 
          headerTitle: 'Blueprint Details', // Title can be set dynamically in the component too
          headerBackTitle: "Market"
        }} 
      />
    </Stack>
  );
}