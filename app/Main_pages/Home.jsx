import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { Fauth } from '../../FirebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const Home = () => {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState({
    blueprints: [],
    users: [],
    suppliers: [],
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(Fauth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchFavorites(currentUser.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchFavorites = async (uid) => {
    // Simulate fetching favorites from Firestore or Realtime DB
    // Replace this with actual Firebase data fetching
    setFavorites({
      blueprints: ['LAD Kiryu 1', 'LAD Kiryu 2', 'LAD Kiryu 3'],
      users: ['MajimersIs1', 'MajimFan', 'MadDogFan'],
      suppliers: ['RGGTym', 'LikeaDrag', 'DojimaMan'],
    });
  };

  const renderCircleItem = (name, imageUri) => (
    <View style={styles.circleItem} key={name}>
      <Image source={{ uri: imageUri }} style={styles.circleImage} />
      <Text style={styles.circleText}>{name}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.versionText}>Ver 0.0.01 Test Prototype Version</Text>
      <View style={styles.header}>
        <Text style={styles.title}>MATERIAL POKADEX ENCYCLOPEDIA</Text>
        <Image source={{ uri: 'https://i.ibb.co/tmS5b9N/profile.png' }} style={styles.profilePic} />
        <Text style={styles.greeting}>Good Afternoon, {user?.displayName || user?.email}</Text>
      </View>

      <Section title="Saved Blueprints" items={favorites.blueprints} />
      <Section title="Followed Users" items={favorites.users} />
      <Section title="Followed Suppliers" items={favorites.suppliers} />
    </ScrollView>
  );
};

const Section = ({ title, items }) => (
  <View>
    <Text style={styles.sectionTitle}>{title} ></Text>
    <View style={styles.row}>
      {items.map((item) =>
        <View style={styles.circleItem} key={item}>
          <Image source={{ uri: 'https://i.ibb.co/Y7kTTBd/kiryu.png' }} style={styles.circleImage} />
          <Text style={styles.circleText}>{item}</Text>
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefaf5',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 10,
    color: '#888',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#20394A',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'EdoSZ',
    fontSize: 18,
    color: '#fff',
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginVertical: 10,
  },
  greeting: {
    fontSize: 14,
    color: '#fff',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  circleItem: {
    alignItems: 'center',
    margin: 10,
  },
  circleImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderColor: 'black',
    borderWidth: 2,
  },
  circleText: {
    fontSize: 10,
    marginTop: 4,
  },
});

export default Home;
