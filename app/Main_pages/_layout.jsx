import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function MainTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#20394A' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="Discover"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <FontAwesome name="search" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="Marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ color }) => <FontAwesome name="shopping-cart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Forum"
        options={{
          title: 'Forum',
          tabBarIcon: ({ color }) => <FontAwesome name="users" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <FontAwesome name="cog" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="EditProfile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Material"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="ForumPost"
        options={{
          href: null,
        }}
      />
    </Tabs>
    
  );
}
