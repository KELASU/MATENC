// app/Main_pages/Messages/index.jsx
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
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Fstore, Fauth } from '../../../FirebaseConfig'; // Adjust path as necessary
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Or your preferred icon set
import { onAuthStateChanged } from 'firebase/auth';

const ChatListScreen = () => {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(Fauth.currentUser);
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(Fauth, (user) => {
      setAuthUser(user);
      // If user logs out while on this screen, clear chats
      if (!user) {
        setChats([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);


  const fetchChats = useCallback(() => {
    if (!authUser) {
      setChats([]);
      setIsLoading(false);
      setRefreshing(false);
      console.log("ChatList: No authenticated user, skipping chat fetch.");
      return () => {}; // Return empty unsubscribe for consistency
    }

    console.log("ChatList: Authenticated user found, attempting to fetch chats for:", authUser.uid);
    setIsLoading(true);
    const chatsRef = collection(Fstore, 'chats');
    const q = query(
      chatsRef,
      where('participant', 'array-contains', authUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
      const fetchedChats = [];
      querySnapshot.forEach((doc) => {
        fetchedChats.push({ id: doc.id, ...doc.data() });
      });
      setChats(fetchedChats);
      console.log(`ChatList: Fetched ${fetchedChats.length} chats.`);
      setIsLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("ChatList: Error fetching chats: ", error);
      Alert.alert("Error", "Could not load your messages.");
      setIsLoading(false);
      setRefreshing(false);
    });

    return unsubscribeFirestore;
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      console.log("ChatList: Screen focused.");
      const unsubscribe = fetchChats();
      return () => {
        console.log("ChatList: Unsubscribing from chats listener.");
        unsubscribe();
      };
    }, [fetchChats])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats(); // fetchChats handles its own isLoading and refreshing states
  }, [fetchChats]);

  const getOtherParticipantInfo = (chat) => {
    if (!authUser || !chat.participant || !chat.participantInfo) {
      return { displayName: "Unknown User", avatarUrl: null };
    }
    const otherUserId = chat.participant.find(uid => uid !== authUser.uid);
    if (!otherUserId) return { displayName: "Chat with Self?", avatarUrl: null}; // Should not happen in 2-party chat
    
    return chat.participantInfo[otherUserId] || { displayName: "User", avatarUrl: `https://ui-avatars.com/api/?name=U&background=random&color=fff` };
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return ''; // Check if it's a Firestore Timestamp
    const date = timestamp.toDate();
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const renderChatItem = ({ item: chat }) => {
    const otherParticipant = getOtherParticipantInfo(chat);
    const unreadCount = authUser ? (chat.unreadCount?.[authUser.uid] || 0) : 0;

    return (
      <TouchableOpacity
        style={styles.chatItemContainer}
        onPress={() => router.push(`/Main_pages/Messages/ChatRoom/${chat.id}`)}
      >
        <Image 
          source={{ uri: otherParticipant.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.displayName?.charAt(0) || 'U')}&background=4A728D&color=fff&bold=true`}} 
          style={styles.avatar} 
        />
        <View style={styles.chatTextContainer}>
          <Text style={styles.participantName} numberOfLines={1}>{otherParticipant.displayName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {chat.lastMessageSenderId === authUser?.uid ? "You: " : ""}{chat.lastMessageText || "No messages yet..."}
          </Text>
        </View>
        <View style={styles.chatMetaContainer}>
          <Text style={styles.timestamp}>{formatTimestamp(chat.updatedAt)}</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && chats.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EAEAEA" />
          <Text style={{color: '#EAEAEA', marginTop: 10}}>Loading Messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authUser) {
      return (
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
                <Icon name="message-alert-outline" size={48} color="#A0D2DB" />
                <Text style={styles.emptyListText}>Please log in to see your messages.</Text>
            </View>
          </SafeAreaView>
      )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
            !isLoading && <View style={styles.loadingContainer}><Text style={styles.emptyListText}>You have no active messages.</Text></View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#fff"]} tintColor={"#fff"} />
        }
        style={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#20394A', // Consistent dark theme
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20394A',
  },
  list: {
    flex: 1,
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#325A75',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#4A728D'
  },
  chatTextContainer: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    // fontWeight: 'bold', // Using font family for weight
    color: '#EAEAEA',
    fontFamily: 'Roboto-Medium', // Assuming you have this font
    marginBottom: 3,
  },
  lastMessage: {
    fontSize: 14,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
  },
  chatMetaContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#778A9A',
    fontFamily: 'Roboto-Regular',
    marginBottom: 5,
  },
  unreadBadge: {
    backgroundColor: '#3EB489',
    borderRadius: 10,
    minWidth: 20, // Ensure badge is circular even for single digit
    height: 20,
    paddingHorizontal: 5, // Add padding for numbers like '9+'
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#A0D2DB', // Lighter text for empty state
    fontFamily: 'Roboto-Regular',
  },
});

export default ChatListScreen;