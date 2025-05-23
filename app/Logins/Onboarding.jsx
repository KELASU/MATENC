import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useFonts } from 'expo-font';


const Onboarding = () => {
  const [fontsLoaded] = useFonts({
    'EdoSZ': require('../../assets/fonts/edo_sz/edosz.ttf'),
  });

  if (!fontsLoaded) return null;

      
  return (
    <View style={styles.container}>
      {/* Top Left Version Info */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>Ver 0.0.01</Text>
        <Text style={styles.versionText}>Test Prototype Version</Text>
      </View>

      {/* Top Right Menu */}
      <TouchableOpacity style={styles.menuButton}>
        <FontAwesome name="ellipsis-v" size={20} color="black" />
      </TouchableOpacity>

      {/* Center Title */}
      <View style={styles.titleContainer}>
        <Text style={[styles.title,{fontFamily:"EdoSZ"}]}>MATERIAL</Text>
        <Text style={styles.title}>ENCYCLOPEDIA</Text>
      </View>

      {/* Bottom Section */}
      <View style={styles.flexBottom}>
        <View style={styles.actionBox}>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/Logins/Login')}>
            <Text style={styles.buttonText}>LOG IN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/Logins/Register')}>
            <Text style={styles.buttonText}>REGISTER</Text>
          </TouchableOpacity>

          <Text style={styles.socialText}>Or sign in with your socials</Text>
          <View style={styles.socialIcons}>
            <FontAwesome name="google" size={24} style={styles.icon} />
            <FontAwesome name="github" size={24} style={styles.icon} />
            <FontAwesome name="facebook" size={24} style={styles.icon} />
            <FontAwesome name="close" size={24} style={styles.icon} />
            
          </View>
          <Text style={styles.footer}>
          ©2025 The Techplayz Company Foundation / Kenneth Inc
        </Text>
        </View>
      </View>
    </View>
  );
};

export default Onboarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf7ec',
    paddingTop: 40,
    paddingHorizontal: 0,
    position: 'relative',
  },
  versionInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  versionText: {
    fontSize: 10,
    color: '#000',
  },
  menuButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  titleContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'EdoSZ',
    letterSpacing: 1,
  },
  flexBottom: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionBox: {
    backgroundColor: '#20394A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#dedcd7',
    width: '100%',
    paddingVertical: 10,
    borderRadius: 25,
    marginVertical: 10,
  },
  buttonText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'EdoSZ',
  },
  socialText: {
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    fontSize: 12,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 10,
  },
  icon: {
    color: '#fff',
  },
  footer: {
    
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 0,
  },
});
