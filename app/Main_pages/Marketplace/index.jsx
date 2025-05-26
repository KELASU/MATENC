// app/Main_pages/Marketplace/index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  Alert // Make sure Alert is imported
} from 'react-native';
import { useRouter } from 'expo-router';
import { Fstore, Fauth } from '../../../FirebaseConfig'; // Adjust path if needed
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'; // Removed Timestamp as it's not directly used here
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged
import { getDocs } from "firebase/firestore";

const MarketplaceScreen = () => {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(Fauth.currentUser);

  // Listen to auth state changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(Fauth, (user) => {
      setCurrentUser(user);
      console.log("Marketplace Auth User:", user ? user.uid : "No user");
    });
    return () => unsubAuth();
  }, []);

  const fetchBlueprints = useCallback(() => {
    // Only fetch if a user is authenticated, because rules require it
    if (!currentUser) {
      console.log("No authenticated user, skipping blueprint fetch.");
      setBlueprints([]); // Clear blueprints if user logs out
      setIsLoading(false);
      setRefreshing(false);
      return () => {}; // Return an empty unsubscribe function
    }

    console.log("Authenticated user found, attempting to fetch blueprints...");
    setIsLoading(true);
    const blueprintsRef = collection(Fstore, 'marketBlueprints');
    const q = query(blueprintsRef, orderBy('createdAt', 'desc'));

    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const fetchedBlueprints = [];
      querySnapshot.forEach((doc) => {
        fetchedBlueprints.push({ id: doc.id, ...doc.data() });
      });
      setBlueprints(fetchedBlueprints);
      setIsLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Error fetching blueprints (onSnapshot): ", error);
      Alert.alert("Error", `Could not fetch blueprints: ${error.message}`);
      setIsLoading(false);
      setRefreshing(false);
    });

    return unsubscribeFirestore;
  }, [currentUser]); // Re-run fetchBlueprints if currentUser changes

  useEffect(() => {
    const unsubscribe = fetchBlueprints();
    return () => unsubscribe();
  }, [fetchBlueprints]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // fetchBlueprints will be called again due to the useEffect dependency on it,
    // or more directly if currentUser state hasn't changed but you want to force.
    // For simplicity, changing refreshing state can indirectly lead to re-fetch if needed,
    // but fetchBlueprints is already robust with currentUser.
    // To be explicit, you could call it, but ensure it handles its own loading states.
    fetchBlueprints(); 
  }, [fetchBlueprints]);

  const renderBlueprintItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.itemContainer} 
      onPress={() => router.push(`/Main_pages/Marketplace/Blueprint/${item.id}`)}
    >
      <Image source={{ uri: item.mainImageUrl || 'https://via.placeholder.com/150?text=No+Image' }} style={styles.itemImage} />
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">{item.blueprintName}</Text>
        <Text style={styles.itemPrice}>{item.price > 0 ? `${item.currency || '$'}${item.price}` : 'Free'}</Text>
        <Text style={styles.itemSeller} numberOfLines={1} ellipsizeMode="tail">By: {item.sellerName}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && blueprints.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Marketplace</Text>
            {currentUser && ( // Only show add button if logged in
                <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => router.push('/Main_pages/Marketplace/CreateBlueprint')}
                >
                <Icon name="plus-circle-outline" size={28} color="#EAEAEA" />
                </TouchableOpacity>
            )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EAEAEA" />
          <Text style={styles.loadingText}>Loading Marketplace...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!currentUser && !isLoading) {
      return (
         <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Marketplace</Text>
            </View>
            <View style={styles.loadingContainer}>
                <Icon name="alert-circle-outline" size={48} color="#FFB300" />
                <Text style={styles.emptyListText}>Please log in to view the marketplace.</Text>
                {/* Optionally, add a login button here */}
                {/* <TouchableOpacity onPress={() => router.push('/Logins/Login')} style={styles.loginButton}>
                    <Text style={styles.loginButtonText}>Log In</Text>
                </TouchableOpacity> */}
            </View>
         </SafeAreaView>
      )
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        {currentUser && ( // Only show add button if logged in
            <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => router.push('/Main_pages/Marketplace/CreateBlueprint')}
            >
            <Icon name="plus-circle-outline" size={28} color="#EAEAEA" />
            </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={blueprints}
        renderItem={renderBlueprintItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
            !isLoading && <Text style={styles.emptyListText}>No blueprints listed yet. Be the first!</Text>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#fff"]} tintColor={"#fff"}/>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ... (Keep your existing styles from Marketplace/index.jsx)
  // Ensure these styles are present from the previous version:
  safeArea: {
    flex: 1,
    backgroundColor: '#20394A', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#325A75',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#EAEAEA',
    fontFamily: 'Roboto-Bold', 
  },
  addButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20394A',
  },
  loadingText: {
    marginTop: 10,
    color: '#B0B0B0',
    fontFamily: 'Roboto-Regular'
  },
  listContainer: {
    paddingHorizontal: 5,
    paddingBottom: 20,
  },
  itemContainer: {
    flex: 1/2, 
    margin: 5,
    backgroundColor: '#2B4C5C',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  itemImage: {
    width: '100%',
    height: 120, 
  },
  itemContent: {
    padding: 10,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#EAEAEA',
    marginBottom: 4,
    fontFamily: 'Roboto-Medium',
  },
  itemPrice: {
    fontSize: 14,
    color: '#3EB489', 
    marginBottom: 4,
    fontFamily: 'Roboto-Bold',
  },
  itemSeller: {
    fontSize: 12,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#B0B0B0',
    fontFamily: 'Roboto-Regular',
  },
  // Optional: Styles for a login button if you add one for the unauthenticated state
  // loginButton: {
  //   marginTop: 20,
  //   backgroundColor: '#3EB489',
  //   paddingVertical: 10,
  //   paddingHorizontal: 30,
  //   borderRadius: 5,
  // },
  // loginButtonText: {
  //   color: '#fff',
  //   fontSize: 16,
  //   fontFamily: 'Roboto-Bold',
  // }
});

export default MarketplaceScreen;