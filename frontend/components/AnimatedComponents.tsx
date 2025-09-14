import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  withSequence,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import HapticFeedback from 'react-native-haptic-feedback';
import { Ionicons } from '@expo/vector-icons';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// Animated Card Component
interface AnimatedCardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  delay?: number;
  scale?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  onPress,
  delay = 0,
  scale = true,
}) => {
  const scaleValue = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  React.useEffect(() => {
    scaleValue.value = withDelay(
      delay,
      withSpring(1, {
        damping: 15,
        stiffness: 150,
      })
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, {
        damping: 12,
        stiffness: 100,
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale ? scaleValue.value : 1 },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
    };
  });

  const pressGesture = Gesture.Tap()
    .onBegin(() => {
      if (scale) {
        scaleValue.value = withSpring(0.95, { damping: 15 });
      }
      runOnJS(HapticFeedback.trigger)('impactLight', hapticOptions);
    })
    .onFinalize(() => {
      if (scale) {
        scaleValue.value = withSpring(1, { damping: 15 });
      }
      if (onPress) {
        runOnJS(onPress)();
      }
    });

  return (
    <GestureDetector gesture={pressGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

// Animated Button Component
interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  style?: any;
  textStyle?: any;
  icon?: string;
  gradient?: string[];
  disabled?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  icon,
  gradient,
  disabled = false,
}) => {
  const scaleValue = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
      opacity: opacity.value,
    };
  });

  const pressGesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scaleValue.value = withSpring(0.95, { damping: 15 });
      runOnJS(HapticFeedback.trigger)('impactMedium', hapticOptions);
    })
    .onFinalize(() => {
      scaleValue.value = withSpring(1, { damping: 15 });
      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={pressGesture}>
      <Animated.View style={[style, animatedStyle, disabled && { opacity: 0.5 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icon && <Ionicons name={icon as any} size={20} color="white" style={{ marginRight: 8 }} />}
          <Text style={textStyle}>{title}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

// Progress Circle Animation
interface AnimatedProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color = '#667eea',
  backgroundColor = '#e2e8f0',
}) => {
  const animatedProgress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  React.useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const strokeDashoffset = circumference - (animatedProgress.value * circumference);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: backgroundColor,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

// Swipe to Complete Task
interface SwipeToCompleteProps {
  children: React.ReactNode;
  onComplete: () => void;
  threshold?: number;
}

export const SwipeToComplete: React.FC<SwipeToCompleteProps> = ({
  children,
  onComplete,
  threshold = 100,
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        opacity.value = Math.max(0.3, 1 - event.translationX / 200);
        scale.value = Math.max(0.8, 1 - event.translationX / 400);
      }
    })
    .onEnd((event) => {
      if (event.translationX > threshold) {
        // Complete the task
        translateX.value = withTiming(300, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.5, { duration: 300 });
        runOnJS(HapticFeedback.trigger)('notificationSuccess', hapticOptions);
        runOnJS(onComplete)();
      } else {
        // Bounce back
        translateX.value = withSpring(0, { damping: 15 });
        opacity.value = withSpring(1, { damping: 15 });
        scale.value = withSpring(1, { damping: 15 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

// Floating Action Button
interface FloatingActionButtonProps {
  onPress: () => void;
  icon: string;
  style?: any;
  size?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon,
  style,
  size = 56,
}) => {
  const scaleValue = useSharedValue(1);
  const rotateValue = useSharedValue(0);

  React.useEffect(() => {
    scaleValue.value = withSpring(1, { damping: 12 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleValue.value },
        { rotate: `${rotateValue.value}deg` },
      ],
    };
  });

  const pressGesture = Gesture.Tap()
    .onBegin(() => {
      scaleValue.value = withSpring(0.9, { damping: 15 });
      rotateValue.value = withSpring(90, { damping: 15 });
      runOnJS(HapticFeedback.trigger)('impactMedium', hapticOptions);
    })
    .onFinalize(() => {
      scaleValue.value = withSpring(1, { damping: 15 });
      rotateValue.value = withSpring(0, { damping: 15 });
      runOnJS(onPress)();
    });

  return (
    <GestureDetector gesture={pressGesture}>
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#667eea',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
          style,
          animatedStyle,
        ]}
      >
        <Ionicons name={icon as any} size={24} color="white" />
      </Animated.View>
    </GestureDetector>
  );
};

// Staggered List Animation
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 100,
}) => {
  return (
    <>
      {children.map((child, index) => (
        <AnimatedCard key={index} delay={index * staggerDelay}>
          {child}
        </AnimatedCard>
      ))}
    </>
  );
};

// Morphing Counter
interface MorphingCounterProps {
  value: number;
  style?: any;
}

export const MorphingCounter: React.FC<MorphingCounterProps> = ({ value, style }) => {
  const animatedValue = useSharedValue(0);

  React.useEffect(() => {
    animatedValue.value = withSpring(value, {
      damping: 15,
      stiffness: 150,
    });
  }, [value]);

  const animatedProps = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(
            animatedValue.value % 1,
            [0, 0.5, 1],
            [1, 1.1, 1]
          ),
        },
      ],
    };
  });

  return (
    <Animated.Text style={[style, animatedProps]}>
      {Math.round(animatedValue.value)}
    </Animated.Text>
  );
};