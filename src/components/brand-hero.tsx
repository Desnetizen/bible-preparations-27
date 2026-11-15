import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

const ANIMATION = require('@/assets/Animation/bible-connection.json');

const LAST_FRAME = ANIMATION.op - 1;

/**
 * The same animation cut down to its final frame. It renders the finished logo
 * on every platform without needing the `progress` prop, which Lottie does not
 * support on web.
 */
const SETTLED_ANIMATION = { ...ANIMATION, ip: LAST_FRAME, op: LAST_FRAME + 1 };

/** The animation canvas is 1536x1024, but the artwork only fills the middle band. */
const CANVAS_ASPECT = 1536 / 1024;
const CROP_ASPECT = 2.1;
const MAX_WIDTH = 460;

/**
 * Tracks whether the boot loading screen is still on top. The sign-in screen
 * mounts underneath it, so while this is true the hero shows the finished logo
 * instead of replaying an animation the user just watched.
 */
export const bootIntro = { active: true };

type BrandHeroProps = {
  /** `play` runs the animation once. `settled` shows the finished logo. */
  mode?: 'play' | 'settled';
  onLoaded?: () => void;
  onFinish?: (isCancelled: boolean) => void;
  onFailure?: () => void;
};

/**
 * The logo animation, placed in the upper section of the screen. The loading
 * screen and the sign-in screen both render this, so the logo does not move when
 * one hands off to the other.
 */
export function BrandHero({ mode = 'play', onLoaded, onFinish, onFailure }: BrandHeroProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.three }]}>
      <View
        style={styles.crop}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Bible Connection logo">
        <View style={styles.canvas} pointerEvents="none">
          <LottieView
            source={mode === 'settled' ? SETTLED_ANIMATION : ANIMATION}
            autoPlay
            loop={false}
            resizeMode="contain"
            style={StyleSheet.absoluteFill}
            // On web the component ignores `style` and sizes itself from `webStyle`.
            webStyle={{ width: '100%', height: '100%' }}
            onAnimationLoaded={onLoaded}
            onAnimationFinish={onFinish}
            onAnimationFailure={onFailure}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  crop: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    aspectRatio: CROP_ASPECT,
    overflow: 'hidden',
  },
  // Taller than the crop box so the empty bands above and below the artwork are
  // trimmed. 100% x 140% matches the canvas ratio exactly: 2.1 / 1.4 = 1.5.
  canvas: {
    position: 'absolute',
    width: '100%',
    height: `${(CROP_ASPECT / CANVAS_ASPECT) * 100}%`,
    top: `${-((CROP_ASPECT / CANVAS_ASPECT - 1) / 2) * 100}%`,
  },
});
