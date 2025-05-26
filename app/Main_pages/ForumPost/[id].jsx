import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  FlatList,
  SafeAreaView 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Fstore, Fauth } from '../../../FirebaseConfig'; // Adjust path if your FirebaseConfig is elsewhere
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp, // Ensure Timestamp is imported if you use it for type checking
  runTransaction,
  deleteDoc,
} from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For icons

const ForumPostDetail = () => {
  const { id: postId } = useLocalSearchParams(); // Get postId from route parameter
  const router = useRouter();
  const currentUser = Fauth.currentUser;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollViewRef = useRef(null);

  // Fetch the specific forum post
  const fetchPost = useCallback(async () => {
    if (!postId) return;
    console.log("Fetching post with ID:", postId);
    setIsLoadingPost(true);
    try {
      const postRef = doc(Fstore, 'forumPosts', postId);
      const docSnap = await getDoc(postRef);
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert("Error", "Post not found or you may not have permission to view it.");

      }
    } catch (error) {
      console.error("Error fetching post details: ", error);
      Alert.alert("Error", "Could not load the post.");
    } finally {
      setIsLoadingPost(false);
    }
  }, [postId]);

  // Fetch comments for the post
  useEffect(() => {
    if (!postId) return;

    setIsLoadingComments(true);
    const commentsRef = collection(Fstore, 'forumPosts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc')); // Show oldest comments first

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedComments = [];
      querySnapshot.forEach((docSnap) => { // Renamed doc to docSnap
        fetchedComments.push({ id: docSnap.id, ...docSnap.data() });
      });
      setComments(fetchedComments);
      setIsLoadingComments(false);
      setRefreshing(false); // Also stop refreshing indicator if comments load
    }, (error) => {
      console.error("Error fetching comments: ", error);
      // Alert.alert("Error", "Could not load comments."); // Maybe too many alerts
      setIsLoadingComments(false);
      setRefreshing(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [postId]);

  // Initial fetch of the post
  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPost(); // This will re-fetch the post, and the comment listener is already active
  }, [fetchPost]);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert("Empty Comment", "Please write something in your comment.");
      return;
    }
    if (!currentUser) {
      Alert.alert("Not Authenticated", "You need to be logged in to comment.");
      return;
    }
    if (!postId || !post) return; // Ensure post is loaded

    setIsSubmittingComment(true);
    const postRef = doc(Fstore, 'forumPosts', postId);
    const commentsCollectionRef = collection(postRef, 'comments');

    try {
      await addDoc(commentsCollectionRef, {
        text: newComment,
        userId: currentUser.uid,
        username: currentUser.displayName || currentUser.email.split('@')[0],
        avatarUrl: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email.split('@')[0])}&background=random`,
        createdAt: serverTimestamp(),
      });

      // Update commentCount on the post using a transaction
      await runTransaction(Fstore, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
          throw "Post document does not exist!";
        }
        const currentCommentCount = postDoc.data().commentCount || 0;
        transaction.update(postRef, { commentCount: currentCommentCount + 1 });
      });

      setNewComment('');
      // Attempt to scroll to the end of the ScrollView to show new comment
      // This might need adjustment if using FlatList for comments within ScrollView
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error("Error adding comment: ", error);
      Alert.alert("Error", "Could not post your comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!postId || !commentId) return;
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const commentRef = doc(Fstore, 'forumPosts', postId, 'comments', commentId);
              await deleteDoc(commentRef);

              const postRef = doc(Fstore, 'forumPosts', postId);
              await runTransaction(Fstore, async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists()) {
                  throw "Post document does not exist!";
                }
                const currentCommentCount = postDoc.data().commentCount || 0;
                transaction.update(postRef, { commentCount: Math.max(0, currentCommentCount - 1) });
              });
              Alert.alert("Comment Deleted");
            } catch (error) {
              console.error("Error deleting comment:", error);
              Alert.alert("Error", "Could not delete comment.");
            }
          },
        },
      ]
    );
  };

  const renderCommentItem = ({ item }) => {
    const isCommentOwner = currentUser && currentUser.uid === item.userId;
    return (
      <View style={styles.commentItemContainer}>
        <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=random&size=30` }} style={styles.commentAvatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{item.username}</Text>
            {item.createdAt?.seconds && (
              <Text style={styles.commentTimestamp}>
                {new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
        {isCommentOwner && (
          <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteCommentButton}>
            <Icon name="delete-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoadingPost || !post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20394A" />
        <Text>Loading post...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: post?.title ? (post.title.length > 20 ? post.title.substring(0, 20) + "..." : post.title) : 'Post Details', 
          headerBackTitle: "Forum" 
        }} 
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? (useRouter().stack?.length > 1 ? 60 : 90) : 0} // Adjust offset
      >
        <FlatList
          ref={scrollViewRef} // FlatList also has scrollTo methods
          style={styles.scrollView}
          data={comments}
          renderItem={renderCommentItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.postContainer}>
              <View style={styles.postHeader}>
                <Image source={{ uri: post.avatarUrl || 'https://ui-avatars.com/api/?background=random' }} style={styles.postAvatar} />
                <View>
                  <Text style={styles.postUsername}>{post.username}</Text>
                  {post.createdAt?.seconds && (
                    <Text style={styles.postTimestamp}>
                      {new Date(post.createdAt.seconds * 1000).toLocaleDateString()} {new Date(post.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postContentText}>{post.content}</Text>
              <View style={styles.commentsTitleContainer}>
                 <Text style={styles.commentsTitle}>Comments</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            !isLoadingComments && <Text style={styles.noCommentsText}>Be the first to comment!</Text>
          }
          ListFooterComponent={
            isLoadingComments ? <ActivityIndicator style={{marginTop: 20}} size="small" color="#20394A" /> : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#20394A"]} tintColor={"#20394A"}/>}
          contentContainerStyle={styles.scrollContentContainer}
        />

        <View style={styles.addCommentContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#999"
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitCommentButton, isSubmittingComment && styles.submitCommentButtonDisabled]}
            onPress={handleAddComment}
            disabled={isSubmittingComment}
          >
            {isSubmittingComment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Add your styles here - these are from my previous suggestion, ensure they match your app's theme
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#20394A', // Dark background for the page to match Forum.jsx
  },
  container: {
    flex: 1,
    backgroundColor: '#20394A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20394A',
  },
  scrollView: { // This style is for FlatList now
    flex: 1,
  },
  scrollContentContainer: { // For FlatList
    paddingBottom: 10,
  },
  postContainer: {
    backgroundColor: '#2B4C5C', // Darker item background
    padding: 15,
    marginHorizontal: 10,
    marginTop:10,
    borderRadius: 8,
    // elevation: 1, // Subtle shadow
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.05,
    // shadowRadius: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
    backgroundColor: '#4A728D'
  },
  postUsername: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#EAEAEA',
    fontFamily: 'Roboto-Medium',
  },
  postTimestamp: {
    fontSize: 12,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
  },
  postTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FFFFFF',
    fontFamily: 'Roboto-Bold',
  },
  postContentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#E0E0E0',
    fontFamily: 'Roboto-Regular',
  },
  commentsTitleContainer: {
    borderTopWidth: 1,
    borderTopColor: '#325A75',
    marginTop: 20,
    paddingTop: 15,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#EAEAEA',
    fontFamily: 'Roboto-Medium',
  },
  commentItemContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal:15, // Added padding for comments within the post container
    borderTopWidth: 1, // Separator for comments
    borderTopColor: '#325A75',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    marginTop: 2,
    backgroundColor: '#4A728D'
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  commentUsername: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#A0D2DB', // Accent color
    fontFamily: 'Roboto-Medium',
  },
  commentTimestamp: {
    fontSize: 11,
    color: '#8A8A8A',
    fontFamily: 'Roboto-Regular',
  },
  commentText: {
    fontSize: 14,
    color: '#C5C5C5',
    lineHeight: 20,
    fontFamily: 'Roboto-Regular',
  },
  deleteCommentButton: {
    paddingLeft: 10, // space from comment text
    paddingVertical: 5, // make it easier to tap
  },
  noCommentsText: {
    textAlign: 'center',
    color: '#B0B0B0',
    marginTop: 20,
    fontStyle: 'italic',
    fontFamily: 'Roboto-Regular',
    marginBottom: 20,
  },
  addCommentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#325A75', // Darker border
    backgroundColor: '#20394A', // Match page background
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#325A75', // Darker input
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginRight: 10,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Roboto-Regular',
    maxHeight: 100,
  },
  submitCommentButton: {
    backgroundColor: '#3EB489', // Accent color
    padding: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitCommentButtonDisabled: {
    backgroundColor: '#2A785C',
  },
});

export default ForumPostDetail;