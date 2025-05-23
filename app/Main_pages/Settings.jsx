import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Fauth, Fstore } from '../../FirebaseConfig';

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const uid = Fauth.currentUser?.uid;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;
      try {
        const userRef = doc(Fstore, 'users', uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          setProfile(snapshot.data());
        } else {
          Alert.alert('User data not found');
        }
      } catch (error) {
        Alert.alert('Failed to load profile', error.message);
      }
    };
    fetchProfile();
  }, [uid]);

  const updateProfile = async (key, value) => {
    if (!uid) return;
    const newProfile = { ...profile, [key]: value };
    setProfile(newProfile);
    try {
      await updateDoc(doc(Fstore, 'users', uid), { [key]: value });
    } catch (error) {
      Alert.alert('Update failed', error.message);
    }
  };

  const renderRowItem = (label, key) => (
    <TouchableOpacity style={styles.rowItem}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{profile?.[key]}</Text>
      <Text style={styles.arrow}>{'>'}</Text>
    </TouchableOpacity>
  );

  const renderToggleItem = (label, key) => (
    <View style={styles.toggleItem}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={!!profile?.[key]}
        onValueChange={(value) => updateProfile(key, value)}
        trackColor={{ false: '#f00', true: '#0f0' }}
        thumbColor="#fff"
      />
    </View>
  );

  const renderUnitPicker = (label, key, options) => (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.toggleGroup}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.toggleButton,
              profile?.[key] === option.value && styles.toggleButtonActive,
            ]}
            onPress={() => updateProfile(key, option.value)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                profile?.[key] === option.value && styles.toggleButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ color: '#fff' }}>Loading user profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.version}>Ver 0.0.01</Text>
      <Text style={styles.subtitle}>Test Prototype Version</Text>
      <Text style={styles.title}>MATERIAL POKADEX ENCYCLOPEDIA</Text>
      <Text style={styles.heading}>USER DETAILS CENTER</Text>

      <Image
        source={require('../../assets/images/omowi.png')}
        style={styles.profileImage}
      />
      <TouchableOpacity>
        <Text style={styles.changePic}>Change Profile Picture</Text>
      </TouchableOpacity>

      {renderRowItem('Email', 'email')}
      {renderRowItem('Location', 'location')}
      {renderRowItem('Name', 'name')}

      <Text style={styles.sectionHeader}>Notification Settings</Text>
      {renderToggleItem('New Forum Posts', 'newForumPosts')}
      {renderToggleItem('Marketplace Updates', 'marketplaceUpdates')}
      {renderToggleItem('Supplier Listings', 'supplierListings')}

      <Text style={styles.sectionHeader}>Unit of Measurement</Text>
      {renderUnitPicker('Temperature', 'temperatureUnit', [
        { label: 'Celsius (C°)', value: 'C' },
        { label: 'F°', value: 'F' },
      ])}
      {renderUnitPicker('Distance', 'distanceUnit', [
        { label: 'km', value: 'km' },
        { label: 'miles (mi)', value: 'mi' },
      ])}

      <Text style={styles.footer}>
        ©2025 The Techplayz Company Foundation / Kenneth Inc
      </Text>
    </ScrollView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#1E3A47',
    padding: 20,
    alignItems: 'center',
  },
  version: {
    color: '#ccc',
    fontSize: 12,
    alignSelf: 'flex-start',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  heading: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 5,
  },
  changePic: {
    color: '#7BDFF2',
    marginBottom: 20,
  },
  rowItem: {
    flexDirection: 'row',
    backgroundColor: '#2C4A5B',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  rowValue: {
    color: '#ccc',
    marginRight: 10,
  },
  arrow: {
    color: '#fff',
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
  },
  section: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
  },
  toggleGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#aaa',
    borderRadius: 20,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFCD00',
  },
  toggleButtonText: {
    color: '#000',
  },
  toggleButtonTextActive: {
    fontWeight: 'bold',
  },
  footer: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 40,
    textAlign: 'center',
  },
});
