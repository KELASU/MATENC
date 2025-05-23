import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

const placeholderMaterials = Array.from({ length: 12 }, (_, i) => ({
  id: i.toString(),
  name: 'Hinamibachi',
  image: 'https://via.placeholder.com/100x100?text=Material',
}));

const Discover = () => {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const handleCardPress = (materialId) => {
    router.replace(`Main_pages/Material/MaterialDetails`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.versionText}>Ver 0.0.01</Text>
          <Text style={styles.versionText}>Test Prototype Version</Text>
        </View>
        <Image
          source={{ uri: 'https://via.placeholder.com/50x50?text=User' }}
          style={styles.avatar}
        />
      </View>

      <Text style={styles.title}>MATENC</Text>
      <Text style={styles.subTitle}>Material Search</Text>

      <View style={styles.searchRow}>
        <TextInput placeholder="🔍 Search" style={styles.searchInput} placeholderTextColor="#ccc" />
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterButtonText}>{showFilters ? '▲' : '▼'} Filters</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          {/* Filter UI - simplified for placeholder */}
          <Text style={styles.filterLabel}>Durability</Text>
          <TextInput style={styles.filterInput} placeholder="3 - 9" placeholderTextColor="#ccc" />

          <Text style={styles.filterLabel}>Decay Resist</Text>
          <View style={styles.toggleRow}>
            {['Low', 'Medium', 'High'].map((level) => (
              <TouchableOpacity key={level} style={styles.toggleButton}>
                <Text style={styles.toggleButtonText}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.applyBtn}>
              <Text style={styles.applyText}>APPLY FILTERS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn}>
              <Text style={styles.resetText}>RESET</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.materialGrid}>
        {placeholderMaterials.map((material) => (
          <TouchableOpacity
            key={material.id}
            style={styles.materialCard}
            onPress={() => handleCardPress(material.id)}
          >
            <Image source={{ uri: material.image }} style={styles.materialImage} />
            <Text style={styles.materialName}>{material.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>©2025 The Techplayz Company Foundation / Kenneth Inc</Text>
      </View>
    </View>
  );
};

export default Discover;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20394A',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  versionText: {
    color: '#ccc',
    fontSize: 10,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 30,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  subTitle: {
    color: '#fff',
    fontSize: 18,
    marginVertical: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2B4C5C',
    color: '#fff',
    padding: 10,
    borderRadius: 6,
  },
  filterButton: {
    backgroundColor: '#2B4C5C',
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderRadius: 6,
  },
  filterButtonText: {
    color: '#fff',
  },
  filterPanel: {
    backgroundColor: '#25475B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  filterLabel: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  filterInput: {
    backgroundColor: '#1F3A49',
    color: '#fff',
    padding: 8,
    borderRadius: 6,
    marginTop: 5,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  toggleButton: {
    backgroundColor: '#3E6072',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  toggleButtonText: {
    color: '#fff',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  applyBtn: {
    backgroundColor: '#3EB489',
    flex: 1,
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  applyText: {
    color: '#fff',
    textAlign: 'center',
  },
  resetBtn: {
    backgroundColor: '#A62828',
    flex: 1,
    padding: 10,
    borderRadius: 10,
  },
  resetText: {
    color: '#fff',
    textAlign: 'center',
  },
  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  materialCard: {
    width: '30%',
    backgroundColor: '#45677A',
    borderRadius: 10,
    padding: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  materialImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginBottom: 5,
  },
  materialName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#ccc',
    fontSize: 10,
  },
});
