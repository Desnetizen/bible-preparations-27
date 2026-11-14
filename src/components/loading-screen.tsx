import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

const LOADING_ANIMATION = require('@/assets/animation/bible-connection.json');

const FADE_OUT_MS = 400;
/** Safety net: never trap the user behind the loading screen. */
const MAX_WAIT_MS = 8000;

type LoadingScreenProps = {
  /**
   * Flip to `true` once fonts, data, etc. are ready. The screen leaves only
   * after the animation has played through AND the app is ready.
   */
  ready?: boolean;
};

export function LoadingScreen({ ready = true }: LoadingScreenProps) {
  const theme = useTheme();
  const [animationDone, setAnimationDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const splashHidden = useRef(false);

  // The native splash stays up until the animation is loaded, so the handoff
  // never shows an empty frame.
  function hideNativeSplash() {
    if (splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      hideNativeSplash();
      setTimedOut(true);
    }, MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut || (animationDone && ready)) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(FADE_OUT_MS)}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.overlay, { backgroundColor: theme.background }]}>
      <LottieView
        source={LOADING_ANIMATION}
        autoPlay
        loop={false}
        resizeMode="contain"
        style={styles.animation}
        onAnimationLoaded={hideNativeSplash}
        onAnimationFinish={(isCancelled) => {
          if (!isCancelled) setAnimationDone(true);
        }}
        onAnimationFailure={() => {
          hideNativeSplash();
          setAnimationDone(true);
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  animation: {
    width: '80%',
    maxWidth: 420,
    aspectRatio: 1,
  },
});