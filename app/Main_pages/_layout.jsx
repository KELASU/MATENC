// app/Main_pages/_layout.jsx
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function MainTabs() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#20394A' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ color, size }) => {
          const icons = {
            home: 'home',
            shop: 'shopping-cart',
            social: 'users',
            settings: 'cog',
          };
          return <FontAwesome name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="Marketplace" />
      <Tabs.Screen name="Forum" />
      <Tabs.Screen name="Settings" />
    </Tabs>
  );
}
