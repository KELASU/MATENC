// app/Main_pages/Home.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    ScrollView, View, Text, StyleSheet, Image, ActivityIndicator,
    TouchableOpacity, FlatList, RefreshControl, SafeAreaView, Platform, StatusBar, Alert
} from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { Fauth, Fstore } from '../../FirebaseConfig'; // Adjust path if needed
import { useRouter, useFocusEffect } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeScreen = () => {
  const router = useRouter();
  const [currentUserData, setCurrentUserData] = useState(null);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [uploadedBlueprints, setUploadedBlueprints] = useState([]);
  const [purchasedBlueprints, setPurchasedBlueprints] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const user = Fauth.currentUser;
    if (!user) {
      setIsLoading(false);
      setIsInitialLoad(false);
      setRefreshing(false);
      setCurrentUserData(null);
      setFollowedUsers([]);
      setUploadedBlueprints([]);
      setPurchasedBlueprints([]);
      console.log("Home: No user, clearing data and stopping load.");
      return;
    }

    console.log("Home: Fetching data for user:", user.uid);
    // For subsequent fetches after initial load, set isLoading to true
    // For initial load, isInitialLoad already handles the full screen loader
    if (!isInitialLoad && !refreshing) {
        setIsLoading(true);
    }


    try {
      console.log("Home - Step 1: Fetching current user document...");
      const userDocRef = doc(Fstore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setCurrentUserData({ uid: userDocSnap.id, ...userDocSnap.data() });
        console.log("Home - Step 1: Current user document fetched.");
      } else {
        console.warn("Home - Step 1: Current user document not found in Firestore.");
        // Potentially set currentUserData to an empty state or handle appropriately
        setCurrentUserData({ uid: user.uid, displayName: user.displayName || user.email, email: user.email, followerCount: 0, followingCount: 0 }); // Fallback
      }

      console.log("Home - Step 2: Fetching followed users list...");
      const followingQuery = query(collection(Fstore, 'users', user.uid, 'following'), limit(3));
      const followingSnap = await getDocs(followingQuery);
      console.log(`Home - Step 2: Found ${followingSnap.docs.length} followed user entries.`);
      
      const followedUsersPromises = followingSnap.docs.map(followDoc => {
        console.log(`Home - Step 2a: Preparing to fetch profile for followed user ID: ${followDoc.id}`);
        return getDoc(doc(Fstore, 'users', followDoc.id));
      });
      const followedUsersDocs = await Promise.all(followedUsersPromises);
      setFollowedUsers(followedUsersDocs.filter(d => d.exists()).map(d => {
        console.log(`Home - Step 2b: Fetched profile for ${d.id}`);
        return { uid: d.id, ...d.data() };
      }));
      console.log("Home - Step 2: Followed users' profiles fetched.");

      console.log("Home - Step 3: Fetching uploaded blueprints...");
      const uploadedQuery = query(
        collection(Fstore, 'marketBlueprints'),
        where('sellerId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const uploadedSnap = await getDocs(uploadedQuery);
      setUploadedBlueprints(uploadedSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
      console.log(`Home - Step 3: Found ${uploadedSnap.docs.length} uploaded blueprints.`);

      console.log("Home - Step 4: Fetching purchased blueprints records...");
      const purchasedQuery = query(
        collection(Fstore, 'users', user.uid, 'purchasedBlueprints'),
        orderBy('purchasedAt', 'desc'),
        limit(3)
      );
      const purchasedSnap = await getDocs(purchasedQuery);
      console.log(`Home - Step 4: Found ${purchasedSnap.docs.length} purchased blueprint records.`);

      const purchasedBlueprintsPromises = purchasedSnap.docs.map(purchaseDoc => {
        console.log(`Home - Step 4a: Preparing to fetch details for purchased blueprint ID: ${purchaseDoc.id}`);
        return getDoc(doc(Fstore, 'marketBlueprints', purchaseDoc.id)); // purchaseDoc.id is the blueprintId
      });
      const purchasedBlueprintDocs = await Promise.all(purchasedBlueprintsPromises);
      setPurchasedBlueprints(
        purchasedBlueprintDocs.filter(d => d.exists()).map(d => {
          console.log(`Home - Step 4b: Fetched details for blueprint ${d.id}`);
          return { id: d.id, ...d.data() };
        })
      );
      console.log("Home - Step 4: Purchased blueprints' details fetched.");

    } catch (error) {
      console.error('Error fetching home screen data:', error.code, error.message, error);
      // Alert.alert("Error Loading Dashboard", `Could not load all dashboard data. ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
      setRefreshing(false);
    }
  }, [isInitialLoad, refreshing]); // Dependencies for fetchData

  // This effect calls fetchData when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Home screen focused, initiating data fetch sequence.");
      // setIsInitialLoad(true); // Set initial load to true to show full loader on focus
      fetchData();
    }, [fetchData]) // fetchData is now a dependency
  );
  
  // This effect manages user authentication state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(Fauth, (user) => {
      console.log("Home Auth State Changed. User:", user ? user.uid : "None");
      if (user) {
        // User is signed in.
        // fetchData will be called by useFocusEffect when the screen is focused.
        // Or if you want an immediate fetch on auth change and screen is already focused:
        // setCurrentUserData(prev => prev ? prev : {uid: user.uid}); // Optimistically set UID to trigger focus effect or fetchData
      } else {
        // User is signed out, clear all user-specific data
        setCurrentUserData(null);
        setFollowedUsers([]);
        setUploadedBlueprints([]);
        setPurchasedBlueprints([]);
        setIsInitialLoad(false); 
        setIsLoading(false);
      }
    });
    return () => unsubAuth(); // Cleanup on unmount
  }, []);


  const onRefresh = useCallback(() => {
    console.log("Home: Refresh initiated");
    setRefreshing(true);
    // isInitialLoad should be false here, so fetchData will set setIsLoading(true)
    fetchData();
  }, [fetchData]); // fetchData is a dependency

  const renderCircularItem = ({ item, type }) => {
    let name = "Unknown";
    let image = 'https://via.placeholder.com/80?text=?';
    let targetRoute = '/';

    if (type === 'user') {
        name = item.displayName || "User";
        image = item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=160&color=fff`;
        targetRoute = `/profile/${item.uid}`;
    } else if (type === 'blueprint') {
        name = item.blueprintName || "Blueprint";
        image = item.mainImageUrl || `https://via.placeholder.com/160?text=${encodeURIComponent(name.substring(0,3))}`;
        targetRoute = `/Main_pages/Marketplace/Blueprint/${item.id}`;
    }

    return (
        <TouchableOpacity style={styles.circleItemContainer} onPress={() => router.push(targetRoute)}>
            <Image source={{ uri: image }} style={styles.circleImage} />
            <Text style={styles.circleLabel} numberOfLines={2} ellipsizeMode="tail">{name}</Text>
        </TouchableOpacity>
    );
  };

  if (isInitialLoad && isLoading) { // Show full screen loader only on very first load or if isInitialLoad is reset
    return (
      <View style={styles.fullScreenLoader}>
        <ActivityIndicator size="large" color="#20394A" />
        <Text style={styles.loaderText}>Loading Dashboard...</Text>
      </View>
    );
  }
  
  if (!currentUserData && !isLoading) { // User is definitively logged out
      return (
          <SafeAreaView style={[styles.safeArea, styles.loggedOutView]}>
              <Icon name="home-account" size={60} color="#20394A" />
              <Text style={styles.loggedOutMainText}>Welcome to MATENC!</Text>
              <Text style={styles.loggedOutSubText}>Log in or Register to see your dashboard and explore.</Text>
              <TouchableOpacity style={styles.authButton} onPress={() => router.push('/Logins/Login')}>
                  <Text style={styles.authButtonText}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.authButton, styles.registerButtonAlt]} onPress={() => router.push('/Logins/Register')}>
                  <Text style={styles.authButtonText}>Register</Text>
              </TouchableOpacity>
          </SafeAreaView>
      )
  }
  
  // Combine uploaded and purchased, then deduplicate
  const combinedBlueprints = [
    ...uploadedBlueprints.map(bp => ({ ...bp, source: 'uploaded' })), 
    ...purchasedBlueprints.map(bp => ({ ...bp, source: 'purchased' }))
  ];
  const uniqueSavedBlueprints = Array.from(new Map(combinedBlueprints.map(item => [item.id, item])).values());


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#20394A"]} tintColor={"#20394A"} />}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerVersionTextContainer}>
            <Text style={styles.versionText}>Ver 0.0.01 Test Prototype Version</Text>
          </View>
          <Text style={styles.mainHeaderTitle}>MATERIAL POKADEX ENCYCLOPEDIA</Text>
          {currentUserData && (
            <>
            <TouchableOpacity onPress={() => router.push(`/profile/${currentUserData.uid}`)}>
                <Image 
                    source={{ uri: currentUserData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserData.displayName || 'User')}&background=20394A&color=fff&size=128&bold=true` }} 
                    style={styles.headerAvatar} 
                />
            </TouchableOpacity>
            <Text 
                style={styles.headerGreeting}
                testID="home_greeting_text">
              Good Afternoon, {currentUserData?.name || currentUserData?.email?.split('@')[0] || "User"}
            </Text>
            </>
          )}
        </View>

        {isLoading && !refreshing && uniqueSavedBlueprints.length === 0 && followedUsers.length === 0 && <ActivityIndicator style={{marginTop: 20, marginBottom: 20}} color="#20394A" />}

        <HomeSection 
            title="Saved Blueprints" 
            data={uniqueSavedBlueprints} 
            renderItem={({item}) => renderCircularItem({item, type: 'blueprint'})}
            onSeeAll={() => currentUserData && router.push(`/profile/${currentUserData.uid}/blueprints`)}
            emptyMessage="No blueprints saved or created yet."
        />
        <HomeSection 
            title="Followed Users" 
            data={followedUsers} 
            renderItem={({item}) => renderCircularItem({item, type: 'user'})}
            onSeeAll={() => currentUserData && router.push(`/profile/${currentUserData.uid}/following`)}
            emptyMessage="You are not following any users."
        />
        <HomeSection 
            title="Followed Suppliers" 
            data={[]} // Placeholder
            renderItem={({item}) => renderCircularItem({item, type: 'supplier'})}
            onSeeAll={() => Alert.alert("Coming Soon!", "Viewing all followed suppliers.")}
            emptyMessage="You are not following any suppliers yet."
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const HomeSection = ({ title, data, renderItem, onSeeAll, emptyMessage }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data && data.length > 0 && onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAllText}>&gt;</Text>
          </TouchableOpacity>
      )}
    </View>
    {data && data.length > 0 ? (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id || item.uid} // Use item.id for blueprints, item.uid for users
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionListContent}
      />
    ) : (
      <Text style={styles.emptySectionText}>{emptyMessage}</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loaderText: {
    color: '#20394A',
    marginTop: 10,
    fontFamily: 'Roboto-Regular'
  },
  loggedOutView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  loggedOutMainText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#20394A',
      textAlign: 'center',
      marginBottom: 10,
      fontFamily: 'Roboto-Bold', // Assuming Roboto is your primary font
  },
  loggedOutSubText: {
      fontSize: 16,
      color: '#555555',
      textAlign: 'center',
      marginBottom: 30,
      fontFamily: 'Roboto-Regular',
  },
  authButton: { // Style for login/register buttons on logged out screen
      backgroundColor: '#20394A',
      paddingVertical: 12,
      paddingHorizontal: 40,
      borderRadius: 25,
      marginBottom: 15,
      width: '80%',
      alignItems: 'center',
  },
  registerButtonAlt: {
    backgroundColor: '#3EB489', // A different color for register if needed
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold',
  },
  headerContainer: {
    backgroundColor: '#20394A',
    paddingBottom: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 50, // More padding for status bar
    alignItems: 'center',
    borderBottomLeftRadius: 25, // Rounded bottom corners
    borderBottomRightRadius: 25,
    marginBottom: 15, // Space below header
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerVersionTextContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 35, // Adjusted
    left: 15,
  },
  versionText: {
    fontSize: 10,
    color: '#A0D2DB',
  },
  mainHeaderTitle: { // Renamed for clarity from headerTitle
    fontSize: 18, 
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'EdoSZ', // Ensure this font is loaded in your project
    marginBottom: 15, // Space below title
  },
  headerAvatar: {
    width: 70, // Slightly smaller than image
    height: 70,
    borderRadius: 35,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#4A728D' // Placeholder color
  },
  headerGreeting: {
    fontSize: 16,
    color: '#EAEAEA',
    fontFamily: 'Roboto-Medium', // Assuming Roboto is your primary font
  },
  section: {
    marginBottom: 5, // Reduced space between sections
    paddingVertical: 10,
    backgroundColor: '#FFFFFF', // Keep sections on white background
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20, // Consistent padding
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16, // Slightly smaller section titles
    fontWeight: 'bold',
    color: '#20394A', // Darker text for titles
    fontFamily: 'Roboto-Bold',
  },
  seeAllText: {
    fontSize: 16, // Size for '>'
    color: '#20394A',
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold',
  },
  sectionListContent: {
    paddingLeft: 20, // Consistent padding
    paddingRight: 10, 
  },
  circleItemContainer: {
    width: 90, // Adjust width to fit 3+ items better
    alignItems: 'center',
    marginRight: 12, // Space between items
  },
  circleImage: {
    width: 70, // Circular image size
    height: 70,
    borderRadius: 35,
    backgroundColor: '#D0D0D0', // Lighter placeholder bg
    marginBottom: 6,
  },
  circleLabel: {
    fontSize: 12, // Smaller label text
    color: '#333333',
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
    height: 30, // Allow for two lines
  },
  emptySectionText: {
    fontSize: 14,
    color: '#666666', // Softer grey
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20, // More padding for empty state
    fontStyle: 'italic',
    fontFamily: 'Roboto-Regular',
  },
});

export default HomeScreen;