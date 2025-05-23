import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView from "react-native-maps";
import materialImg from "../../../assets/images/icon.png";
import profilePic from "../../../assets/images/omowi.png";

export default function MaterialDetails() {
  const [starred, setStarred] = useState(false);
  const [selectedTab, setSelectedTab] = useState("Properties");
  const [showSupplierMap, setshowSupplierMap] = useState(false);
  const tabs = ["Properties", "Drawbacks", "Blueprints", "Discussions"];

  const propertiesHeader = [
    "Durability",
    "Flexibility",
    "Hardness (Mohs Scale)",
    "Impact Resistance",
    "Decay Resistance",
    "Weight",
  ];

  const properties = [
    {
      desc: "High resilience, weak to moisture.",
      value: "7.5/10",
    },
    {
      desc: "Bends well without breaking.",
      value: "8/10",
    },
    {
      desc: "Bends well without breaking.",
      value: "4.5",
    },
    { desc: "Moderate.", value: "55Kj/m²" },
    { desc: "Moderate.", value: "Low" },
    { desc: "Lightweight.", value: "" },
  ];

  const drawbacks = [
    "Susceptible to water damage & mold. Be careful with any liquid builds.",
    "Requiers frequent sealing for outdoor use. Consider carefully.",
    "Expensive as availability is low. Backups may be difficult to acquire.",
  ];

  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Top Left Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Ver 0.0.01</Text>
          <Text style={styles.versionText}>Test Prototype Version</Text>
        </View>

        {/* Header */}
        <View style={styles.topSection}>
          <Text style={styles.title}>MATENC</Text>
          <Image source={profilePic} style={styles.profilePic} />
        </View>

        {/* Material Info */}
        <View style={styles.separator} />
        <View style={styles.materialSection}>
          <Image source={materialImg} style={styles.materialImage} />
          <View style={styles.materialTextContainer}>
            <View style={styles.materialTextDetail}>
              <Text style={styles.materialTextDetailTitle}>
                Hinamibachi Wood
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Image
                  source={require("../../../assets/images/people.png")}
                  style={{
                    width: 15,
                    height: 15,
                    marginRight: 5,
                    marginTop: 5,
                  }}
                />
                <Text style={styles.materialTextDetailContent}>512 Users</Text>
              </View>
              <Text style={styles.materialTextDetailContent}>
                Market Price: Rp 500.000/Kg
              </Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.squareButton}
                onPress={() => setStarred(!starred)}
              >
                <Image
                  source={require("../../../assets/images/star.png")}
                  style={[
                    styles.icon,
                    { tintColor: starred ? "#EAA806" : "#0E262F" },
                  ]}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.flexButton}
                onPress={() => setshowSupplierMap(!showSupplierMap)}
              >
                <Text style={styles.buttonText}>
                  {showSupplierMap ? "Return" : "Find a Supplier"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.squareButton}>
                <Image
                  source={require("../../../assets/images/share.png")}
                  style={[styles.icon, { tintColor: "#0E262F" }]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Supplier Map */}
        {showSupplierMap ? (
          <View style={{ flex: 1 }}>
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: -6.116714,
                longitude: 106.776747,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
            />
            <ScrollView style={styles.supplierArea}>
              <Text
                style={{
                  minHeight: "100%",
                  color: "white",
                  textAlignVertical: "center",
                  textAlign: "center",
                }}
              >
                No Nearby Supplier Available
              </Text>
            </ScrollView>
          </View>
        ) : (
          <>
            {/* Tabs */}
            <View style={[styles.tabRow, { borderRadius: 10 }]}>
              {tabs.map((tab) => (
                <TouchableOpacity key={tab} onPress={() => setSelectedTab(tab)}>
                  <Text
                    style={[
                      styles.tabText,
                      selectedTab === tab && styles.tabSelected,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Properties */}
            <ScrollView style={styles.scrollArea}>
              {selectedTab === "Properties" && (
                <View>
                  {properties.map((item, index) => (
                    <View
                      key={index}
                      style={styles.materialPropertiesContainer}
                    >
                      <Text
                        style={[
                          styles.materialPropertiesText,
                          { fontWeight: "bold" },
                        ]}
                      >
                        {propertiesHeader[index]}:
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={[
                            styles.materialPropertiesText,
                            { flex: 1, textAlign: "justify" },
                          ]}
                        >
                          {item.desc}
                        </Text>
                        <Text style={styles.materialPropertiesText}>
                          {item.value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Drawbacks */}
              {selectedTab === "Drawbacks" && (
                <View>
                  {drawbacks.map((item, index) => (
                    <View key={index} style={styles.materialDetailsContainer}>
                      <Image
                        source={require("../../../assets/images/caution.png")}
                        style={styles.caution}
                      />
                      <Text style={styles.materialDetailsText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Blueprints */}
              {selectedTab === "Blueprints" && (
                <Text style={{ color: "white" }}>C</Text>
              )}

              {/* Discussions */}
              {selectedTab === "Discussions" && (
                <Text style={{ color: "white" }}>D</Text>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#1F394A",
  },
  versionInfo: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  versionText: {
    fontSize: 10,
    color: "#FFFFFF",
  },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
    marginTop: 25,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flexShrink: 1,
    flexWrap: "wrap",
  },
  profilePic: { width: 40, height: 40, borderRadius: 20 },
  separator: { height: 1, backgroundColor: "#FFFFFF", marginVertical: 10 },
  materialSection: {
    flexDirection: "row",
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  materialImage: { width: 100, height: 120 },
  materialTextContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "space-between",
  },
  materialTextDetail: {
    flex: 1,
    alignItems: "flex-end",
  },
  materialTextDetailTitle: {
    color: "#FFFFFF",
    fontSize: 18,
  },
  materialTextDetailContent: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  squareButton: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3C8897",
    borderRadius: 5,
  },
  flexButton: {
    flex: 1,
    height: 30,
    marginHorizontal: 10,
    backgroundColor: "#3C8897",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
  },
  icon: {
    width: 20,
    height: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    textTransform: "none",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
    backgroundColor: "#315973",
  },
  tabSelected: {
    backgroundColor: "#436F8E",
  },
  tabText: {
    fontSize: 14,
    paddingVertical: 5,
    width: width * 0.23,
    color: "white",
    backgroundColor: "#315973",
    borderRadius: 10,
    textAlign: "center",
  },
  scrollArea: { flex: 1, marginVertical: 10 },
  supplierArea: {
    flex: 1,
    marginVertical: 10,
    padding: 15,
    paddingVertical: 5,
    backgroundColor: "#3C8897",
    borderRadius: 10,
  },
  materialPropertiesContainer: {
    flex: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  materialPropertiesText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  materialDetailsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 25,
  },
  materialDetailsText: {
    flex: 1,
    flexWrap: "wrap",
    color: "#FFFFFF",
    fontSize: 16,
  },
  caution: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  userRating: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  userRatingStar: {
    width: 40,
    height: 40,
    marginHorizontal: 10,
  },
});
