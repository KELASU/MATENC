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
  Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Fstore, Fauth } from '../../../FirebaseConfig'; // Adjust path
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Or your preferred icon set

const ChatListScreen = () => {
  const router = useRouter();
  const currentUser = Fauth.currentUser;
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(() => {
    if (!currentUser) {
      setChats([]);
      setIsLoading(false);
      setRefreshing(false);
      return () => {}; // Return empty unsubscribe for consistency
    }

    setIsLoading(true);
    const chatsRef = collection(Fstore, 'chats');
    // Query for chats where the current user is a participant
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc') // Show most recent chats first
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedChats = [];
      querySnapshot.forEach((doc) => {
        fetchedChats.push({ id: doc.id, ...doc.data() });
      });
      setChats(fetchedChats);
      setIsLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Error fetching chats: ", error);
      Alert.alert("Error", "Could not load your messages.");
      setIsLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [currentUser]);

  useFocusEffect( // Refetch when screen comes into focus
    useCallback(() => {
      const unsubscribe = fetchChats();
      return () => unsubscribe();
    }, [fetchChats])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChats();
  }, [fetchChats]);

  const getOtherParticipantInfo = (chat) => {
    if (!currentUser || !chat.participants || !chat.participantInfo) {
      return { displayName: "Unknown User", avatarUrl: null };
    }
    const otherUserId = chat.participants.find(uid => uid !== currentUser.uid);
    return chat.participantInfo[otherUserId] || { displayName: "User", avatarUrl: `https://ui-avatars.com/api/?name=U&background=random&color=fff` };
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    // Simple time or date formatting
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  const renderChatItem = ({ item: chat }) => {
    const otherParticipant = getOtherParticipantInfo(chat);
    const unreadCount = chat.unreadCount?.[currentUser.uid] || 0;

    return (
      <TouchableOpacity
        style={styles.chatItemContainer}
        onPress={() => router.push(`/Main_pages/Messages/ChatRoom/${chat.id}`)} // Navigate to specific chat room
      >
        <Image 
          source={{ uri: otherParticipant.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.displayName?.charAt(0) || 'U')}&background=random&color=fff`}} 
          style={styles.avatar} 
        />
        <View style={styles.chatTextContainer}>
          <Text style={styles.participantName} numberOfLines={1}>{otherParticipant.displayName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {chat.lastMessageSenderId === currentUser?.uid ? "You: " : ""}{chat.lastMessageText}
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EAEAEA" />
      </View>
    );
  }

  if (!currentUser) {
      return (
          <View style={styles.loadingContainer}>
              <Icon name="message-alert-outline" size={48} color="#A0D2DB" />
              <Text style={styles.emptyListText}>Please log in to see your messages.</Text>
          </View>
      )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
            !isLoading && <Text style={styles.emptyListText}>You have no messages yet.</Text>
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
    backgroundColor: '#20394A',
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
    borderBottomColor: '#325A75', // Darker separator
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: '#4A728D' // Placeholder background
  },
  chatTextContainer: {
    flex: 1, // Allows text to take available space and wrap
  },
  participantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EAEAEA',
    fontFamily: 'Roboto-Medium',
    marginBottom: 3,
  },
  lastMessage: {
    fontSize: 14,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
  },
  chatMetaContainer: {
    alignItems: 'flex-end',
    marginLeft: 10, // Space from text container
  },
  timestamp: {
    fontSize: 12,
    color: '#778A9A', // Muted color
    fontFamily: 'Roboto-Regular',
    marginBottom: 5,
  },
  unreadBadge: {
    backgroundColor: '#3EB489', // Accent color for unread
    borderRadius: 10,
    width: 20,
    height: 20,
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
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
  },
});

export default ChatListScreen;