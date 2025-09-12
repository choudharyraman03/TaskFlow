import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Dimensions,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";

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
  karma_level: number;
  habit_completions_this_week: number;
  current_streak: number;
  friends_count: number;
}

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

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

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          priority: 3,
          category: "personal",
        }),
      });

      if (response.ok) {
        setNewTaskTitle("");
        setShowAddTask(false);
        await fetchTasks();
        await fetchStats();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          Alert.alert("AI Recommendation", data.recommendation);
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

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchTasks(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return "#FF3B30";
      case 4: return "#FF9500";
      case 3: return "#FFCC00";
      case 2: return "#30D158";
      default: return "#007AFF";
    }
  };

  const formatXP = (xp: number) => {
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your productivity hub...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>
                  Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}!
                </Text>
                <Text style={styles.subtitle}>Let's make today productive</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => router.push("/settings")}
                >
                  <Ionicons name="settings" size={24} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => router.push("/profile")}
                >
                  <Ionicons name="person-circle-outline" size={32} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Stats Cards */}
            {stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Ionicons name="flash" size={20} color="#FFD93D" />
                  <Text style={styles.statNumber}>{formatXP(stats.xp_points)}</Text>
                  <Text style={styles.statLabel}>XP</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="diamond" size={20} color="#4ECDC4" />
                  <Text style={styles.statNumber}>{stats.karma_level}</Text>
                  <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="flame" size={20} color="#FF6B6B" />
                  <Text style={styles.statNumber}>{stats.current_streak}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="people" size={20} color="#967ADC" />
                  <Text style={styles.statNumber}>{stats.friends_count}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* AI Recommendation Button */}
          <TouchableOpacity style={styles.aiButton} onPress={getNextBestTask}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.aiButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="sparkles" size={20} color="#ffffff" />
              <Text style={styles.aiButtonText}>Get AI Recommendation</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Tasks Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Active Tasks ({tasks.length})
              </Text>
              <TouchableOpacity 
                style={[styles.addButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowAddTask(!showAddTask)}
              >
                <Ionicons 
                  name={showAddTask ? "close" : "add"} 
                  size={24} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            </View>

            {/* Add Task Form */}
            {showAddTask && (
              <View style={[styles.addTaskForm, { backgroundColor: colors.surface }]}>
                <TextInput
                  style={[styles.taskInput, { 
                    color: colors.text, 
                    borderColor: colors.border,
                    backgroundColor: colors.background 
                  }]}
                  placeholder="What needs to be done?"
                  placeholderTextColor={colors.textSecondary}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity 
                  style={[styles.createButton, { backgroundColor: colors.primary }]} 
                  onPress={createTask}
                >
                  <Text style={styles.createButtonText}>Create Task</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Task List */}
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No active tasks
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  Tap the + button to add your first task
                </Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskCard, { backgroundColor: colors.surface }]}
                    onPress={() => completeTask(task.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <View style={[
                          styles.priorityIndicator,
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
                          <Text style={[styles.taskCategory, { 
                            backgroundColor: colors.primary + "20",
                            color: colors.primary 
                          }]}>
                            {task.category}
                          </Text>
                          {task.estimated_duration && (
                            <Text style={[styles.taskDuration, { color: colors.textSecondary }]}>
                              {task.estimated_duration}min
                            </Text>
                          )}
                        </View>
                        
                        {task.ai_priority && (
                          <View style={[styles.aiTag, { backgroundColor: colors.primary + "20" }]}>
                            <Ionicons name="sparkles" size={12} color={colors.primary} />
                            <Text style={[styles.aiTagText, { color: colors.primary }]}>
                              AI Priority
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.completeButton, { 
                        backgroundColor: colors.success + "20",
                        borderColor: colors.success 
                      }]}
                      onPress={() => completeTask(task.id)}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.success} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Enhanced Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/habits")}
            >
              <Ionicons name="repeat" size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.text }]}>Habits</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/analytics")}
            >
              <Ionicons name="analytics" size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.text }]}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/friends")}
            >
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.text }]}>Friends</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push("/leaderboard")}
            >
              <Ionicons name="trophy" size={24} color={colors.primary} />
              <Text style={[styles.quickActionText, { color: colors.text }]}>Leaderboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 0 : 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "#e0e0e0",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 70,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#e0e0e0",
    marginTop: 4,
  },
  aiButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  aiButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  aiButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addTaskForm: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskInput: {
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  createButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskCategory: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  taskDuration: {
    fontSize: 12,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiTagText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    borderWidth: 1,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  quickActionButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: "500",
  },
});