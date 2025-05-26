// app/Main_pages/Marketplace/Blueprint/[id].jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Alert,
    TouchableOpacity, RefreshControl, SafeAreaView, Platform, StatusBar, FlatList,
    KeyboardAvoidingView, TextInput, scrollViewRef
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Fstore, Fauth } from '../../../../FirebaseConfig'; // Adjust path if needed
import {
  doc, getDoc, Timestamp, collection, addDoc, serverTimestamp, runTransaction, query, orderBy, onSnapshot, deleteDoc
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Linking from 'expo-linking'; // Make sure Linking is imported

const BlueprintDetailScreen = () => {
  const { id: blueprintId } = useLocalSearchParams();
  const router = useRouter();
  const currentUser = Fauth.currentUser;

  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // ... (other states: refreshing, isPurchased, purchaseLoading, reviews, etc. from previous version)
  const [isPurchased, setIsPurchased] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [refreshing, setRefreshing] = useState(false);


  const fetchBlueprintDetails = useCallback(async () => {
    // ... (fetchBlueprintDetails logic from previous version, including setIsPurchased)
    if (!blueprintId) return;
    setIsLoading(true);
    try {
      const blueprintRef = doc(Fstore, 'marketBlueprints', blueprintId);
      const docSnap = await getDoc(blueprintRef);
      if (docSnap.exists()) {
        const bpData = { id: docSnap.id, ...docSnap.data() };
        setBlueprint(bpData);
        if (currentUser && bpData.price > 0) { // Only check purchase if not free and user logged in
          const purchaseRef = doc(Fstore, 'users', currentUser.uid, 'purchasedBlueprints', blueprintId);
          const purchaseSnap = await getDoc(purchaseRef);
          setIsPurchased(purchaseSnap.exists());
        } else if (bpData.price === 0) {
            setIsPurchased(true); // Consider free items as "purchased" for download purposes
        }
      } else {
        Alert.alert("Error", "Blueprint not found.");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching blueprint details: ", error);
      Alert.alert("Error", "Could not load blueprint details.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [blueprintId, currentUser, router]);

  // ... (useEffect for fetchBlueprintDetails, useEffect for fetching reviews, onRefresh, handleBuyBlueprint, handleAddReview, renderReviewItem - from previous complete version)
  
  useEffect(() => {
    fetchBlueprintDetails();
  }, [fetchBlueprintDetails]);

  useEffect(() => {
    if (!blueprintId) return;
    setIsLoadingReviews(true);
    const reviewsRef = collection(Fstore, 'marketBlueprints', blueprintId, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = [];
      snapshot.forEach(doc => fetchedReviews.push({id: doc.id, ...doc.data()}));
      setReviews(fetchedReviews);
      setIsLoadingReviews(false);
    }, (error) => {
      console.error("Error fetching reviews: ", error);
      setIsLoadingReviews(false);
    });
    return () => unsubscribe();
  }, [blueprintId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBlueprintDetails();
  }, [fetchBlueprintDetails]);

  const handleBuyBlueprint = async () => {
    if (!currentUser) {
      Alert.alert("Authentication Required", "Please log in to purchase blueprints.");
      return;
    }
    if (!blueprint || !blueprintId || blueprint.price === 0) return; // No purchase for free items

    setPurchaseLoading(true);
    try {
      const purchaseRef = doc(Fstore, 'users', currentUser.uid, 'purchasedBlueprints', blueprintId);
      await setDoc(purchaseRef, {
        blueprintName: blueprint.blueprintName,
        purchasedAt: serverTimestamp(),
        sellerId: blueprint.sellerId,
        pricePaid: blueprint.price
      });
      Alert.alert("Purchase Successful!", `You have acquired "${blueprint.blueprintName}".`);
      setIsPurchased(true);
    } catch (error) {
      console.error("Error during purchase: ", error);
      Alert.alert("Purchase Failed", "An error occurred during the purchase. Please try again.");
    } finally {
      setPurchaseLoading(false);
    }
  };
  
  const handleDownloadBlueprint = () => {
    // *** USE blueprint.blueprintActualFileUrl ***
    if (blueprint && blueprint.blueprintActualFileUrl) {
        Linking.openURL(blueprint.blueprintActualFileUrl).catch(err => {
            console.error("Failed to open blueprint URL:", err);
            Alert.alert("Error", "Could not open the blueprint file link.");
        });
    } else {
        Alert.alert("No File", "No blueprint file is available for download for this listing.");
    }
  };

  const handleAddReview = async () => { /* ... same as before ... */ 
    if (!currentUser) { Alert.alert("Login Required", "Please login to add a review."); return; }
    if (newRating === 0 || !newReviewText.trim()) { Alert.alert("Missing Info", "Please provide a rating and review text."); return; }
    if (!blueprintId) return;

    const reviewsRef = collection(Fstore, 'marketBlueprints', blueprintId, 'reviews');
    const blueprintRef = doc(Fstore, 'marketBlueprints', blueprintId);
    try {
        await addDoc(reviewsRef, {
            userId: currentUser.uid,
            username: currentUser.displayName || currentUser.email.split('@')[0],
            avatarUrl: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email.split('@')[0])}&background=random`,
            rating: newRating,
            text: newReviewText,
            createdAt: serverTimestamp()
        });
        await runTransaction(Fstore, async (transaction) => {
            const bpDoc = await transaction.get(blueprintRef);
            if (!bpDoc.exists()) { throw "Blueprint not found!"; }
            const data = bpDoc.data();
            const oldRatingTotal = (data.averageRating || 0) * (data.numberOfRatings || 0);
            const newNumberOfRatings = (data.numberOfRatings || 0) + 1;
            const newAverageRating = (oldRatingTotal + newRating) / newNumberOfRatings;
            transaction.update(blueprintRef, {
                averageRating: parseFloat(newAverageRating.toFixed(2)),
                numberOfRatings: newNumberOfRatings
            });
        });
        setNewReviewText('');
        setNewRating(0);
        Alert.alert("Review Submitted", "Thank you for your review!");
    } catch (error) {
        console.error("Error submitting review:", error);
        Alert.alert("Error", "Could not submit your review.");
    }
  };

  const renderReviewItem = ({item}) => { /* ... same as before ... */ 
    return (
        <View style={styles.reviewItem}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
                <Image source={{uri: item.avatarUrl}} style={styles.reviewAvatar} />
                <Text style={styles.reviewUsername}>{item.username}</Text>
            </View>
            <View style={{flexDirection: 'row', marginBottom: 5}}>
                {[1,2,3,4,5].map(star => (
                    <Icon key={star} name={star <= item.rating ? "star" : "star-outline"} size={16} color="#FFD700" />
                ))}
            </View>
            <Text style={styles.reviewText}>{item.text}</Text>
            {item.createdAt?.seconds && <Text style={styles.reviewTimestamp}>{new Date(item.createdAt.seconds * 1000).toLocaleDateString()}</Text>}
        </View>
      );
  };


  if (isLoading || !blueprint) { /* ... same as before ... */ 
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAEAEA" />
        <Text style={styles.loadingText}>Loading Blueprint...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaDetail}>
      <Stack.Screen 
        options={{ 
            title: blueprint.blueprintName.length > 20 ? blueprint.blueprintName.substring(0,20) + "..." : blueprint.blueprintName 
        }} 
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{flex:1}}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
      <FlatList
        ref={scrollViewRef} // Make sure scrollViewRef is defined: const scrollViewRef = useRef(null);
        style={styles.scrollView}
        data={reviews} // Your reviews state
        renderItem={renderReviewItem} // Your function to render each review
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ // This should be your existing post details block
          <View style={styles.detailContentContainer}>
            <Image source={{ uri: blueprint.mainImageUrl || 'https://via.placeholder.com/400?text=Blueprint+Image' }} style={styles.detailImage} />
            <Text style={styles.detailName}>{blueprint.blueprintName}</Text>
            
            <TouchableOpacity style={styles.sellerInfo} onPress={() => router.push(`/profile/${blueprint.sellerId}`)}> 
              <Image source={{uri: blueprint.sellerAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(blueprint.sellerName)}&background=random`}} style={styles.sellerAvatar} />
              <Text style={styles.detailSeller}>Sold by: {blueprint.sellerName}</Text>
            </TouchableOpacity>

            <Text style={styles.detailPrice}>{blueprint.price > 0 ? `${blueprint.currency || '$'}${blueprint.price}` : 'Free'}</Text>
            
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.detailDescription}>{blueprint.description}</Text>

            {blueprint.tags && blueprint.tags.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagsContainer}>
                  {blueprint.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
             <View style={styles.ratingContainer}>
              {[1,2,3,4,5].map(star => (
                <Icon key={star} name={star <= (blueprint.averageRating || 0) ? "star" : "star-outline"} size={22} color="#FFD700" />
              ))}
              <Text style={styles.ratingText}>
                {blueprint.averageRating?.toFixed(1) || 'No ratings'} ({blueprint.numberOfRatings || 0} reviews)
              </Text>
            </View>

            {/* Action Buttons */}
            {currentUser && !isPurchased && blueprint.price > 0 && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.buyButton, purchaseLoading && styles.actionButtonDisabled]} 
                onPress={handleBuyBlueprint}
                disabled={purchaseLoading}
              >
                {purchaseLoading ? <ActivityIndicator color="#fff" /> : <Icon name="cart-check" size={20} color="#FFFFFF" style={{marginRight: 8}}/>}
                <Text style={styles.actionButtonText}>Buy Now</Text>
              </TouchableOpacity>
            )}
            
            {(isPurchased || blueprint.price === 0) && blueprint.blueprintActualFileUrl && (
                <TouchableOpacity style={[styles.actionButton, styles.downloadButton]} onPress={handleDownloadBlueprint}>
                    <Icon name="download" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                    <Text style={styles.actionButtonText}>Download Blueprint</Text>
                </TouchableOpacity>
            )}

            {currentUser && isPurchased && !blueprint.blueprintActualFileUrl && blueprint.price > 0 && (
                <Text style={styles.placeholderText}>Purchased (No downloadable file provided by seller)</Text>
            )}
            {blueprint.price === 0 && !blueprint.blueprintActualFileUrl && (
                <Text style={styles.placeholderText}>Free (No downloadable file provided)</Text>
            )}
            
            <TouchableOpacity style={[styles.actionButton, styles.contactButton]} onPress={() => Alert.alert("Contact Seller", `Contacting ${blueprint?.sellerName}. (Not implemented)`)}>
                <Icon name="message-text-outline" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                <Text style={styles.actionButtonText}>Contact Seller</Text>
            </TouchableOpacity>
             <Text style={styles.sectionTitle}>Reviews</Text>
          </View>
        }
        ListEmptyComponent={ // Provide the actual component or null
          !isLoadingReviews && reviews.length === 0 ? (
            <Text style={styles.noCommentsText}>No reviews yet. Be the first!</Text>
          ) : null
        }
        ListFooterComponent={ // Provide the actual component or null
          <>
            {isLoadingReviews && <ActivityIndicator style={{marginTop:10, marginBottom: 10}} size="small" color="#EAEAEA" />}
            {currentUser && ( // Only show add review if user is logged in
            <View style={styles.addReviewContainer}>
                <Text style={styles.addReviewTitle}>Leave a Review</Text>
                <View style={styles.starRatingInputContainer}>
                    {[1,2,3,4,5].map(star => (
                        <TouchableOpacity key={star} onPress={() => setNewRating(star)}>
                            <Icon name={star <= newRating ? "star" : "star-outline"} size={30} color="#FFD700" style={styles.starRatingInput} />
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                    style={styles.reviewInput}
                    placeholder="Write your review..."
                    placeholderTextColor="#777"
                    value={newReviewText}
                    onChangeText={setNewReviewText}
                    multiline
                />
                <TouchableOpacity style={styles.submitReviewButton} onPress={handleAddReview}>
                    <Text style={styles.submitReviewButtonText}>Submit Review</Text>
                </TouchableOpacity>
            </View>
            )}
          </>
        }
        refreshControl={ // Provide the actual RefreshControl component
            <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={["#fff"]} // For Android
                tintColor={"#fff"} // For iOS
            />
        }
        contentContainerStyle={styles.scrollContentContainer}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ... (your existing styles for BlueprintDetailScreen)
const styles = StyleSheet.create({
  safeAreaDetail: {
    flex: 1,
    backgroundColor: '#20394A',
  },
  detailScrollView: {
    flex: 1,
    backgroundColor: '#20394A',
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
      fontFamily: 'Roboto-Regular',
  },
  detailImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  detailContentContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#20394A',
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EAEAEA',
    marginBottom: 8,
    fontFamily: 'Roboto-Bold',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sellerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#4A728D'
  },
  detailSeller: {
    fontSize: 16,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
    marginBottom: 10,
  },
  detailPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3EB489',
    marginBottom: 15,
    fontFamily: 'Roboto-Bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#325A75',
    paddingBottom: 5,
    fontFamily: 'Roboto-Medium',
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#C5C5C5',
    fontFamily: 'Roboto-Regular',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#325A75',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#EAEAEA',
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 15,
    color: '#EAEAEA',
    fontFamily: 'Roboto-Regular',
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  buyButton: {
    backgroundColor: '#3EB489',
  },
  downloadButton: { // New style for download button
    backgroundColor: '#4A90E2', 
  },
  contactButton: {
    backgroundColor: '#505A70',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    textAlign: 'center',
  },
  placeholderText: {
    color: '#A0D2DB',
    fontStyle: 'italic',
    textAlign: 'left', // Changed to left for better readability in context
    marginVertical: 10,
    paddingHorizontal: 5, // Added some padding
    fontFamily: 'Roboto-Regular',
  },
  reviewItem: {
    backgroundColor: '#2B4C5C',
    padding: 12,
    marginHorizontal:15,
    marginBottom: 10,
    borderRadius: 6,
  },
  reviewAvatar: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    marginRight: 8,
    backgroundColor: '#4A728D'
  },
  reviewUsername: {
    color: '#A0D2DB',
    fontFamily: 'Roboto-Medium',
    fontSize: 13,
  },
  reviewText: {
    color: '#C5C5C5',
    fontFamily: 'Roboto-Regular',
    fontSize: 14,
    lineHeight: 18,
  },
  reviewTimestamp: {
      fontSize: 10,
      color: '#8A8A8A',
      fontFamily: 'Roboto-Regular',
      marginTop: 4,
      textAlign: 'right'
  },
  addReviewContainer: {
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    backgroundColor: '#2B4C5C',
    borderRadius: 8,
    marginBottom: 10, // Added margin for when it's the last item
  },
  addReviewTitle: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#EAEAEA',
    marginBottom: 10,
  },
  starRatingInputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    justifyContent: 'center',
  },
  starRatingInput: {
    marginHorizontal: 5,
  },
  reviewInput: {
    backgroundColor: '#325A75',
    color: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 10,
    fontFamily: 'Roboto-Regular',
  },
  submitReviewButton: {
    backgroundColor: '#3EB489',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitReviewButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Roboto-Bold',
    fontSize: 15,
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#B0B0B0',
    marginTop: 20,
    fontStyle: 'italic',
    fontFamily: 'Roboto-Regular',
    marginBottom: 20,
    paddingHorizontal: 15,
  }
});

export default BlueprintDetailScreen;