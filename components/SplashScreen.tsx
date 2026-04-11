import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Brand } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

type Props = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: Props) {
  // Animated values
  const logoScale    = useRef(new Animated.Value(0.3)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(20)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const circle1Scale = useRef(new Animated.Value(0)).current;
  const circle2Scale = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Lingkaran dekorasi muncul
      Animated.parallel([
        Animated.spring(circle1Scale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(circle2Scale, { toValue: 1, tension: 40, friction: 10, useNativeDriver: true, delay: 150 } as any),
      ]),

      // 2. Logo muncul dengan spring
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),

      // 3. Teks nama app muncul slide up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
      ]),

      // 4. Tagline muncul
      Animated.timing(tagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),

      // 5. Tahan sebentar
      Animated.delay(800),

      // 6. Fade out seluruh screen
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={Brand.primary} />

      {/* Dekorasi lingkaran background */}
      <Animated.View
        style={[
          styles.circle1,
          { transform: [{ scale: circle1Scale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.circle2,
          { transform: [{ scale: circle2Scale }] },
        ]}
      />
      <View style={styles.circle3} />

      {/* Konten tengah */}
      <View style={styles.content}>
        {/* Logo / ikon */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Text style={styles.logoEmoji}>🌿</Text>
        </Animated.View>

        {/* Nama app */}
        <Animated.Text
          style={[
            styles.appName,
            {
              opacity: textOpacity,
              transform: [{ translateY: textY }],
            },
          ]}
        >
          GreenMart
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Belanja segar, hidup lebih baik
        </Animated.Text>
      </View>

      {/* Loading dots bawah */}
      <Animated.View style={[styles.dotsWrapper, { opacity: tagOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </Animated.View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    Animated.parallel([anim(dot1, 0), anim(dot2, 200), anim(dot3, 400)]).start();
  }, []);

  return (
    <View style={styles.dots}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  // Dekorasi
  circle1: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: Brand.primaryLight,
    opacity: 0.3,
    top: -width * 0.25,
    right: -width * 0.2,
  },
  circle2: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: Brand.primaryDark,
    opacity: 0.4,
    bottom: -width * 0.1,
    left: -width * 0.15,
  },
  circle3: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: height * 0.2,
    right: 40,
  },

  // Konten
  content: {
    alignItems: 'center',
    gap: 12,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    // Inner glow effect
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 52,
  },
  appName: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Loading dots
  dotsWrapper: {
    position: 'absolute',
    bottom: 60,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});