import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function Index() {
  const translateX = useSharedValue(-width);
  const fillOpacity = useSharedValue(0); // Add shared value to control opacity of fill

  useEffect(() => {
    translateX.value = withTiming(0, { duration: 3000 }); // Animate the text reveal
    setTimeout(() => {
      fillOpacity.value = withTiming(1, { duration: 2000 }); // Start filling after 1 second
    }, 1000); // Add a delay before starting the fill
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: fillOpacity.value,
    backgroundColor: '#dedcd7', // Color that fills the text
  }));

  return (
    <View style={styles.container}>
      <MaskedView
        style={styles.maskContainer}
        maskElement={
          <View style={styles.centered}>
            <Svg height="100" width={width}>
              <SvgText
                x="50%"
                y="75"
                fill="#20394A" // Text color is now visible immediately
                fontSize="64"
                fontWeight="bold"
                textAnchor="middle"
              >
                MATENC
              </SvgText>
            </Svg>
          </View>
        }
      >
        {/* Animated fill effect */}
        <Animated.View style={[styles.animatedFill, animatedStyle, fillStyle]} />
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#20394A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskContainer: {
    width: width,
    height: 100,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedFill: {
    width: width * 2,
    height: 100,
  },
});
