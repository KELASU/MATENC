// app/Main_pages/EditProfile.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image,
  Alert, ActivityIndicator, Platform, KeyboardAvoidingView, SafeAreaView
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Fauth, Fstore, Fstorage } from '../../FirebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth'; // Firebase Auth profile update
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

async function uriToBlob(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

const EditProfileScreen = () => {
  const router = useRouter();
  const currentUser = Fauth.currentUser;

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [imageUri, setImageUri] = useState(null); // Local URI for new image
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null); // Current PFP URL from Firestore
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch current profile data
  useEffect(() => {
    if (currentUser) {
      setIsLoadingData(true);
      const userDocRef = doc(Fstore, 'users', currentUser.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setDisplayName(userData.name || ''); // Use 'name' field from Firestore
          setBio(userData.bio || '');
          setCurrentAvatarUrl(userData.avatarUrl || null);
        }
      }).catch(error => {
        console.error("Error fetching user data for edit:", error);
        Alert.alert("Error", "Could not load profile data.");
      }).finally(() => {
        setIsLoadingData(false);
      });
    } else {
      setIsLoadingData(false);
      // router.replace('/Logins/Login'); // Redirect if no user
    }
  }, [currentUser]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is needed to select an image.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square for profile pictures
      quality: 0.5, // Compress image
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri); // Store local URI of the new image
    }
  };

  const handleSaveChanges = async () => {
    if (!currentUser) return;
    if (!displayName.trim()) {
        Alert.alert("Name Required", "Please enter a display name.");
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    let newAvatarUrl = currentAvatarUrl; // Assume current URL unless a new image is picked

    try {
      // Upload new profile picture if one was selected
      if (imageUri) {
        const blob = await uriToBlob(imageUri);
        const fileName = imageUri.substring(imageUri.lastIndexOf('/') + 1);
        const storagePath = `users/${currentUser.uid}/profilePictures/${fileName}`;
        const storageRef = ref(Fstorage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setUploadProgress(prog);
            },
            (error) => {
              console.error("PFP Upload Error:", error);
              reject(error);
            },
            async () => {
              newAvatarUrl = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('New PFP URL:', newAvatarUrl);
              resolve();
            }
          );
        });
      }

      // Update Firestore document
      const userDocRef = doc(Fstore, 'users', currentUser.uid);
      const updatedData = {
        name: displayName, // Update the 'name' field
        bio: bio,
        avatarUrl: newAvatarUrl,
        // updatedAt: serverTimestamp(), // Optionally add an updated timestamp
      };
      await updateDoc(userDocRef, updatedData);

      // Optionally, update Firebase Auth profile (displayName and photoURL)
      await updateAuthProfile(currentUser, {
        displayName: displayName,
        photoURL: newAvatarUrl,
      });
      console.log("Firebase Auth profile updated.");

      Alert.alert("Profile Updated", "Your profile has been successfully updated.");
      router.back(); // Go back to settings or previous screen

    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Update Failed", `An error occurred: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20394A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Stack.Screen options={{ title: "Edit Profile" }} />
      <View style={styles.avatarContainer}>
        <Image 
          source={{ uri: imageUri || currentAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || currentUser?.email?.split('@')[0] || 'U')}&background=random&color=fff` }} 
          style={styles.avatar} 
        />
        <TouchableOpacity style={styles.changeAvatarButton} onPress={pickImage}>
          <Icon name="camera-outline" size={20} color="#EAEAEA" />
          <Text style={styles.changeAvatarText}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Display Name / Username*</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your display name"
        placeholderTextColor="#777"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tell us about yourself..."
        placeholderTextColor="#777"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
      />

      {isUploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#3EB489" />
          <Text style={styles.progressText}>Uploading... {imageUri ? `${uploadProgress}%` : ''}</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.saveButton, isUploading && styles.saveButtonDisabled]} 
        onPress={handleSaveChanges}
        disabled={isUploading}
      >
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles for EditProfileScreen
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E3A47',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E3A47',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A728D', // Placeholder
    marginBottom: 10,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#325A75',
  },
  changeAvatarText: {
    color: '#A0D2DB',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Roboto-Medium'
  },
  label: {
    fontSize: 16,
    color: '#A0D2DB',
    marginBottom: 8,
    fontFamily: 'Roboto-Medium',
  },
  input: {
    backgroundColor: '#2B4C5C',
    color: '#EAEAEA',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 20,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    borderWidth: 1,
    borderColor: '#325A75'
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  progressText: {
    marginLeft: 10,
    color: '#EAEAEA',
    fontFamily: 'Roboto-Regular',
  },
  saveButton: {
    backgroundColor: '#3EB489',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#2A785C',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
  },
});

export default EditProfileScreen;