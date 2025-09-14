import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  Dimensions,
  RefreshControl,
  StatusBar as RNStatusBar,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import HapticFeedback from 'react-native-haptic-feedback';
import {
  AnimatedCard,
  AnimatedButton,
  SwipeToComplete,
  FloatingActionButton,
  StaggeredList,
  MorphingCounter,
} from '../components/AnimatedComponents';

const { width, height } = Dimensions.get("window");

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: number;
  ai_priority?: number;
  category: string;
  tags: string[];
  due_date?: string;
  completed: boolean;
  estimated_duration?: number;
  created_at: string;
}

interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  xp_points: number;
  coins: number;
  inr_value: number;
  karma_level: number;
  habit_completions_this_week: number;
  daily_tasks_completed_today: number;
  current_streak: number;
  friends_count: number;
}

export default function IndexV2() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'focus'>('list');
  
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const quickAddScale = useSharedValue(0);

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  // Animated Values
  const greetingOpacity = useSharedValue(0);
  const statsScale = useSharedValue(0);
  const tasksTranslateY = useSharedValue(50);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Initial animations
  useEffect(() => {
    greetingOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
    
    statsScale.value = withDelay(
      400,
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    
    tasksTranslateY.value = withDelay(
      600,
      withSpring(0, { damping: 15, stiffness: 150 })
    );
  }, []);

  // API Functions
  const fetchTasks = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks?completed=false`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/analytics/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const createQuickTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          priority: 3,
          category: "quick",
        }),
      });

      if (response.ok) {
        setNewTaskTitle("");
        setShowQuickAdd(false);
        quickAddScale.value = withSpring(0);
        await fetchTasks();
        await fetchStats();
        HapticFeedback.trigger('notificationSuccess');
      }
    } catch (error) {
      console.error("Error creating task:", error);
      Alert.alert("Error", "Failed to create task");
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });

      if (response.ok) {
        await fetchTasks();
        await fetchStats();
        HapticFeedback.trigger('notificationSuccess');
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const getNextBestTask = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/next-best`);
      if (response.ok) {
        const data = await response.json();
        if (data.recommendation) {
          Alert.alert("AI Recommendation", data.recommendation, [
            { text: "Got it!", style: "default" }
          ]);
        }
      }
    } catch (error) {
      console.error("Error getting recommendation:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTasks(), fetchStats()]);
    setRefreshing(false);
  };

  const toggleQuickAdd = () => {
    setShowQuickAdd(!showQuickAdd);
    quickAddScale.value = withSpring(showQuickAdd ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
    HapticFeedback.trigger('impactLight');
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchTasks(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getMotivationalMessage = () => {
    const messages = [
      "Let's make today productive",
      "Time to crush your goals",
      "Ready to achieve greatness",
      "Your productivity journey continues",
      "Make every moment count",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return colors.error;
      case 4: return "#FF9500";
      case 3: return colors.warning;
      case 2: return colors.success;
      default: return colors.primary;
    }
  };

  const formatXP = (xp: number) => {
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  };

  // Animated Styles
  const greetingStyle = useAnimatedStyle(() => ({
    opacity: greetingOpacity.value,
    transform: [
      {
        translateY: interpolate(greetingOpacity.value, [0, 1], [20, 0]),
      },
    ],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statsScale.value }],
    opacity: statsScale.value,
  }));

  const tasksStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tasksTranslateY.value }],
    opacity: interpolate(tasksTranslateY.value, [50, 0], [0, 1]),
  }));

  const quickAddStyle = useAnimatedStyle(() => ({
    transform: [{ scale: quickAddScale.value }],
    opacity: quickAddScale.value,
  }));

  const styles = createStyles(colors, isDarkMode);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Animated.View style={styles.loadingContent}>
            <Text style={[styles.loadingText, { color: colors.text }]}>
              TaskFlow V2
            </Text>
            <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
              Loading your productivity hub...
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Dynamic Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <Animated.View style={[styles.header, greetingStyle]}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()}!</Text>
              <Text style={styles.subtitle}>{getMotivationalMessage()}</Text>
              <Text style={styles.timeText}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push("/settings")}
              >
                <Ionicons name="settings-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push("/profile")}
              >
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>P</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Enhanced Stats Cards */}
          {stats && (
            <Animated.View style={[styles.statsContainer, statsStyle]}>
              <AnimatedCard style={styles.statCard} delay={0}>
                <Ionicons name="flash" size={20} color="#FFD93D" />
                <MorphingCounter value={stats.xp_points} style={styles.statNumber} />
                <Text style={styles.statLabel}>XP</Text>
              </AnimatedCard>
              
              <AnimatedCard 
                style={styles.statCard} 
                delay={100}
                onPress={() => router.push("/store")}
              >
                <Ionicons name="diamond" size={20} color="#4ECDC4" />
                <MorphingCounter value={stats.coins} style={styles.statNumber} />
                <Text style={styles.statLabel}>Coins</Text>
              </AnimatedCard>
              
              <AnimatedCard style={styles.statCard} delay={200}>
                <Ionicons name="flame" size={20} color="#FF6B6B" />
                <MorphingCounter value={stats.current_streak} style={styles.statNumber} />
                <Text style={styles.statLabel}>Streak</Text>
              </AnimatedCard>
              
              <AnimatedCard 
                style={styles.statCard} 
                delay={300}
                onPress={() => router.push("/friends")}
              >
                <Ionicons name="people" size={20} color="#967ADC" />
                <MorphingCounter value={stats.friends_count} style={styles.statNumber} />
                <Text style={styles.statLabel}>Friends</Text>
              </AnimatedCard>
            </Animated.View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        {(['list', 'board', 'focus'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.viewModeButton,
              { backgroundColor: viewMode === mode ? colors.primary : colors.surface }
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Ionicons 
              name={mode === 'list' ? 'list' : mode === 'board' ? 'grid' : 'eye'} 
              size={16} 
              color={viewMode === mode ? '#ffffff' : colors.textSecondary} 
            />
            <Text style={[
              styles.viewModeText,
              { color: viewMode === mode ? '#ffffff' : colors.textSecondary }
            ]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions Row */}
      <View style={styles.quickActionsRow}>
        <AnimatedButton
          title="AI Suggest"
          onPress={getNextBestTask}
          style={[styles.quickActionButton, { backgroundColor: colors.primary }]}
          textStyle={styles.quickActionText}
          icon="sparkles"
        />
        
        <AnimatedButton
          title="Task Crusher"
          onPress={() => router.push("/task-crusher")}
          style={[styles.quickActionButton, { backgroundColor: "#FF6B6B" }]}
          textStyle={styles.quickActionText}
          icon="hammer"
        />
      </View>

      {/* Tasks Section */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            progressBackgroundColor={colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={tasksStyle}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Today's Tasks ({tasks.length})
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {tasks.filter(t => !t.completed).length} remaining
            </Text>
          </View>

          {tasks.length === 0 ? (
            <AnimatedCard style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                All caught up!
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                Add new tasks to stay productive
              </Text>
            </AnimatedCard>
          ) : (
            <StaggeredList staggerDelay={50}>
              {tasks.map((task) => (
                <SwipeToComplete
                  key={task.id}
                  onComplete={() => completeTask(task.id)}
                  threshold={80}
                >
                  <View style={[styles.taskCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <View style={[
                          styles.priorityDot,
                          { backgroundColor: getPriorityColor(task.ai_priority || task.priority) }
                        ]} />
                        <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                      </View>
                      
                      {task.description && (
                        <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                          {task.description}
                        </Text>
                      )}
                      
                      <View style={styles.taskFooter}>
                        <View style={styles.taskMeta}>
                          <View style={[styles.categoryTag, { backgroundColor: colors.primary + "20" }]}>
                            <Text style={[styles.categoryText, { color: colors.primary }]}>
                              {task.category}
                            </Text>
                          </View>
                          
                          {task.estimated_duration && (
                            <View style={styles.durationContainer}>
                              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                                {task.estimated_duration}m
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {task.ai_priority && (
                          <View style={[styles.aiTag, { backgroundColor: colors.warning + "20" }]}>
                            <Ionicons name="sparkles" size={10} color={colors.warning} />
                            <Text style={[styles.aiTagText, { color: colors.warning }]}>
                              AI Priority
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.completeButton, { borderColor: colors.success }]}
                      onPress={() => completeTask(task.id)}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.success} />
                    </TouchableOpacity>
                  </View>
                </SwipeToComplete>
              ))}
            </StaggeredList>
          )}
        </Animated.View>

        {/* Navigation Grid */}
        <View style={styles.navigationGrid}>
          <AnimatedCard 
            style={[styles.navCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/daily-tasks")}
          >
            <Ionicons name="today" size={28} color={colors.primary} />
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Daily Tasks</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              Routine builder
            </Text>
          </AnimatedCard>
          
          <AnimatedCard 
            style={[styles.navCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/habits")}
          >
            <Ionicons name="repeat" size={28} color="#FF6B6B" />
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Habits</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              Build streaks
            </Text>
          </AnimatedCard>
          
          <AnimatedCard 
            style={[styles.navCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/store")}
          >
            <Ionicons name="storefront" size={28} color="#4ECDC4" />
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Store</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              Spend coins
            </Text>
          </AnimatedCard>
          
          <AnimatedCard 
            style={[styles.navCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/analytics")}
          >
            <Ionicons name="analytics" size={28} color="#967ADC" />
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Analytics</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              Track progress
            </Text>
          </AnimatedCard>
          
          <AnimatedCard 
            style={[styles.navCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/leaderboard")}
          >
            <Ionicons name="trophy" size={28} color="#FFD93D" />
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Leaderboard</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              Compete
            </Text>
          </AnimatedCard>
          
          <AnimatedCard 
            style={[styles.navCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/social")}
          >
            <Ionicons name="people" size={28} color="#FF9500" />
            <Text style={[styles.navCardTitle, { color: colors.text }]}>Social</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              Activity feed
            </Text>
          </AnimatedCard>
        </View>
      </ScrollView>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <Animated.View style={[styles.quickAddModal, quickAddStyle]}>
          <View style={[styles.quickAddContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.quickAddTitle, { color: colors.text }]}>Quick Add Task</Text>
            <TextInput
              style={[styles.quickAddInput, { 
                color: colors.text, 
                borderColor: colors.border,
                backgroundColor: colors.background 
              }]}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textSecondary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
              onSubmitEditing={createQuickTask}
            />
            <View style={styles.quickAddActions}>
              <TouchableOpacity
                style={[styles.quickAddCancel, { backgroundColor: colors.border }]}
                onPress={toggleQuickAdd}
              >
                <Text style={[styles.quickAddCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickAddConfirm, { backgroundColor: colors.primary }]}
                onPress={createQuickTask}
              >
                <Text style={styles.quickAddConfirmText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={toggleQuickAdd}
        icon="add"
        style={[styles.fab, { backgroundColor: colors.primary }]}
      />
    </View>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    fontWeight: "400",
  },
  headerGradient: {
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileButton: {
    width: 44,
    height: 44,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },
  viewModeContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  viewModeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickActionsRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  quickActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    borderRadius: 24,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
  },
  taskCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 6,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    lineHeight: 24,
  },
  taskDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
    marginLeft: 20,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 20,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    fontWeight: "500",
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  completeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  navigationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 24,
  },
  navCard: {
    width: (width - 64) / 2,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  navCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  navCardSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  quickAddModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  quickAddContent: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
  },
  quickAddTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  quickAddInput: {
    fontSize: 16,
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  quickAddActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickAddCancel: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  quickAddCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  quickAddConfirm: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  quickAddConfirmText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
});