import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import * as Haptics from "expo-haptics";

interface DailyTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  estimated_duration?: number;
  priority: number;
  is_active: boolean;
  order: number;
  created_at: string;
}

interface TodayCompletions {
  completed_today: number;
  completed_task_ids: string[];
  total_coins_earned: number;
}

export default function DailyTasks() {
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<TodayCompletions>({
    completed_today: 0,
    completed_task_ids: [],
    total_coins_earned: 0,
  });
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchDailyTasks = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/daily-tasks`);
      if (response.ok) {
        const data = await response.json();
        setDailyTasks(data);
      }
    } catch (error) {
      console.error("Error fetching daily tasks:", error);
    }
  };

  const fetchTodayCompletions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/daily-tasks/completions/today`);
      if (response.ok) {
        const data = await response.json();
        setTodayCompletions(data);
      }
    } catch (error) {
      console.error("Error fetching today's completions:", error);
    }
  };

  const createDailyTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert("Missing Information", "Please enter a task title");
      return;
    }

    if (dailyTasks.length >= 6) {
      Alert.alert("Limit Reached", "You can only have up to 6 daily tasks");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/daily-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription || null,
          estimated_duration: newTaskDuration ? parseInt(newTaskDuration) : null,
          priority: 3,
        }),
      });

      if (response.ok) {
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskDuration("");
        setShowAddTask(false);
        await fetchDailyTasks();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Daily task added successfully!");
      } else {
        const error = await response.json();
        Alert.alert("Error", error.detail || "Failed to create daily task");
      }
    } catch (error) {
      console.error("Error creating daily task:", error);
      Alert.alert("Error", "Failed to create daily task. Please try again.");
    }
  };

  const completeDailyTask = async (taskId: string, taskTitle: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/daily-tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        await Promise.all([fetchTodayCompletions()]);
        
        Alert.alert(
          "Task Completed! 🎉",
          `Great job completing "${taskTitle}"!\n\nYou earned ${data.coins_earned} coin!`,
          [{ text: "Awesome!" }]
        );
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const error = await response.json();
        Alert.alert("Error", error.detail || "Failed to complete task");
      }
    } catch (error) {
      console.error("Error completing daily task:", error);
      Alert.alert("Error", "Failed to complete task. Please try again.");
    }
  };

  const deleteDailyTask = (taskId: string, taskTitle: string) => {
    Alert.alert(
      "Delete Daily Task",
      `Are you sure you want to delete "${taskTitle}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/daily-tasks/${taskId}`, {
                method: "DELETE",
              });

              if (response.ok) {
                await fetchDailyTasks();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                Alert.alert("Error", "Failed to delete daily task");
              }
            } catch (error) {
              console.error("Error deleting daily task:", error);
              Alert.alert("Error", "Failed to delete daily task");
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDailyTasks(), fetchTodayCompletions()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchDailyTasks(), fetchTodayCompletions()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const isTaskCompletedToday = (taskId: string) => {
    return todayCompletions.completed_task_ids.includes(taskId);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading daily tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Tasks</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddTask(!showAddTask)}
          >
            <Ionicons 
              name={showAddTask ? "close" : "add"} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerSubtitle}>
          Build consistent daily habits with up to 6 tasks
        </Text>

        {/* Today's Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSubtitle}>
              {todayCompletions.completed_today}/{dailyTasks.length} tasks completed
            </Text>
          </View>
          <View style={styles.coinsEarned}>
            <Ionicons name="diamond" size={20} color="#FFD93D" />
            <Text style={styles.coinsEarnedText}>
              +{todayCompletions.total_coins_earned}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { 
                width: dailyTasks.length > 0 
                  ? `${(todayCompletions.completed_today / dailyTasks.length) * 100}%` 
                  : "0%"
              }
            ]} />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Add Task Form */}
          {showAddTask && (
            <View style={[styles.addTaskForm, { backgroundColor: colors.surface }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Add New Daily Task</Text>
              
              <TextInput
                style={[styles.taskInput, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                placeholder="Task title (e.g., Morning meditation)"
                placeholderTextColor={colors.textSecondary}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                maxLength={100}
              />

              <TextInput
                style={[styles.descriptionInput, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
                numberOfLines={2}
                maxLength={200}
              />

              <TextInput
                style={[styles.durationInput, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                placeholder="Estimated duration (minutes)"
                placeholderTextColor={colors.textSecondary}
                value={newTaskDuration}
                onChangeText={setNewTaskDuration}
                keyboardType="numeric"
              />

              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: colors.primary }]} 
                onPress={createDailyTask}
              >
                <Text style={styles.createButtonText}>Add Daily Task</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Daily Tasks List */}
          <View style={styles.tasksSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your Daily Tasks ({dailyTasks.length}/6)
            </Text>

            {dailyTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="today-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No daily tasks yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  Add up to 6 tasks that you want to do every day
                </Text>
                <TouchableOpacity 
                  style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddTask(true)}
                >
                  <Text style={styles.emptyStateButtonText}>Add Your First Task</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.tasksList}>
                {dailyTasks.map((task, index) => {
                  const isCompleted = isTaskCompletedToday(task.id);
                  
                  return (
                    <View
                      key={task.id}
                      style={[
                        styles.taskCard,
                        { 
                          backgroundColor: colors.surface,
                          opacity: isCompleted ? 0.7 : 1
                        }
                      ]}
                    >
                      <View style={styles.taskHeader}>
                        <View style={styles.taskNumber}>
                          <Text style={[styles.taskNumberText, { color: colors.primary }]}>
                            {index + 1}
                          </Text>
                        </View>
                        
                        <View style={styles.taskContent}>
                          <Text style={[
                            styles.taskTitle, 
                            { 
                              color: colors.text,
                              textDecorationLine: isCompleted ? "line-through" : "none"
                            }
                          ]}>
                            {task.title}
                          </Text>
                          
                          {task.description && (
                            <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                              {task.description}
                            </Text>
                          )}
                          
                          <View style={styles.taskMeta}>
                            {task.estimated_duration && (
                              <Text style={[styles.taskDuration, { color: colors.textSecondary }]}>
                                {formatDuration(task.estimated_duration)}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.taskActions}>
                          {isCompleted ? (
                            <View style={[styles.completedBadge, { backgroundColor: colors.success + "20" }]}>
                              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                              <Text style={[styles.completedText, { color: colors.success }]}>Done</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.completeButton, { backgroundColor: colors.success }]}
                              onPress={() => completeDailyTask(task.id, task.title)}
                            >
                              <Ionicons name="checkmark" size={20} color="#ffffff" />
                            </TouchableOpacity>
                          )}
                          
                          <TouchableOpacity
                            style={[styles.deleteButton, { backgroundColor: colors.error + "20" }]}
                            onPress={() => deleteDailyTask(task.id, task.title)}
                          >
                            <Ionicons name="trash" size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Tips Section */}
          {dailyTasks.length > 0 && (
            <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                style={styles.tipsHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="bulb" size={20} color="#ffffff" />
                <Text style={styles.tipsTitle}>Daily Task Tips</Text>
              </LinearGradient>
              
              <View style={styles.tipsContent}>
                <Text style={[styles.tipText, { color: colors.text }]}>
                  • Complete tasks early in the day for maximum productivity
                </Text>
                <Text style={[styles.tipText, { color: colors.text }]}>
                  • Each completed daily task earns you 1 coin
                </Text>
                <Text style={[styles.tipText, { color: colors.text }]}>
                  • Build streaks by completing tasks consistently
                </Text>
                <Text style={[styles.tipText, { color: colors.text }]}>
                  • Keep tasks simple and achievable
                </Text>
              </View>
            </View>
          )}
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e0e0",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  progressCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  progressSubtitle: {
    fontSize: 12,
    color: "#e0e0e0",
    marginTop: 2,
  },
  coinsEarned: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coinsEarnedText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFD93D",
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  addTaskForm: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  taskInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  descriptionInput: {
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  durationInput: {
    fontSize: 16,
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
  tasksSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
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
    paddingHorizontal: 40,
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  emptyStateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskNumberText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskDuration: {
    fontSize: 12,
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tipsCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tipsContent: {
    padding: 16,
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});