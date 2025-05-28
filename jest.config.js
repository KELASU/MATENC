// jest.config.js
module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: [
      '<rootDir>/jest.setup.js',
      // '@testing-library/jest-native/extend-expect' // if you use it
    ],
    transform: {
      '^.+\\.(js|jsx|ts|tsx|mjs)$': 'babel-jest',
    },
    transformIgnorePatterns: [
      'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-navigation|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts|react-navigation|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|firebase|@firebase)',
    ],
    // ... other configurations
  };