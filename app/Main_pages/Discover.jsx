// app/Main_pages/Discover.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image, // Keep for potential future use with material images
  ScrollView, // Changed FlatList to ScrollView for simplicity with filters, can revert if performance issues
  StyleSheet,
  FlatList, // Using FlatList for the material grid
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import materialData from '../../datab/materialinfo.json'; // Assuming the file with IDs is at this path
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For filter icons

const DiscoverScreen = () => {
  const router = useRouter();

  const [allMaterials, setAllMaterials] = useState([]);
  const [displayedMaterials, setDisplayedMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [durabilityFilter, setDurabilityFilter] = useState({ min: 0, max: 10 }); // Range 0-10
  const [decayResistFilter, setDecayResistFilter] = useState(''); // 'Low', 'Moderate', 'High', or '' for all

  // Load initial data (assuming materialinfo_with_ids.json is in the project root or accessible path)
  useEffect(() => {
    // Simulate loading if needed, or directly set if import is synchronous
    // For JSON imports, it's usually synchronous
    setAllMaterials(materialData);
    setDisplayedMaterials(materialData);
    setIsLoading(false);
  }, []);

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...allMaterials];

    // Apply search query (case-insensitive on Name and Description)
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(material => 
        material.Name.toLowerCase().includes(lowerQuery) ||
        (material.DurabilityDesc && material.DurabilityDesc.toLowerCase().includes(lowerQuery)) ||
        (material.FlexibilityDesc && material.FlexibilityDesc.toLowerCase().includes(lowerQuery)) ||
        (material.HardnessDesc && material.HardnessDesc.toLowerCase().includes(lowerQuery)) ||
        (material.ImpactResistanceDesc && material.ImpactResistanceDesc.toLowerCase().includes(lowerQuery)) ||
        (material.Drawback1 && material.Drawback1.toLowerCase().includes(lowerQuery)) ||
        (material.Drawback2 && material.Drawback2.toLowerCase().includes(lowerQuery)) ||
        (material.Drawback3 && material.Drawback3.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply durability filter (rating based)
    filtered = filtered.filter(material => 
      material.DurabilityRating >= durabilityFilter.min && material.DurabilityRating <= durabilityFilter.max
    );

    // Apply decay resistance filter
    if (decayResistFilter && decayResistFilter !== '') {
      filtered = filtered.filter(material => 
        material.DecayResistance && material.DecayResistance.toLowerCase() === decayResistFilter.toLowerCase()
      );
    }

    setDisplayedMaterials(filtered);
  }, [allMaterials, searchQuery, durabilityFilter, decayResistFilter]);

  // Apply filters whenever search query or filter criteria change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [searchQuery, durabilityFilter, decayResistFilter, allMaterials, applyFiltersAndSearch]);

  const resetFilters = () => {
    setSearchQuery('');
    setDurabilityFilter({ min: 0, max: 10 });
    setDecayResistFilter('');
    setShowFilters(false); // Optionally close filter panel
    Keyboard.dismiss();
    // applyFiltersAndSearch(); // Will be called by useEffect
  };
  
  const handleApplyFiltersFromPanel = () => {
      // The filters are already applied in real-time via useEffect.
      // This button can just close the filter panel.
      setShowFilters(false);
      Keyboard.dismiss();
  };


  const renderMaterialCard = ({ item }) => (
    <TouchableOpacity
      style={styles.materialCard}
      onPress={() => router.push({ pathname: '/Main_pages/Material/MaterialDetails', params: { materialId: item.materialId } })}
    >
      {/* Placeholder for an image if you add one later */}
      {/* <Image source={{ uri: item.image || 'https://via.placeholder.com/80?text=M' }} style={styles.materialImage} /> */}
      <View style={styles.materialImagePlaceholder}>
        <Text style={styles.materialImagePlaceholderText}>{item.Name.substring(0,1)}</Text>
      </View>
      <Text style={styles.materialName} numberOfLines={2}>{item.Name}</Text>
      <Text style={styles.materialPrice}>Est. Price: {item.Price}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#EAEAEA"/></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={styles.header}>
        {/* You can keep your version info and avatar if needed */}
        <Text style={styles.title}>Material Encyclopedia</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput 
            placeholder="🔍 Search Materials (Name, Desc...)" 
            style={styles.searchInput} 
            placeholderTextColor="#778A9A"
            value={searchQuery}
            onChangeText={setSearchQuery}
        />
        <TouchableOpacity style={styles.filterButton} onPress={() => {setShowFilters(!showFilters); Keyboard.dismiss();}}>
          <Icon name={showFilters ? "filter" : "filter-outline"} size={20} color="#EAEAEA" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Durability Rating ({durabilityFilter.min} - {durabilityFilter.max})</Text>
          {/* Simple Min/Max inputs for Durability, can be improved with sliders */}
          <View style={styles.filterInputRow}>
            <TextInput 
                style={styles.filterInputHalf} 
                placeholder="Min" 
                keyboardType="numeric"
                placeholderTextColor="#778A9A"
                value={String(durabilityFilter.min)}
                onChangeText={text => setDurabilityFilter(prev => ({...prev, min: Number(text) || 0}))}
            />
            <TextInput 
                style={styles.filterInputHalf} 
                placeholder="Max" 
                keyboardType="numeric"
                placeholderTextColor="#778A9A"
                value={String(durabilityFilter.max)}
                onChangeText={text => setDurabilityFilter(prev => ({...prev, max: Number(text) || 10}))}
            />
          </View>

          <Text style={styles.filterLabel}>Decay Resistance</Text>
          <View style={styles.toggleRow}>
            {['', 'Low', 'Moderate', 'High'].map((level) => ( // Added '' for "All"
              <TouchableOpacity 
                key={level || 'all'} 
                style={[styles.toggleButton, decayResistFilter === level && styles.toggleButtonActive]}
                onPress={() => setDecayResistFilter(level)}
              >
                <Text style={[styles.toggleButtonText, decayResistFilter === level && styles.toggleButtonTextActive]}>
                    {level === '' ? 'All' : level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={[styles.filterActionButton, styles.applyBtn]} onPress={handleApplyFiltersFromPanel}>
              <Text style={styles.filterActionButtonText}>Apply & Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterActionButton, styles.resetBtn]} onPress={resetFilters}>
              <Text style={styles.filterActionButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={displayedMaterials}
        renderItem={renderMaterialCard}
        keyExtractor={(item) => item.materialId} // Use the unique materialId
        numColumns={2} // For a grid layout
        contentContainerStyle={styles.materialGrid}
        ListEmptyComponent={<Text style={styles.emptyListText}>No materials found matching your criteria.</Text>}
        keyboardShouldPersistTaps="handled" // Dismiss keyboard on tap outside inputs
      />
    </View>
    </SafeAreaView>
  );
};

// Add your styles here, adapting the theme from your Forum.jsx or other pages
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#20394A',
  },
  container: {
    flex: 1,
    backgroundColor: '#20394A', // Dark theme
    paddingHorizontal: 10,
  },
  loadingContainer:{
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#20394A',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 10,
    alignItems: 'center',
  },
  title: {
    color: '#EAEAEA',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto-Bold', // Assuming you have these fonts
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2B4C5C',
    color: '#EAEAEA',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    fontFamily: 'Roboto-Regular',
    marginRight: 10,
  },
  filterButton: {
    flexDirection: 'row',
    backgroundColor: '#325A75',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterButtonText: {
    color: '#EAEAEA',
    marginLeft: 5,
    fontFamily: 'Roboto-Medium',
  },
  filterPanel: {
    backgroundColor: '#2B4C5C',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  filterLabel: {
    color: '#A0D2DB',
    marginTop: 10,
    fontSize: 15,
    fontFamily: 'Roboto-Medium',
    marginBottom: 5,
  },
  filterInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterInputHalf: {
    backgroundColor: '#1E3A47',
    color: '#EAEAEA',
    padding: 10,
    borderRadius: 6,
    marginTop: 5,
    width: '48%',
    fontFamily: 'Roboto-Regular',
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Or 'flex-start' and add margins
    marginTop: 5,
  },
  toggleButton: {
    backgroundColor: '#325A75',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    minWidth: '22%', // Ensure buttons fit
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3EB489', // Accent color for active filter
  },
  toggleButtonText: {
    color: '#EAEAEA',
    fontFamily: 'Roboto-Regular',
  },
  toggleButtonTextActive: {
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF'
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  filterActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  applyBtn: {
    backgroundColor: '#3EB489',
    marginRight: 5,
  },
  resetBtn: {
    backgroundColor: '#505A70',
    marginLeft: 5,
  },
  filterActionButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Roboto-Bold',
  },
  materialGrid: {
    paddingBottom: 20,
  },
  materialCard: {
    flex: 1/2, // For 2 columns
    backgroundColor: '#2B4C5C',
    borderRadius: 8,
    padding: 10,
    margin: 5, 
    alignItems: 'center',
  },
  materialImagePlaceholder: { // Placeholder for image
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#4A728D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialImagePlaceholderText: {
    color: '#EAEAEA',
    fontSize: 30,
    fontWeight: 'bold',
  },
  materialImage: { // Style for actual image if you add it
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  materialName: {
    color: '#EAEAEA',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 3,
    fontFamily: 'Roboto-Medium',
  },
  materialPrice: {
    color: '#A0D2DB',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#778A9A',
    fontFamily: 'Roboto-Regular',
  },
});

export default DiscoverScreen;