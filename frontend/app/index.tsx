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
}

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your productivity hub...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}!</Text>
                <Text style={styles.subtitle}>Let's make today productive</Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push("/profile")}
              >
                <Ionicons name="person-circle-outline" size={32} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            {stats && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{formatXP(stats.xp_points)}</Text>
                  <Text style={styles.statLabel}>XP Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.karma_level}</Text>
                  <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{Math.round(stats.completion_rate * 100)}%</Text>
                  <Text style={styles.statLabel}>Completion</Text>
                </View>
              </View>
            )}
          </LinearGradient>

          {/* AI Recommendation Button */}
          <TouchableOpacity style={styles.aiButton} onPress={getNextBestTask}>
            <LinearGradient
              colors={["#FF6B6B", "#FF8E8E"]}
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
              <Text style={styles.sectionTitle}>Active Tasks ({tasks.length})</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowAddTask(!showAddTask)}
              >
                <Ionicons 
                  name={showAddTask ? "close" : "add"} 
                  size={24} 
                  color="#667eea" 
                />
              </TouchableOpacity>
            </View>

            {/* Add Task Form */}
            {showAddTask && (
              <View style={styles.addTaskForm}>
                <TextInput
                  style={styles.taskInput}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#999"
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity style={styles.createButton} onPress={createTask}>
                  <Text style={styles.createButtonText}>Create Task</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Task List */}
            {tasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#cccccc" />
                <Text style={styles.emptyStateText}>No active tasks</Text>
                <Text style={styles.emptyStateSubtext}>Tap the + button to add your first task</Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {tasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskCard}
                    onPress={() => completeTask(task.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.taskContent}>
                      <View style={styles.taskHeader}>
                        <View style={[
                          styles.priorityIndicator,
                          { backgroundColor: getPriorityColor(task.ai_priority || task.priority) }
                        ]} />
                        <Text style={styles.taskTitle} numberOfLines={2}>
                          {task.title}
                        </Text>
                      </View>
                      
                      {task.description && (
                        <Text style={styles.taskDescription} numberOfLines={2}>
                          {task.description}
                        </Text>
                      )}
                      
                      <View style={styles.taskFooter}>
                        <View style={styles.taskMeta}>
                          <Text style={styles.taskCategory}>{task.category}</Text>
                          {task.estimated_duration && (
                            <Text style={styles.taskDuration}>
                              {task.estimated_duration}min
                            </Text>
                          )}
                        </View>
                        
                        {task.ai_priority && (
                          <View style={styles.aiTag}>
                            <Ionicons name="sparkles" size={12} color="#667eea" />
                            <Text style={styles.aiTagText}>AI Priority</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() => completeTask(task.id)}
                    >
                      <Ionicons name="checkmark" size={20} color="#30D158" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/habits")}
            >
              <Ionicons name="repeat" size={24} color="#667eea" />
              <Text style={styles.quickActionText}>Habits</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/analytics")}
            >
              <Ionicons name="analytics" size={24} color="#667eea" />
              <Text style={styles.quickActionText}>Analytics</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/notifications")}
            >
              <Ionicons name="notifications" size={24} color="#667eea" />
              <Text style={styles.quickActionText}>Reminders</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    backgroundColor: "#667eea",
  },
  loadingText: {
    color: "#ffffff",
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
  profileButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
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
    color: "#2d3748",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addTaskForm: {
    backgroundColor: "#ffffff",
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
    color: "#2d3748",
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: "#667eea",
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
    color: "#a0aec0",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#cbd5e0",
    marginTop: 8,
    textAlign: "center",
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: "#ffffff",
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
    color: "#2d3748",
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    color: "#718096",
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
    color: "#a0aec0",
    backgroundColor: "#f7fafc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  taskDuration: {
    fontSize: 12,
    color: "#a0aec0",
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#edf2f7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiTagText: {
    fontSize: 10,
    color: "#667eea",
    marginLeft: 4,
    fontWeight: "500",
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0fff4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    borderWidth: 1,
    borderColor: "#30D158",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    marginTop: 24,
  },
  quickActionButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    minWidth: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    color: "#2d3748",
    marginTop: 8,
    fontWeight: "500",
  },
});