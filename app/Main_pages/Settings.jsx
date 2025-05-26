// app/Main_pages/Settings.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Fauth, Fstore } from '../../FirebaseConfig';
import { useRouter, useFocusEffect } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SettingsScreen = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const currentUser = Fauth.currentUser;
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    if (currentUser) {
      setIsLoading(true);
      try {
        const userRef = doc(Fstore, 'users', currentUser.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          setProfile({ uid: snapshot.id, ...snapshot.data() });
        } else {
          Alert.alert('Error', 'User data not found. Please try logging out and back in.');
        }
      } catch (error) {
        console.error("Error fetching profile: ", error);
        Alert.alert('Error', 'Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
      setProfile(null);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  // *** CORRECTED FUNCTION ***
  const handleSettingUpdate = async (fieldPath, value) => {
    if (!currentUser || !profile) {
      Alert.alert("Error", "User profile not loaded. Cannot update settings.");
      return;
    }

    // fieldPath is now expected to be a dot-notation string like "notificationSettings.forumPosts"
    console.log(`Attempting to update Firestore field: ${fieldPath} to ${value} for user ${currentUser.uid}`);
    
    const updatePayload = { [fieldPath]: value }; // This creates an object like { "notificationSettings.forumPosts": true }

    try {
      const userRef = doc(Fstore, 'users', currentUser.uid);
      await updateDoc(userRef, updatePayload); // Firestore SDK handles dot notation for map updates

      // Optimistically update local state robustly for nested paths
      const keys = fieldPath.split('.');
      if (keys.length === 2) { // e.g., 'notificationSettings.forumPosts'
        setProfile(prev => ({
          ...prev,
          [keys[0]]: { // e.g., notificationSettings
            ...(prev[keys[0]]), // Spread existing settings in that map
            [keys[1]]: value   // Update specific sub-key
          }
        }));
      } else if (keys.length === 1) { // Should not happen with current toggles/pickers
         setProfile(prev => ({ ...prev, ...updatePayload }));
      }
      
      const settingName = keys[keys.length - 1].replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${settingName} preference updated to ${value}`);
      // Alert.alert("Settings Updated", `${settingName} preference updated.`); // Optional

    } catch (error) {
      console.error("Error updating setting: ", error.code, error.message, error);
      Alert.alert('Update Failed', `Could not update setting: ${error.message}`);
    }
  };

  // *** renderToggleItem now passes the full dot-notation path ***
  const renderToggleItem = (label, dotNotationPath) => {
    const getNestedValue = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    const currentValue = getNestedValue(profile, dotNotationPath);

    return (
      <View style={styles.toggleItem}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
          value={!!currentValue}
          onValueChange={(value) => handleSettingUpdate(dotNotationPath, value)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={currentValue ? '#3EB489' : '#f4f3f4'}
        />
      </View>
    );
  };
  
  // *** renderUnitPicker now passes the full dot-notation path ***
  const renderUnitPicker = (label, dotNotationPath, options) => {
    const getNestedValue = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);
    const currentValue = getNestedValue(profile, dotNotationPath);

    return (
      <View style={styles.unitPickerSection}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <View style={styles.toggleGroup}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.toggleButton,
                currentValue === option.value && styles.toggleButtonActive,
              ]}
              onPress={() => handleSettingUpdate(dotNotationPath, option.value)}
            >
              <Text
                style={[
                  styles.toggleButtonText,
                  currentValue === option.value && styles.toggleButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const handleLogout = async () => { /* ... same as before ... */ 
    try {
      await signOut(Fauth);
      router.replace('/Logins/Onboarding'); 
    } catch (e) {
      console.error("Logout Error:", e);
      Alert.alert("Logout Error", e.message);
    }
  };

  if (isLoading) { /* ... same as before ... */ }
  if (!profile && !currentUser) { /* ... same as before ... */ }
  if (!profile && currentUser) { /* ... same as before ... */ }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/Main_pages/EditProfile')}>
          <Image
            source={{ uri: profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || profile?.email?.split('@')[0] || 'U')}&background=2B4C5C&color=EAEAEA&bold=true` }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name || profile?.email?.split('@')[0] || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
          </View>
          <Icon name="chevron-right" size={26} color="#A0D2DB" />
        </TouchableOpacity>
        <Text style={styles.editTextPrompt}>Tap above to edit profile information.</Text>

        <Text style={styles.sectionTitle}>Notification Settings</Text>
        {/* Pass the full dot-notation path */}
        {renderToggleItem('Forum Post Notifications', 'notificationSettings.forumPosts')}
        {renderToggleItem('Marketplace Notifications', 'notificationSettings.marketplaceUpdates')}
        {renderToggleItem('Supplier Notifications', 'notificationSettings.supplierListings')}

        <Text style={styles.sectionTitle}>Unit Preferences</Text>
        {/* Pass the full dot-notation path */}
        {renderUnitPicker('Temperature', 'unitPreferences.temperature', [
          { label: 'Celsius (°C)', value: 'Celsius' },
          { label: 'Fahrenheit (°F)', value: 'Fahrenheit' },
        ])}
        {renderUnitPicker('Distance', 'unitPreferences.distance', [
          { label: 'Kilometers (km)', value: 'Kilometers' },
          { label: 'Miles (mi)', value: 'Miles' },
        ])}
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#FFFFFF" style={{marginRight: 10}} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>MATENC Ver 0.0.01</Text>
        <Text style={styles.footerText}>©2025 The Techplayz Company Foundation / Kenneth Inc</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- PASTE THE FULL STYLES FROM THE PREVIOUS SETTINGS.JSX RESPONSE HERE ---
// (The styles from response #29 are comprehensive and should work)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#20394A',
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20394A' // Ensure loading also has bg
  },
  loadingText: {
    color: '#EAEAEA',
    marginTop: 10,
    fontFamily: 'Roboto-Regular',
  },
  infoText: { 
      color: '#EAEAEA',
      textAlign: 'center',
      fontFamily: 'Roboto-Regular',
      fontSize: 16,
      marginHorizontal: 20,
  },
  actionButtonAlt: { 
      marginTop: 20,
      backgroundColor: '#3EB489',
      paddingVertical: 10,
      paddingHorizontal: 30,
      borderRadius: 20,
  },
  actionButtonTextAlt: {
      color: '#FFFFFF',
      fontFamily: 'Roboto-Bold',
      fontSize: 16,
  },
  header: {
    paddingVertical: Platform.OS === 'ios' ? 15 : 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#2B4C5C', 
    borderBottomWidth: 1,
    borderBottomColor: '#1E3A47',
  },
  headerTitle: {
    fontSize: 22,
    color: '#EAEAEA',
    fontFamily: 'Roboto-Bold', 
  },
  sectionTitle: {
    fontSize: 14,
    color: '#A0D2DB', 
    fontFamily: 'Roboto-Medium',
    paddingHorizontal: 20,
    paddingTop: 25, 
    paddingBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#2B4C5C', 
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#4A728D',
    backgroundColor: '#4A728D'
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#EAEAEA',
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
  },
  profileEmail: {
    color: '#A0D2DB',
    fontSize: 13,
    fontFamily: 'Roboto-Regular',
  },
  editTextPrompt: {
    color: '#778A9A',
    fontSize: 12,
    fontFamily: 'Roboto-Regular',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B4C5C',
    marginHorizontal: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  toggleLabel: {
    color: '#EAEAEA',
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    flexShrink: 1, 
    marginRight: 10,
  },
  unitPickerSection: {
    backgroundColor: '#2B4C5C',
    marginHorizontal: 15,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  sectionLabel: { 
    color: '#EAEAEA',
    marginBottom: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
  },
  toggleGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
  },
  toggleButton: {
    flex: 1, 
    paddingVertical: 10,
    backgroundColor: '#325A75',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 5, 
  },
  toggleButtonActive: {
    backgroundColor: '#3EB489',
  },
  toggleButtonText: {
    color: '#EAEAEA',
    fontFamily: 'Roboto-Regular',
  },
  toggleButtonTextActive: {
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C70039', 
    marginHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 30,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Roboto-Bold',
    fontSize: 16,
  },
  footerText: {
    color: '#666F7B', 
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5, 
    fontFamily: 'Roboto-Regular',
  },
});

export default SettingsScreen;