import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  InteractionManager,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
// IMPORTANT: Adjust this path to your actual JSON data file
import materialData from '../../../datab/materialinfo.json'; 
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

// Helper function for distance (Haversine formula)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
// End Helper Function

const findMaterialById = (id) => {
  if (!id || !materialData) return null;
  // Ensure consistent string comparison, especially if materialId in JSON might be number
  return materialData.find(m => String(m.materialId) === String(id));
};

export default function MaterialDetailsScreen() {
  const router = useRouter();
  const { materialId } = useLocalSearchParams(); // Get materialId from route parameter
  
  const [material, setMaterial] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [starred, setStarred] = useState(false);
  const [selectedTab, setSelectedTab] = useState("Properties");
  const [showSupplierMapAndList, setShowSupplierMapAndList] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [nearbyShops, setNearbyShops] = useState([]);
  const [mapRegion, setMapRegion] = useState(null);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    setIsLoading(true);
    if (materialId) {
      console.log("MaterialDetails: Received materialId:", materialId);
      const foundMaterial = findMaterialById(materialId);
      if (foundMaterial) {
        setMaterial(foundMaterial);
        console.log("MaterialDetails: Found material:", foundMaterial.Name);
      } else {
        console.error("MaterialDetails: Material not found with ID:", materialId);
        setMaterial(null); 
      }
    } else {
        console.warn("MaterialDetails: No materialId received in params.");
        setMaterial(null); 
    }
    setIsLoading(false); 
  }, [materialId]);

  const handleFindSuppliers = async () => {
    if (showSupplierMapAndList) {
      setShowSupplierMapAndList(false);
      setNearbyShops([]); 
      return;
    }

    setIsLoadingSuppliers(true);
    setShowSupplierMapAndList(true); 

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is needed to find nearby suppliers.');
      setIsLoadingSuppliers(false);
      setShowSupplierMapAndList(false);
      return;
    }

    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const currentCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(currentCoords);
      const currentRegion = {
        ...currentCoords,
        latitudeDelta: 0.0922, 
        longitudeDelta: 0.0421,
      };
      setMapRegion(currentRegion);
      console.log("User location:", currentCoords);

      const radius = 5000; 
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["shop"~"hardware|doityourself|trade|building_materials|tool_hire|construction"](around:${radius},${currentCoords.latitude},${currentCoords.longitude});
          way["shop"~"hardware|doityourself|trade|building_materials|tool_hire|construction"](around:${radius},${currentCoords.latitude},${currentCoords.longitude});
          relation["shop"~"hardware|doityourself|trade|building_materials|tool_hire|construction"](around:${radius},${currentCoords.latitude},${currentCoords.longitude});
        );
        out center;
      `;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      
      console.log("Fetching from Overpass API...");
      const response = await fetch(overpassUrl);
      if (!response.ok) {
        throw new Error(`Overpass API request failed with status ${response.status}`);
      }
      const osmData = await response.json();
      console.log("Overpass API response elements:", osmData.elements?.length);

      const shops = osmData.elements.map(element => {
        let lat, lon;
        if (element.type === "node") { lat = element.lat; lon = element.lon; } 
        else if (element.center) { lat = element.center.lat; lon = element.center.lon; }
        
        const distance = getDistanceFromLatLonInKm(currentCoords.latitude, currentCoords.longitude, lat, lon);

        return {
          id: element.id.toString(),
          name: element.tags?.name || "Supplier",
          latitude: lat,
          longitude: lon,
          tags: element.tags,
          distance: distance ? parseFloat(distance.toFixed(1)) : null,
          rating: element.tags?.rating || element.tags?.stars || 'N/A', 
        };
      }).filter(shop => shop.latitude && shop.longitude)
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity)); 

      setNearbyShops(shops);
      if (shops.length === 0) {
        Alert.alert("No Suppliers Found", "No relevant shops found nearby using OpenStreetMap data.");
      }
    } catch (error) {
      console.error("Error getting location or finding suppliers (Overpass):", error);
      Alert.alert("Error", "Could not get your location or find suppliers. Please check your connection and try again.");
      setShowSupplierMapAndList(false);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };
  
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingInfoText}>Loading Material Details...</Text>
      </SafeAreaView>
    );
  }

  if (!material) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}>
        <Icon name="alert-circle-outline" size={48} color="#FFB300" />
        <Text style={styles.errorInfoText}>
          Material not found. Please check the ID or go back.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Prepare data for rendering once material is loaded
  const propertiesHeader = [
    "Durability", "Flexibility", "Hardness (Mohs Scale)", 
    "Impact Resistance", "Decay Resistance", "Density (g/cm³)",
  ];
  const properties = [
    { desc: material.DurabilityDesc, value: `${material.DurabilityRating}/10` },
    { desc: material.FlexibilityDesc, value: `${material.FlexibilityRating}/10` },
    { desc: material["HardnessDesc"], value: String(material["Hardness (Moh's Scale)"]) },
    { desc: material.ImpactResistanceDesc, value: `${material.ImpactResistance}${material.ImpactResistanceDesc && material.ImpactResistanceDesc.toLowerCase().includes('kj/m') ? ' Kj/m²' : ''}` },
    { desc: "Resistance to decay.", value: material.DecayResistance },
    { desc: "Mass per unit volume.", value: String(material.Density) },
  ];
  const drawbacks = [];
  if (material.Drawback1) drawbacks.push(material.Drawback1);
  if (material.Drawback2) drawbacks.push(material.Drawback2);
  if (material.Drawback3) drawbacks.push(material.Drawback3);
  const tabs = ["Properties", "Description", "Drawbacks"];

  const renderSupplierItem = ({ item }) => (
    <TouchableOpacity style={styles.supplierItemContainer} onPress={() => mapRef.current?.animateToRegion({
        latitude: item.latitude,
        longitude: item.longitude,
        latitudeDelta: 0.01, 
        longitudeDelta: 0.01,
    }, 1000)}>
      <View style={styles.supplierInfo}>
        <Text style={styles.supplierName} numberOfLines={1}>{item.name}</Text>
        {item.tags?.["addr:street"] && <Text style={styles.supplierDetail} numberOfLines={1}>{item.tags["addr:street"]}</Text>}
        {item.tags?.phone && <Text style={styles.supplierDetail} numberOfLines={1}>Phone: {item.tags.phone}</Text>}
      </View>
      <View style={styles.supplierMeta}>
        <Text style={styles.supplierDistance}>
            {item.distance !== null ? `${item.distance} km` : 'N/A'}
        </Text>
        <Text style={styles.supplierRating}>Rating: {item.rating}</Text> 
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen 
        options={{ 
          title: material.Name ? (material.Name.length > 25 ? material.Name.substring(0,22)+"..." : material.Name) : "Material Details", 
          headerTintColor: '#FFFFFF', 
          headerStyle: {backgroundColor: '#1F3A4A'}
        }} 
      />
      <View style={styles.container}>
        {/* Top part of the screen: Material image placeholder, name, price, action buttons */}
        <View style={styles.materialSection}>
          <View style={styles.materialImagePlaceholder}>
            <Text style={styles.materialImagePlaceholderText}>{material.Name.substring(0,1)}</Text>
          </View>
          <View style={styles.materialTextContainer}>
            <View style={styles.materialTextDetail}>
              <Text style={styles.materialTextDetailTitle} numberOfLines={2} ellipsizeMode="tail">
                {material.Name} 
              </Text>
              <Text style={styles.materialTextDetailContent}>
                Est. Price: {material.Price ? `Rp ${material.Price.toLocaleString()}` : 'N/A'} per Kg
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.squareButton} onPress={() => setStarred(!starred)}>
                <Icon name={starred ? "star" : "star-outline"} size={20} color={starred ? "#EAA806" : "#A0D2DB"}/>
              </TouchableOpacity>
              <TouchableOpacity style={styles.flexButton} onPress={handleFindSuppliers} disabled={isLoadingSuppliers}>
                {isLoadingSuppliers && showSupplierMapAndList ? <ActivityIndicator size="small" color="#FFFFFF"/> : <Text style={styles.buttonText}>{showSupplierMapAndList ? "Hide Map" : "Find Suppliers"}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.squareButton} onPress={() => Alert.alert("Share", "Share functionality to be implemented.")}>
                <Icon name="share-variant-outline" size={20} color="#A0D2DB"/>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Conditional rendering for Map & Supplier List OR Tabs & Content */}
        {showSupplierMapAndList ? (
          <View style={styles.supplierDisplayContainer}>
            <View style={styles.mapContainer}>
              {isLoadingSuppliers && !mapRegion && (
                <View style={styles.mapLoadingOverlay}><ActivityIndicator size="large" color="#FFFFFF"/><Text style={styles.mapLoadingText}>Getting location...</Text></View>
              )}
              {mapRegion && (
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFill}
                  provider={PROVIDER_DEFAULT} 
                  initialRegion={mapRegion}
                  region={mapRegion}
                  onRegionChangeComplete={setMapRegion}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                >
                  <UrlTile
                    urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                    flipY={false} 
                  />
                  {nearbyShops.map(shop => (
                    <Marker
                      key={shop.id}
                      coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
                      title={shop.name}
                      description={shop.tags?.shop || shop.tags?.amenity || "Supplier"}
                    />
                  ))}
                </MapView>
              )}
            </View>
            {isLoadingSuppliers && nearbyShops.length === 0 ? (
                <ActivityIndicator style={{marginTop: 10}} color="#EAEAEA" />
            ) : nearbyShops.length > 0 ? (
                <FlatList
                    data={nearbyShops}
                    renderItem={renderSupplierItem}
                    keyExtractor={(item) => item.id}
                    style={styles.supplierList}
                    ListHeaderComponent={<Text style={styles.supplierListTitle}>Nearby Suppliers</Text>}
                />
            ) : (
                !isLoadingSuppliers && <Text style={styles.noSuppliersText}>No suppliers found nearby or still searching.</Text>
            )}
          </View>
        ) : (
          <>
            <View style={styles.tabRow}>
              {tabs.map((tab) => (
                <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabButtonDetail, selectedTab === tab && styles.tabSelectedButtonDetail]}
                    onPress={() => setSelectedTab(tab)}
                >
                  <Text style={[styles.tabTextDetail, selectedTab === tab && styles.tabSelectedTextDetail]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={styles.scrollArea}>
              {selectedTab === "Properties" && (
                <View>
                  {properties.map((item, index) => (
                    item.value != null && ( // Render if value is not null or undefined
                      <View key={index} style={styles.materialPropertiesContainer}>
                        <Text style={styles.materialPropertiesTextHeader}>
                          {propertiesHeader[index]}:
                        </Text>
                        <View style={styles.propertyRowContent}>
                          {item.desc && <Text style={styles.materialPropertiesTextDesc}>{item.desc}</Text>}
                          <Text style={styles.materialPropertiesTextValue}>{item.value}</Text>
                        </View>
                      </View>
                    )
                  ))}
                </View>
              )}
              {selectedTab === "Description" && (
                <View style={styles.descriptionContainer}>
                    {material.DurabilityDesc && <Text style={styles.descriptionBlock}><Text style={styles.descriptionLabel}>Durability:</Text> {material.DurabilityDesc}</Text>}
                    {material.FlexibilityDesc && <Text style={styles.descriptionBlock}><Text style={styles.descriptionLabel}>Flexibility:</Text> {material.FlexibilityDesc}</Text>}
                    {material.HardnessDesc && <Text style={styles.descriptionBlock}><Text style={styles.descriptionLabel}>Hardness:</Text> {material.HardnessDesc}</Text>}
                    {material.ImpactResistanceDesc && <Text style={styles.descriptionBlock}><Text style={styles.descriptionLabel}>Impact Resistance:</Text> {material.ImpactResistanceDesc}</Text>}
                </View>
              )}
              {selectedTab === "Drawbacks" && (
                <View>
                  {drawbacks.length > 0 ? (
                    drawbacks.map((item, index) => (
                      <View key={index} style={styles.materialDetailsContainer}>
                        <Icon name="alert-circle-outline" size={24} color="#FF6B6B" style={styles.cautionIcon}/>
                        <Text style={styles.materialDetailsText}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.placeholderText}>No drawbacks listed.</Text>
                  )}
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Your Existing Styles (from response #42) ---
const styles = StyleSheet.create({
  safeArea: { 
    flex: 1,
    backgroundColor: "#1F3A4A",
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F3A4A',
  },
  loadingInfoText: { 
    color: '#FFFFFF', 
    marginTop: 10,
    fontFamily: "Roboto-Regular"
  },
  errorInfoText: { 
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    fontFamily: "Roboto-Regular"
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: '#3C8897',
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: "Roboto-Medium", 
  },
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#1F3A4A",
  },
  versionInfo: {
    // Removed position:absolute as it might conflict with Stack header
    // If you need it, ensure it's styled not to overlap if Stack header is visible
    // position: "absolute", 
    // top: 10, 
    // left: 10,
    // zIndex: 10, 
    // For now, let's assume this info isn't critical here or is handled by a global component
  },
  versionText: { 
    fontSize: 10,
    color: "#A0D2DB", 
  },
  materialSection: {
    flexDirection: "row",
    marginVertical: 10,
    paddingBottom: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#325A75'
  },
  materialImagePlaceholder: {
    width: 100,
    height: 100, 
    backgroundColor: '#4A728D',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  materialImagePlaceholderText: {
    color: '#EAEAEA',
    fontSize: 40,
    fontWeight: 'bold',
  },
  materialTextContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  materialTextDetail: {
    flex: 1, 
  },
  materialTextDetailTitle: {
    color: "#FFFFFF",
    fontSize: 20, 
    fontFamily: "Roboto-Bold",
    marginBottom: 5,
  },
  materialTextDetailContent: {
    color: "#A0D2DB", 
    fontSize: 15, 
    fontFamily: "Roboto-Regular",
    marginTop: 3,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: 'center',
    marginTop: 10, 
  },
  squareButton: {
    width: 40, 
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#325A75", 
    borderRadius: 8, 
  },
  flexButton: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
    backgroundColor: "#3C8897",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Roboto-Medium",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around", 
    marginVertical: 15, 
    backgroundColor: "#2B4C5C", 
    borderRadius: 8,
    overflow: 'hidden',
  },
  tabButtonDetail: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent', 
  },
  tabSelectedButtonDetail: {
    borderBottomColor: '#3EB489', 
  },
  tabTextDetail: { 
    fontSize: 15, 
    color: "#A0D2DB", 
    fontFamily: "Roboto-Regular",
  },
  tabSelectedTextDetail: {
    color: "#FFFFFF", 
    fontFamily: "Roboto-Bold",
  },
  scrollArea: { flex: 1, marginTop: 5 }, 
  materialPropertiesContainer: {
    paddingHorizontal: 10, 
    paddingVertical: 10,
    marginBottom: 10, 
    backgroundColor: '#2B4C5C',
    borderRadius: 6,
  },
  materialPropertiesTextHeader: {
    color: "#A0D2DB",
    fontSize: 16,
    fontFamily: "Roboto-Medium",
    marginBottom: 5,
  },
  propertyRowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  materialPropertiesTextDesc: {
    color: "#E0E0E0",
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    flex: 1, 
    marginRight: 10, 
    lineHeight: 20,
  },
  materialPropertiesTextValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Roboto-Bold",
    textAlign: 'right',
  },
  descriptionContainer: { 
    padding: 10, 
    backgroundColor: '#2B4C5C',
    borderRadius: 6,
  },
  descriptionBlock: {
    marginBottom: 10,
    fontSize: 15,
    color: '#E0E0E0',
    fontFamily: 'Roboto-Regular',
    lineHeight: 22,
  },
  descriptionLabel: {
      fontFamily: 'Roboto-Medium',
      color: '#A0D2DB',
  },
  materialDetailsContainer: { 
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10, 
    marginBottom: 10,
    backgroundColor: '#2B4C5C',
    borderRadius: 6,
  },
  materialDetailsText: {
    flex: 1, 
    color: "#EAEAEA",
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    lineHeight: 20,
  },
  cautionIcon: { 
    marginRight: 10,
    marginTop: 2, 
  },
  placeholderText: { 
    color: '#778A9A',
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'Roboto-Regular',
    paddingVertical: 20,
  },
  mapContainer: {
    height: Dimensions.get('window').height * 0.2, // Adjusted height
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#325A75',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  supplierDisplayContainer: {
    flex: 1, 
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
  },
  supplierList: {
    flex: 1, 
    marginTop: 10,
  },
  supplierListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A0D2DB',
    marginBottom: 10,
    paddingHorizontal: 5,
    fontFamily: 'Roboto-Bold',
  },
  supplierItemContainer: {
    backgroundColor: '#2B4C5C',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    marginHorizontal: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierInfo: {
    flex: 1, 
  },
  supplierName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#EAEAEA',
    fontFamily: 'Roboto-Medium',
  },
  supplierDetail: {
    fontSize: 13,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
    marginTop: 2,
  },
  supplierMeta: {
    alignItems: 'flex-end',
  },
  supplierDistance: {
    fontSize: 13,
    color: '#3EB489', 
    fontFamily: 'Roboto-Regular',
  },
  supplierRating: {
    fontSize: 12,
    color: '#A0D2DB',
    fontFamily: 'Roboto-Regular',
    marginTop: 2,
  },
  noSuppliersText: {
      textAlign: 'center',
      color: '#778A9A',
      marginTop: 15,
      fontFamily: 'Roboto-Regular',
      paddingBottom: 10, // Ensure it's visible if list is short
  },
});