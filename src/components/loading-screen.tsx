import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

const LOADING_ANIMATION = require('@/assets/Animation/bible-connection.json');

/** Must match the native splash `backgroundColor` in app.json. */
const LOADING_BACKGROUND = '#040A1F';

const FADE_OUT_MS = 400;
/** Safety net: never trap the user behind the loading screen. */
const MAX_WAIT_MS = 12000;

type LoadingScreenProps = {
  /**
   * Flip to `true` once fonts, data, etc. are ready. The screen leaves only
   * after the animation has played through AND the app is ready.
   */
  ready?: boolean;
};

export function LoadingScreen({ ready = true }: LoadingScreenProps) {
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
      style={[styles.overlay, { backgroundColor: LOADING_BACKGROUND }]}>
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
    width: '90%',
    maxWidth: 600,
    aspectRatio: 1536 / 1024, // the animation's 1536x1024 canvas
  },
});