// app/Main_pages/home.jsx
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { Fauth } from '../../FirebaseConfig';

export default function Home() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState({ blueprints: [], users: [], suppliers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(Fauth, (currentUser) => {
      setUser(currentUser);
      // fetchFavorites could be async; here we simulate then stop loading
      setFavorites({
        blueprints: ['LAD Kiryu 1', 'LAD Kiryu 2', 'LAD Kiryu 3'],
        users: ['MajimersIs1', 'MajimFan', 'MadDogFan'],
        suppliers: ['RGGTym', 'LikeaDrag', 'DojimaMan'],
      });
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20394A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.versionText}>Ver 0.0.01 Test Prototype Version</Text>
      <View style={styles.header}>
        <Text style={styles.title}>MATERIAL POKADEX ENCYCLOPEDIA</Text>
        <Image source={{ uri: 'https://i.ibb.co/tmS5b9N/profile.png' }} style={styles.profilePic} />
        <Text style={styles.greeting}>
          Good Afternoon, {user?.displayName || user?.email}
        </Text>
      </View>

      <Section title="Saved Blueprints" items={favorites.blueprints} />
      <Section title="Followed Users" items={favorites.users} />
      <Section title="Followed Suppliers" items={favorites.suppliers} />
    </ScrollView>
  );
}

function Section({ title, items }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title} &gt;</Text>
      <View style={styles.row}>
        {items.map((item) => (
          <View style={styles.circleItem} key={item}>
            <Image
              source={{ uri: 'https://i.ibb.co/Y7kTTBd/kiryu.png' }}
              style={styles.circleImage}
            />
            <Text style={styles.circleText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fefaf5'},
  versionText: { fontSize: 10, color: 'white', backgroundColor: '#20394A', },
  header: {
    alignItems: 'center',
    backgroundColor: '#20394A',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 20,
    marginBottom: 20,
  },
  title: { fontFamily: 'EdoSZ', fontSize: 18, color: '#fff' },
  profilePic: { width: 60, height: 60, borderRadius: 30, marginVertical: 10 },
  greeting: { fontSize: 14, color: '#fff' },
  sectionTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  circleItem: { alignItems: 'center', margin: 10 },
  circleImage: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black' },
  circleText: { fontSize: 10, marginTop: 4 },
});
