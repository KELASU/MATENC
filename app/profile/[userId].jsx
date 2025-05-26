import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, RefreshControl, SafeAreaView
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Fstore, Fauth } from '../../FirebaseConfig'; // Adjust path if needed
import {
  doc, getDoc, setDoc, deleteDoc, runTransaction,
  collection, query, where, getDocs, limit, writeBatch, serverTimestamp
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const UserProfileScreen = () => {
  const { userId: profileUserId } = useLocalSearchParams(); // UID of the profile being viewed
  const router = useRouter();
  const currentUser = Fauth.currentUser;

  const [profileUser, setProfileUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State for user's own blueprints (uploaded and purchased)
  const [uploadedBlueprints, setUploadedBlueprints] = useState([]);
  const [purchasedBlueprints, setPurchasedBlueprints] = useState([]);
  const [isLoadingBlueprints, setIsLoadingBlueprints] = useState(false);


  const fetchProfileData = useCallback(async () => {
    if (!profileUserId) return;
    console.log(`Workspaceing profile for: ${profileUserId}`);
    setIsLoading(true);
    try {
      // Fetch profile user document
      const userRef = doc(Fstore, 'users', profileUserId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setProfileUser({ uid: userSnap.id, ...userSnap.data() });

        // Check if current user is following this profile (if logged in and not their own profile)
        if (currentUser && currentUser.uid !== profileUserId) {
          const followingRef = doc(Fstore, 'users', currentUser.uid, 'following', profileUserId);
          const followingSnap = await getDoc(followingRef);
          setIsFollowing(followingSnap.exists());
        }
      } else {
        Alert.alert("Error", "User profile not found.");
        // router.back(); // or navigate to a 404 page
      }
    } catch (error) {
      console.error("Error fetching profile data: ", error);
      Alert.alert("Error", "Could not load profile.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [profileUserId, currentUser]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData();
    // if (profileUserId === currentUser?.uid) { fetchUserBlueprints(); } // Re-fetch blueprints if it's own profile
  }, [fetchProfileData, profileUserId, currentUser]);


  const handleFollowToggle = async () => {
    if (!currentUser) {
      Alert.alert("Login Required", "Please log in to follow users.");
      return;
    }
    if (currentUser.uid === profileUserId) {
      Alert.alert("Action Not Allowed", "You cannot follow yourself.");
      return;
    }

    setFollowLoading(true);
    const currentUserId = currentUser.uid;
    const targetUserId = profileUserId;

    const followingRef = doc(Fstore, 'users', currentUserId, 'following', targetUserId);
    const followerRef = doc(Fstore, 'users', targetUserId, 'followers', currentUserId);

    const userDocRef = doc(Fstore, "users", currentUserId);
    const targetUserDocRef = doc(Fstore, "users", targetUserId);

    try {
      await runTransaction(Fstore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        const targetUserDoc = await transaction.get(targetUserDocRef);

        if (!userDoc.exists() || !targetUserDoc.exists()) {
          throw "User document not found.";
        }

        const newIsFollowing = !isFollowing;
        let userFollowingCount = userDoc.data().followingCount || 0;
        let targetFollowerCount = targetUserDoc.data().followerCount || 0;

        if (newIsFollowing) { // Follow action
          transaction.set(followingRef, { followedAt: serverTimestamp() });
          transaction.set(followerRef, { followedAt: serverTimestamp() });
          userFollowingCount++;
          targetFollowerCount++;
        } else { // Unfollow action
          transaction.delete(followingRef);
          transaction.delete(followerRef);
          userFollowingCount = Math.max(0, userFollowingCount - 1);
          targetFollowerCount = Math.max(0, targetFollowerCount - 1);
        }
        transaction.update(userDocRef, { followingCount: userFollowingCount });
        transaction.update(targetUserDocRef, { followerCount: targetFollowerCount });
      });

      setIsFollowing(!isFollowing); // Toggle state locally
      // Update profileUser state with new follower count if viewing someone else's profile
      setProfileUser(prev => ({ ...prev, followerCount: prev.followerCount + (newIsFollowing ? 1 : -1) }));

    } catch (error) {
      console.error("Error following/unfollowing user: ", error);
      Alert.alert("Error", "Could not update follow status. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };


  if (isLoading || !profileUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAEAEA" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  const isOwnProfile = currentUser && currentUser.uid === profileUserId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: profileUser.displayName || 'User Profile' }} />
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#fff"]} tintColor={"#fff"} />}
      >
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: profileUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.displayName || 'User')}&background=random` }} 
            style={styles.avatar} 
          />
        <Text style={styles.displayName}>
            {profileUser?.name || profileUser?.email?.split('@')[0] || "User Name"}
        </Text>
          {profileUser.bio && <Text style={styles.bio}>{profileUser.bio}</Text>}
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statCount}>{profileUser.followerCount || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statCount}>{profileUser.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            {/* Add posts/blueprints count if available */}
          </View>

          {!isOwnProfile && currentUser && (
            <TouchableOpacity 
              style={[styles.followButton, isFollowing ? styles.unfollowButton : {}]} 
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {isOwnProfile && (
            <TouchableOpacity style={styles.editProfileButton} onPress={() => router.push('/Main_pages/EditProfile')}>
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Placeholder for user's content (e.g., blueprints listed, forum posts) */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <Text style={styles.placeholderText}>(User's blueprints and forum posts will appear here)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#20394A',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20394A',
  },
  loadingText: {
    color: '#EAEAEA',
    marginTop: 10,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: '#2B4C5C', // Slightly different background for header section
    borderBottomWidth: 1,
    borderBottomColor: '#325A75',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#A0D2DB'
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EAEAEA',
    fontFamily: 'Roboto-Bold',
    marginBottom: 5,
  },
  bio: {
    fontSize: 14,
    color: '#C5C5C5',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'Roboto-Regular',
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EAEAEA',
    fontFamily: 'Roboto-Bold',
  },
  statLabel: {
    fontSize: 13,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
  },
  followButton: {
    backgroundColor: '#3EB489',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center'
  },
  unfollowButton: {
    backgroundColor: '#505A70', // Different color for unfollow
    borderColor: '#A0D2DB',
    // borderWidth: 1,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
  },
  editProfileButton: {
    borderColor: '#A0D2DB',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 10, // If follow button isn't there
  },
  editProfileButtonText: {
      color: '#A0D2DB',
      fontSize: 15,
      fontFamily: 'Roboto-Medium',
  },
  contentSection: {
    marginTop: 10, // Space from header
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 10,
    fontFamily: 'Roboto-Medium',
  },
  placeholderText: {
    color: '#B0B0B0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default UserProfileScreen;