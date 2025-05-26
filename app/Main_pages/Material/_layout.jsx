// app/Main_pages/Material/_layout.jsx
import { Stack } from 'expo-router';
export default function MaterialLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: '#1F3A4A'}, headerTintColor: '#FFFFFF' }}>
           <Stack.Screen name="MaterialDetails" options={{ title: "Material" }}/>
         </Stack>;
}