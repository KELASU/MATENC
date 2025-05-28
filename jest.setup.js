// jest.setup.js
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Firebase Auth
jest.mock('firebase/auth', () => {
  const actualAuth = jest.requireActual('firebase/auth'); // Get actual exports
  return {
    ...actualAuth, // Spread actual exports
    // Provide a mock implementation for getReactNativePersistence
    getReactNativePersistence: jest.fn(() => {
      // This should return an object that conforms to the Persistence interface
      // For testing, a simple object or a specific mock might be enough
      // console.log('[Mock] getReactNativePersistence called');
      return { type: 'LOCAL' }; // Example mock persistence object
    }),
    // Mock other auth functions your app uses directly if not covered by actualAuth
    // or if you need specific mock behavior across all tests
    initializeAuth: jest.fn((app, options) => {
      // console.log('[Mock] initializeAuth called with options:', options);
      // Return a mock auth object or delegate to actual for some parts
      return {
        currentUser: null,
        onAuthStateChanged: jest.fn(() => jest.fn()), // Returns an unsubscribe function
        // Add other properties/methods the app expects from the auth object
      };
    }),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    sendEmailVerification: jest.fn(),
    updateProfile: jest.fn(),
    // Add other auth functions used throughout your app
  };
});

// Mock react-native (ensure Platform is correctly mocked for Android)
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.SettingsManager = { // Mock SettingsManager
    settings: { AppleLocale: 'en_US', AppleLanguages: ['en-US'] },
    getSettings: jest.fn(() => RN.NativeModules.SettingsManager.settings),
    setValues: jest.fn(), deleteValues: jest.fn(),
  };
  RN.Platform = { // Override Platform for Android
    OS: 'android',
    select: jest.fn(selectConfig => selectConfig.android || selectConfig.default),
    Version: '10', isTesting: true,
    constants: { reactNativeVersion: { major: 0, minor: 60, patch: 0 } },
  };
  RN.NativeModules.UIManager = { // Basic UIManager mock
    ...(RN.NativeModules.UIManager || {}),
    getViewManagerConfig: jest.fn(name => ({ Commands: {} })),
    createView: jest.fn(), updateView: jest.fn(), manageChildren: jest.fn(), measure: jest.fn(),
  };
  RN.DeviceEventEmitter = { // Basic DeviceEventEmitter mock
    addListener: jest.fn(), removeListeners: jest.fn(), emit: jest.fn(),
  };
  return RN;
});

// Ensure __DEV__ is defined
if (typeof __DEV__ === 'undefined') {
  global.__DEV__ = true;
}