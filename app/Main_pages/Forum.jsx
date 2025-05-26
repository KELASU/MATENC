// app/Main_pages/Forum.jsx
import { useFonts } from 'expo-font';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  AppState
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fstore, Fauth } from '../../FirebaseConfig';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc, // Keep if you plan to implement post editing
  runTransaction
} from 'firebase/firestore';
import { useFocusEffect, useRouter } from 'expo-router'; // Corrected useRouter import

const LAST_READ_TIMESTAMP_KEY = '@forum_last_read_timestamp';

const Forum = () => {
  const [fontsLoaded] = useFonts({
    'Roboto-Regular': require('../../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Medium': require('../../assets/fonts/Roboto-Medium.ttf'),
    'Roboto-Bold': require('../../assets/fonts/Roboto-Bold.ttf'),
  });

  const router = useRouter();
  const [forumPosts, setForumPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  const [editingPost, setEditingPost] = useState(null);
  const [viewingCommentsForPostId, setViewingCommentsForPostId] = useState(null);
  const [newComment, setNewComment] = useState('');

  const scrollViewRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const isFocusedRef = useRef(true); // Track focus state to avoid redundant updates

  useEffect(() => {
    const loadTimestamp = async () => {
      const storedTimestamp = await AsyncStorage.getItem(LAST_READ_TIMESTAMP_KEY);
      if (storedTimestamp) {
        setLastReadTimestamp(new Timestamp(parseInt(storedTimestamp, 10), 0));
      } else {
        setLastReadTimestamp(Timestamp.fromDate(new Date(0)));
      }
    };
    loadTimestamp();
  }, []);

  const updateLastRead = useCallback(async (reason = "unknown") => {
    console.log(`updateLastRead called by: ${reason}`);
    const now = Timestamp.now();
    try {
      await AsyncStorage.setItem(LAST_READ_TIMESTAMP_KEY, now.seconds.toString());
      // Only update state if the new timestamp is actually different to prevent loops
      setLastReadTimestamp((prevTimestamp) => {
        if (!prevTimestamp || prevTimestamp.toMillis() !== now.toMillis()) {
          console.log("Updated lastReadTimestamp in state:", now.toDate());
          return now;
        }
        return prevTimestamp;
      });
      setNewPostsAvailable(false);
    } catch (e) {
      console.error("Failed to save lastReadTimestamp to AsyncStorage", e);
    }
  }, []); // Empty dependency array for useCallback as it has no external deps

  useFocusEffect(
    useCallback(() => {
      console.log("Forum screen focused");
      isFocusedRef.current = true;
      // Update last read timestamp when the screen comes into focus
      // This will also trigger the useEffect for fetching posts if lastReadTimestamp changes
      updateLastRead("focus");

      return () => {
        console.log("Forum screen unfocused");
        isFocusedRef.current = false;
        // Optionally, you could also call updateLastRead here if you want to mark as read on blur.
        // updateLastRead("blur");
      };
    }, [updateLastRead]) // updateLastRead is memoized, so this effect primarily runs on focus/blur
  );

   useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("App has come to the foreground!");
        if(isFocusedRef.current) { // Only update if the forum screen is still the active one
            updateLastRead("appStateChange");
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [updateLastRead]); // updateLastRead is memoized


  useEffect(() => {
    if (lastReadTimestamp === null) {
        console.log("lastReadTimestamp is null, skipping post fetch.");
        return;
    }

    console.log("useEffect for fetching posts triggered by lastReadTimestamp change:", lastReadTimestamp?.toDate());
    setIsLoading(true);
    const postsCollectionRef = collection(Fstore, 'forumPosts');
    const q = query(postsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log("Firestore onSnapshot triggered for forumPosts.");
      const posts = [];
      let newFound = false;
      querySnapshot.forEach((docSnapshot) => {
        const postData = { ...docSnapshot.data(), id: docSnapshot.id };
        posts.push(postData);
        if (postData.createdAt && lastReadTimestamp && postData.createdAt.toMillis() > lastReadTimestamp.toMillis()) {
          newFound = true;
        }
      });
      setForumPosts(posts);
      if (newFound) {
        setNewPostsAvailable(true);
        console.log("New posts available since last read.");
      } else {
        setNewPostsAvailable(false);
        console.log("No new posts since last read or lastReadTimestamp updated.");
      }
      setIsLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Error fetching forum posts: ", error);
      Alert.alert("Error", "Could not fetch forum posts.");
      setIsLoading(false);
      setRefreshing(false);
    });

    return () => {
        console.log("Unsubscribing from forumPosts listener.");
        unsubscribe();
    };
  }, [lastReadTimestamp]);

  const onRefresh = useCallback(() => {
    console.log("Refresh initiated");
    setRefreshing(true);
    updateLastRead("refresh").finally(() => {
        // The useEffect dependent on lastReadTimestamp will re-evaluate posts.
        // setRefreshing(false) is called within the onSnapshot if data changes.
        // If no data change, we might need to set it false here after a timeout or if onSnapshot completes.
        // For now, onSnapshot should handle it.
    });
  }, [updateLastRead]);

  const handlePublishPost = async () => {
    // ... (validation for title, content, user - keep as is)
    if (!newPostTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your post.');
      return;
    }
    if (!newPostContent.trim()) {
      Alert.alert('Missing Content', 'Please enter content for your post.');
      return;
    }
    const currentUser = Fauth.currentUser;
    if (!currentUser) {
      Alert.alert('Not Authenticated', 'You need to be logged in to publish posts.');
      return;
    }

    setIsPublishing(true);
    const postsCollectionRef = collection(Fstore, 'forumPosts');
    try {
      await addDoc(postsCollectionRef, {
        title: newPostTitle,
        content: newPostContent,
        username: currentUser.displayName || currentUser.email.split('@')[0],
        userId: currentUser.uid,
        avatarUrl: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email.split('@')[0])}&background=random`,
        rating: 0,
        commentCount: 0,
        createdAt: serverTimestamp(),
      });
      setNewPostTitle('');
      setNewPostContent('');
      Alert.alert('Post Published!', 'Your new forum post is live.');
      // *** Corrected ScrollView method ***
      scrollViewRef.current?.scrollTo({ y: 0, animated: true }); 
      updateLastRead("publishPost");
    } catch (error) {
      console.error('Error publishing post: ', error);
      Alert.alert('Error', 'Could not publish your post. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePost = async (postId) => {
    // ... (keep as is)
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const postRef = doc(Fstore, 'forumPosts', postId);
              await deleteDoc(postRef);
              Alert.alert("Post Deleted", "The forum post has been successfully deleted.");
            } catch (error) {
              console.error("Error deleting post: ", error);
              Alert.alert("Error", "Could not delete the post.");
            }
          },
        },
      ]
    );
  };

  const handleEditPost = (post) => {
    // ... (keep as is - conceptual for now)
     Alert.alert("Edit Post", `Editing post: "${post.title}". (UI not implemented)`);
  };

  const handleViewComments = (postId) => {
    // ... (keep as is - conceptual for now)
     Alert.alert("View Comments", `Viewing comments for post ID: ${postId}. (UI not implemented in this screen)`);
     setViewingCommentsForPostId(postId);
  };

  const handleAddComment = async (postId) => {
    // ... (keep as is)
    if (!newComment.trim()) {
      Alert.alert("Empty Comment", "Please write something in your comment.");
      return;
    }
    const currentUser = Fauth.currentUser;
    if (!currentUser) {
      Alert.alert("Not Authenticated", "You need to be logged in to comment.");
      return;
    }

    const postRef = doc(Fstore, 'forumPosts', postId);
    const commentsRef = collection(postRef, 'comments');

    try {
      await addDoc(commentsRef, {
        text: newComment,
        userId: currentUser.uid,
        username: currentUser.displayName || currentUser.email.split('@')[0],
        avatarUrl: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email.split('@')[0])}&background=random`,
        createdAt: serverTimestamp(),
      });
      await runTransaction(Fstore, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
          throw "Document does not exist!";
        }
        const newCommentCount = (postDoc.data().commentCount || 0) + 1;
        transaction.update(postRef, { commentCount: newCommentCount });
      });
      setNewComment('');
      Alert.alert("Comment Added", "Your comment has been posted.");
    } catch (error) {
      console.error("Error adding comment: ", error);
      Alert.alert("Error", "Could not post your comment.");
    }
  };

  if (!fontsLoaded || (isLoading && forumPosts.length === 0 && lastReadTimestamp === null)) {
    // ... (loading UI - keep as is)
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading Forum...</Text>
      </View>
    );
  }

  const renderPostItem = (post) => {
    const isNew = post.createdAt && lastReadTimestamp && post.createdAt.toMillis() > lastReadTimestamp.toMillis();
    const isOwner = Fauth.currentUser && Fauth.currentUser.uid === post.userId;
  
    const navigateToPostDetail = () => {
      router.push(`/Main_pages/ForumPost/${post.id}`);
    };
  
    // The key prop should be on this TouchableOpacity if it's the direct child of the map
    return (
      <TouchableOpacity 
        key={post.id} // <<<< ADD KEY HERE
        onPress={navigateToPostDetail} 
        activeOpacity={0.7} 
        style={[styles.discussionContainer, isNew && styles.newPostHighlight]}
      >
        {/* Inner content of the post item... */}
        <View style={styles.discussionImagePlaceholder}>
          <Image
            source={{ uri: post.avatarUrl || 'https://ui-avatars.com/api/?background=random' }}
            style={styles.discussionAvatar}
          />
        </View>
        <View style={styles.discussionContent}>
          <Text style={styles.discussionTitle} numberOfLines={2} ellipsizeMode="tail">{post.title}</Text>
          <Text style={styles.discussionBody} numberOfLines={3} ellipsizeMode="tail">{post.content}</Text>
          <View style={styles.discussionInfo}>
            <Image
              source={{ uri: post.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.username)}&background=random&size=30` }}
              style={styles.profilePicture}
            />
            <TouchableOpacity onPress={() => router.push(`/profile/${post.userId}`)}>
              <Text style={styles.discussionUsername}>{post.username}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.discussionStats}>
            <View style={styles.discussionStatItem}>
              <Icon name="star-outline" color="#FFD700" size={16} />
              <Text style={styles.discussionStatText}>{post.rating || 0}/10</Text>
            </View>
            <TouchableOpacity style={styles.discussionStatItem} onPress={(e) => { e.stopPropagation(); navigateToPostDetail(); }}>
              <Icon name="message-text-outline" color="#FFFFFF" size={16} />
              <Text style={styles.discussionStatText}>{post.commentCount || 0}</Text>
            </TouchableOpacity>
          </View>
          {post.createdAt?.seconds && (
            <Text style={styles.timestampText}>
              {new Date(post.createdAt.seconds * 1000).toLocaleDateString()} {new Date(post.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          {isOwner && (
            <View style={styles.postActions}>
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleEditPost(post); }} style={styles.actionButton}>
                <Icon name="pencil" size={18} color="#A0D2DB" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} style={styles.actionButton}>
                <Icon name="delete" size={18} color="#FF6B6B" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    // ... (Main KeyboardAvoidingView and JSX structure - keep as is)
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#20394A" />
      <View style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
             <Text style={styles.versionText}>Ver 0.0.01 Test Prototype Version</Text>
            <View style={styles.titleAndAvatar}>
              <Text style={styles.titleTextTop}>MATENC FORUM</Text>
              <Image
                source={{ uri: Fauth.currentUser?.photoURL || 'https://ui-avatars.com/api/?name=User&background=random' }}
                style={styles.avatarPlaceholder}
              />
            </View>
          </View>

           {newPostsAvailable && !isLoading && (
            <TouchableOpacity onPress={() => updateLastRead("manualIndicatorClear")} style={styles.newPostsIndicator}>
              <Text style={styles.newPostsIndicatorText}>New posts available! Tap to mark as read.</Text>
            </TouchableOpacity>
          )}

          <View style={styles.forumsSection}>
             <View style={styles.searchAndFilter}>
              <View style={styles.searchContainer}>
                <Icon name="magnify" style={styles.searchIcon} color="#FFFFFF" size={20} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Forum (Not Implemented)"
                  placeholderTextColor="#9E9E9E"
                />
              </View>
              <TouchableOpacity style={styles.filterButton}>
                <Icon name="filter-variant" style={styles.filterIcon} color="#FFFFFF" size={20} />
                <Text style={styles.filterText}>Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView
            ref={scrollViewRef}
            style={styles.contentArea}
            contentContainerStyle={styles.scrollContentContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#fff"]} tintColor={"#fff"}/>}
          >
            {isLoading && forumPosts.length === 0 ? (
                 <View style={styles.loadingScreenInScroll}><ActivityIndicator size="small" color="#fff" /></View>
            ) : forumPosts.length === 0 && !isLoading ? (
                <View style={styles.noPostsContainer}>
                    <Text style={styles.noPostsText}>No forum posts yet. Be the first to publish one below!</Text>
                </View>
            ) : (
                forumPosts.map(renderPostItem)
            )}
          </ScrollView>
           <View style={styles.createPostOuterContainer}>
                <View style={styles.createPostContainer}>
                    <TextInput
                    style={styles.postInput}
                    placeholder="Post Title"
                    placeholderTextColor="#ccc"
                    value={newPostTitle}
                    onChangeText={setNewPostTitle}
                    />
                    <TextInput
                    style={[styles.postInput, styles.postContentInput]}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#ccc"
                    value={newPostContent}
                    onChangeText={setNewPostContent}
                    multiline
                    />
                    <TouchableOpacity
                    style={[styles.publishButton, isPublishing && styles.publishButtonDisabled]}
                    onPress={handlePublishPost}
                    disabled={isPublishing}
                    >
                    {isPublishing ? (
                        <ActivityIndicator color="#fff" size="small"/>
                    ) : (
                        <Text style={styles.publishButtonText}>Publish Post</Text>
                    )}
                    </TouchableOpacity>
                </View>
           </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
};

// Ensure your styles are complete here. I'm keeping the ones you provided earlier.
// If any styles are missing, please add them back from your previous complete version.
const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20394A',
  },
  loadingScreenInScroll: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontFamily: 'Roboto-Regular',
  },
  container: { flex: 1, backgroundColor: '#20394A' },
  gradient: { flex: 1, backgroundColor: '#20394A' },
  safeArea: { flex: 1, backgroundColor: '#20394A' },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#325A75',
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 10,
    color: '#9E9E9E',
    fontFamily: 'Roboto-Regular',
    textAlign: 'left',
    marginBottom: 5,
  },
  titleAndAvatar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleTextTop: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Roboto-Bold',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#757575',
    marginLeft: 15,
  },
  newPostsIndicator: {
    backgroundColor: '#FFD700',
    paddingVertical: 8,
    alignItems: 'center',
  },
  newPostsIndicatorText: {
    color: '#000',
    fontFamily: 'Roboto-Medium',
    fontSize: 14,
  },
  newPostHighlight: {
    borderColor: '#FFD700',
    borderWidth: 1.5,
  },
  forumsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#20394A',
  },
  searchAndFilter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#325A75',
    borderRadius: 20,
    marginRight: 10,
    paddingHorizontal: 15,
    height: 40,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Roboto-Regular',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#325A75',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    height: 40,
  },
  filterIcon: { marginRight: 8 },
  filterText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Roboto-Regular',
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 15,
  },
  scrollContentContainer: {
    paddingBottom: 10,
  },
  noPostsContainer: {
    marginTop: 50,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noPostsText: {
    color: '#B0B0B0',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    lineHeight: 24,
  },
  discussionContainer: {
    flexDirection: 'row',
    backgroundColor: '#2B4C5C',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  discussionImagePlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#4A728D',
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  discussionAvatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discussionContent: { flex: 1 },
  discussionTitle: {
    color: '#EAEAEA',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 6,
    fontFamily: 'Roboto-Medium',
  },
  discussionBody: {
    color: '#C5C5C5',
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    marginBottom: 10,
    lineHeight: 20,
  },
  discussionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profilePicture: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  discussionUsername: {
    color: '#A0D2DB',
    fontSize: 13,
    fontFamily: 'Roboto-Medium',
  },
  discussionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  discussionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  discussionStatText: {
    color: '#B0B0B0',
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
  },
  timestampText: {
    fontSize: 11,
    color: '#8A8A8A',
    fontFamily: 'Roboto-Regular',
    marginTop: 10,
    textAlign: 'right',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#325A75',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
    padding: 5,
  },
  actionButtonText: {
    color: '#A0D2DB',
    fontSize: 13,
    marginLeft: 5,
    fontFamily: 'Roboto-Medium',
  },
  inlineCommentSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#325A75',
  },
  inlineCommentTitle: {
    color: '#EAEAEA',
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#325A75',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    marginBottom: 8,
    minHeight: 40,
  },
  addCommentButton: {
    backgroundColor: '#3EB489',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  addCommentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Roboto-Bold',
  },
  createPostOuterContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#20394A',
    borderTopWidth: 1,
    borderTopColor: '#325A75',
  },
  createPostContainer: {
    backgroundColor: '#2B4C5C',
    borderRadius: 12,
    padding: 15,
  },
  postInput: {
    backgroundColor: '#325A75',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    marginBottom: 10,
  },
  postContentInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  publishButton: {
    backgroundColor: '#3EB489',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  publishButtonDisabled: {
    backgroundColor: '#2A785C',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
  },
});

export default Forum;