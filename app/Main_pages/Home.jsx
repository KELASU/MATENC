// app/Main_pages/home.jsx
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Fauth, Fstore } from '../../FirebaseConfig'; // Ensure Fdb is your Firestore instance
import { addFavorite, removeFavorite } from '../hooks/useFavorites'; 
import { TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons'; 

export default function Home() {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState({ blueprints: [], users: [], suppliers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(Fauth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Check if the user's email is verified
        if (!currentUser.emailVerified) {
          // Redirect to the email verification page
          router.replace('/Logins/VerifyEmail');
          return;
        }
        try {
          const userDoc = await getDoc(doc(Fstore, 'users', currentUser.uid));
          const userData = userDoc.data();
  
          setFavorites({
            blueprints: userData?.favorites?.blueprints || [],
            users: userData?.favorites?.users || [],
            suppliers: userData?.favorites?.suppliers || [],
          });
        } catch (error) {
          console.error('Error fetching user favorites:', error);
        }
      }
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
  const typeMap = {
    'Saved Blueprints': 'blueprints',
    'Followed Users': 'users',
    'Followed Suppliers': 'suppliers',
  };
  const type = typeMap[title];

  return (
    <View>
      <Text style={styles.sectionTitle}>{title} &gt;</Text>
      <View style={styles.row}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>No {title.toLowerCase()} yet.</Text>
        ) : (
          items.map((item) => (
            <View style={styles.circleItem} key={item}>
              <Image
                source={{ uri: 'https://i.ibb.co/Y7kTTBd/kiryu.png' }}
                style={styles.circleImage}
              />
              <Text style={styles.circleText}>{item}</Text>
              <TouchableOpacity
                onPress={async () => {
                  if (!user) return;
                  if (favorites[type].includes(item)) {
                    await removeFavorite(user.uid, type, item);
                    setFavorites(prev => ({
                      ...prev,
                      [type]: prev[type].filter(i => i !== item),
                    }));
                  } else {
                    await addFavorite(user.uid, type, item);
                    setFavorites(prev => ({
                      ...prev,
                      [type]: [...prev[type], item],
                    }));
                  }
                }}
              >
                <AntDesign
                  name={favorites[type].includes(item) ? 'heart' : 'hearto'}
                  size={20}
                  color="red"
                />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fefaf5' },
  versionText: { fontSize: 10, color: 'white', backgroundColor: '#20394A' },
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
  sectionTitle: { fontWeight: 'bold', marginTop: 10, marginBottom: 5, paddingLeft: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  circleItem: { alignItems: 'center', margin: 10 },
  circleImage: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black' },
  circleText: { fontSize: 10, marginTop: 4 },
  emptyText: { fontSize: 12, fontStyle: 'italic', color: '#888', marginLeft: 10 },
});
