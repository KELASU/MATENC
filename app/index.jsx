// app/index.js
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>MyApp</Text>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20394A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#fff',
    fontSize: 32,
    marginBottom: 20,
  },
});

