// app/Main_pages/Marketplace/CreateBlueprint.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Fstorage, Fauth, Fstore } from '../../../FirebaseConfig'; // Adjust path as needed
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

async function uriToBlob(uri) {
  try {
    const response = await fetch(uri);
    const blobData = await response.blob(); // Renamed to avoid conflict if 'blob' is a global
    return blobData;
  } catch (error) {
    console.error("Error converting URI to Blob:", error);
    throw error; 
  }
}

const CreateBlueprintScreen = () => {
  const router = useRouter();
  const currentUser = Fauth.currentUser;

  const [blueprintName, setBlueprintName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [imageUri, setImageUri] = useState(null); // For display image asset URI
  const [blueprintFileAsset, setBlueprintFileAsset] = useState(null); // For blueprint file asset {name, uri, size, mimeType}
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to select an image.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickBlueprintDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setBlueprintFileAsset(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("File Pick Error", "An error occurred while picking the file.");
    }
  };

  // Generic file upload function
  const uploadFileToStorage = async (fileAsset, storagePath, isDisplayImage = false) => {
    if (!fileAsset || !fileAsset.uri) {
      throw new Error(`Invalid file asset for ${isDisplayImage ? 'display image' : 'blueprint file'}.`);
    }
    
    setUploadMessage(`Uploading ${isDisplayImage ? 'display image' : 'blueprint file'}...`);
    setProgress(0);

    const blob = await uriToBlob(fileAsset.uri);
    const storageRef = ref(Fstorage, storagePath);
    
    // Use fileAsset.mimeType if available, otherwise let Firebase try to determine
    const metadata = fileAsset.mimeType ? { contentType: fileAsset.mimeType } : undefined;
    const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(prog);
        },
        (error) => {
          console.error(`Storage Upload Error for ${storagePath}:`, error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (urlError){
            console.error(`Error getting download URL for ${storagePath}:`, urlError);
            reject(urlError);
          }
        }
      );
    });
  };

  const handleListBlueprint = async () => {
    if (!currentUser) {
      Alert.alert("Authentication Error", "You must be logged in.");
      return;
    }
    if (!blueprintName.trim() || !description.trim() || !price.trim() || !imageUri) {
      Alert.alert("Missing Fields", "Please fill in name, description, price, and select a display image.");
      return;
    }
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      Alert.alert("Invalid Price", "Please enter a valid non-negative price.");
      return;
    }

    setUploading(true);

    try {
      const imageFileName = imageUri.substring(imageUri.lastIndexOf('/') + 1);
      const imageStoragePath = `marketBlueprints/${currentUser.uid}/images/${Date.now()}_${imageFileName}`;
      const uploadedMainImageUrl = await uploadFileToStorage({ uri: imageUri, name: imageFileName, mimeType: 'image/jpeg' }, imageStoragePath, true); // Assume jpeg, or derive from picker
      console.log('Display image uploaded to:', uploadedMainImageUrl);

      let uploadedBlueprintFileUrl = null;
      if (blueprintFileAsset && blueprintFileAsset.uri) {
        const blueprintFileStoragePath = `marketBlueprints/${currentUser.uid}/blueprint_files/${Date.now()}_${blueprintFileAsset.name}`;
        uploadedBlueprintFileUrl = await uploadFileToStorage(blueprintFileAsset, blueprintFileStoragePath, false);
        console.log('Blueprint file uploaded to:', uploadedBlueprintFileUrl);
      }
      
      setUploadMessage('Saving blueprint details...');
      const blueprintData = {
        blueprintName,
        description,
        price: numericPrice,
        currency,
        mainImageUrl: uploadedMainImageUrl,
        blueprintActualFileUrl: uploadedBlueprintFileUrl || null,
        sellerId: currentUser.uid,
        sellerName: currentUser.displayName || currentUser.email.split('@')[0],
        sellerAvatarUrl: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || currentUser.email.split('@')[0])}&background=random`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        averageRating: 0,
        numberOfRatings: 0,
        tags: blueprintName.toLowerCase().split(" ").concat(description.toLowerCase().split(" ").slice(0,5)), // Basic tagging
      };
      
      await addDoc(collection(Fstore, "marketBlueprints"), blueprintData);
      
      Alert.alert("Blueprint Listed!", "Your blueprint is now live on the marketplace.");
      router.back();

    } catch (error) {
      console.error("Listing Process Error:", error);
      Alert.alert("Listing Failed", `An error occurred: ${error.message}. Check console for details.`);
    } finally {
      setUploading(false);
      setUploadMessage('');
      setProgress(0); // Reset progress
    }
  };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{flex: 1, backgroundColor: '#20394A'}} // Match your theme
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
    <ScrollView style={styles.createContainer} contentContainerStyle={styles.createScrollContent}>
      <Text style={styles.createLabel}>Blueprint Name*</Text>
      <TextInput
        style={styles.createInput}
        placeholder="e.g., Advanced Wooden Shield"
        placeholderTextColor="#777"
        value={blueprintName}
        onChangeText={setBlueprintName}
      />

      <Text style={styles.createLabel}>Description*</Text>
      <TextInput
        style={[styles.createInput, styles.createTextArea]}
        placeholder="Detailed description of the blueprint..."
        placeholderTextColor="#777"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.createLabel}>Price*</Text>
      <View style={styles.priceContainer}>
        <TextInput
            style={[styles.createInput, styles.priceInput]}
            placeholder="e.g., 10.99 or 0 for free"
            placeholderTextColor="#777"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
        />
        <TextInput 
            style={[styles.createInput, styles.currencyInput]}
            value={currency}
            onChangeText={setCurrency}
            placeholder="USD"
            placeholderTextColor="#777"
        />
      </View>

      <Text style={styles.createLabel}>Display Image*</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={pickImage}>
        <Icon name="image-plus" size={24} color="#EAEAEA" />
        <Text style={styles.pickerButtonText}>{imageUri ? "Change Display Image" : "Select Display Image"}</Text>
      </TouchableOpacity>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}

      <Text style={styles.createLabel}>Blueprint File (Optional)</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={pickBlueprintDocument}>
        <Icon name="file-upload-outline" size={24} color="#EAEAEA" />
        <Text style={styles.pickerButtonText}>{blueprintFileAsset ? `Selected: ${blueprintFileAsset.name}` : "Select Blueprint File"}</Text>
      </TouchableOpacity>
      {blueprintFileAsset && blueprintFileAsset.name && (
        <Text style={styles.fileNameText}>
          File: {blueprintFileAsset.name} 
          {blueprintFileAsset.size ? ` (${(blueprintFileAsset.size / 1024).toFixed(2)} KB)` : ''}
        </Text>
      )}

      {uploading && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#3EB489" />
          <Text style={styles.progressText}>{uploadMessage} ({progress}%)</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitButton, (uploading || !imageUri || !blueprintName.trim() || !description.trim() || !price.trim()) && styles.submitButtonDisabled]} 
        onPress={handleListBlueprint} 
        disabled={uploading || !imageUri || !blueprintName.trim() || !description.trim() || !price.trim()}
      >
        <Text style={styles.submitButtonText}>List Blueprint</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Use the styles from your previous CreateBlueprintScreen.jsx file
// Ensure these styles are defined as provided before or adjust as needed
const styles = StyleSheet.create({
  createContainer: {
    flex: 1,
    backgroundColor: '#20394A',
  },
  createScrollContent: {
    padding: 20,
  },
  createLabel: {
    fontSize: 16,
    color: '#A0D2DB',
    marginBottom: 8,
    fontFamily: 'Roboto-Medium',
  },
  createInput: {
    backgroundColor: '#2B4C5C',
    color: '#EAEAEA',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 15,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    borderWidth: 1,
    borderColor: '#325A75'
  },
  createTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 3,
    marginRight: 10,
  },
  currencyInput: {
    flex: 1,
  },
  pickerButton: { // Renamed from imagePickerButton for clarity
    flexDirection: 'row',
    backgroundColor: '#325A75',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pickerButtonText: { // Renamed from imagePickerText
    color: '#EAEAEA',
    marginLeft: 10,
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 10, // Reduced margin
    resizeMode: 'contain',
    backgroundColor: '#2B4C5C'
  },
  fileNameText: { 
    color: '#A0D2DB',
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
    marginBottom: 20, // Increased margin
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  progressText: {
    marginTop: 8,
    color: '#EAEAEA',
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
  },
  submitButton: {
    backgroundColor: '#3EB489',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#2A785C',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
  },
});

export default CreateBlueprintScreen;