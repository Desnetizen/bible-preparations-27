import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { BrandHero, bootIntro } from '@/components/brand-hero';
import { Brand } from '@/constants/brand';

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

  const finished = timedOut || (animationDone && ready);

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

  useEffect(() => {
    if (finished) bootIntro.active = false;
  }, [finished]);

  if (finished) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(FADE_OUT_MS)}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.overlay, { backgroundColor: Brand.background }]}>
      <StatusBar style="light" />
      <BrandHero
        mode="play"
        onLoaded={hideNativeSplash}
        onFinish={(isCancelled) => {
          if (!isCancelled) setAnimationDone(true);
        }}
        onFailure={() => {
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
    justifyContent: 'flex-start',
    zIndex: 1000,
  },
});
