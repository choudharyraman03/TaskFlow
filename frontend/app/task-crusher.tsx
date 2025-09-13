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
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import * as Haptics from "expo-haptics";

interface SubTaskSuggestion {
  title: string;
  description: string;
  estimated_duration: number;
  priority: number;
  order: number;
  dependencies: string[];
  selected: boolean;
}

interface TaskCrusherResponse {
  main_task: string;
  suggested_subtasks: SubTaskSuggestion[];
  total_estimated_duration: number;
  completion_strategy: string;
  ai_confidence: number;
}

interface TaskGroup {
  id: string;
  main_task_title: string;
  main_task_description: string;
  category: string;
  total_subtasks: number;
  completed_subtasks: number;
  progress_percentage: number;
  created_at: string;
  is_active: boolean;
}

export default function TaskCrusher() {
  const [mainTask, setMainTask] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "expert">("medium");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [crusherResponse, setCrusherResponse] = useState<TaskCrusherResponse | null>(null);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"crusher" | "groups">("crusher");

  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchTaskGroups = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/task-crusher/groups`);
      if (response.ok) {
        const data = await response.json();
        setTaskGroups(data);
      }
    } catch (error) {
      console.error("Error fetching task groups:", error);
    }
  };

  const analyzeTask = async () => {
    if (!mainTask.trim()) {
      Alert.alert("Missing Information", "Please enter a task to analyze");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/task-crusher/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          main_task: mainTask,
          description: description,
          category: "personal",
          estimated_duration: estimatedDuration ? parseInt(estimatedDuration) : null,
          difficulty_level: difficulty,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Mark all subtasks as selected by default
        const enhancedSubtasks = data.suggested_subtasks.map((subtask: any) => ({
          ...subtask,
          selected: true,
        }));
        setCrusherResponse({
          ...data,
          suggested_subtasks: enhancedSubtasks,
        });
        setShowAnalysisModal(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Error", "Failed to analyze task. Please try again.");
      }
    } catch (error) {
      console.error("Error analyzing task:", error);
      Alert.alert("Error", "Failed to analyze task. Please check your connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSubtaskSelection = (index: number) => {
    if (!crusherResponse) return;
    
    const updatedSubtasks = [...crusherResponse.suggested_subtasks];
    updatedSubtasks[index].selected = !updatedSubtasks[index].selected;
    
    setCrusherResponse({
      ...crusherResponse,
      suggested_subtasks: updatedSubtasks,
    });
  };

  const createTaskGroup = async () => {
    if (!crusherResponse) return;

    const selectedSubtasks = crusherResponse.suggested_subtasks.filter(subtask => subtask.selected);
    if (selectedSubtasks.length === 0) {
      Alert.alert("No Tasks Selected", "Please select at least one subtask to create.");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/task-crusher/create-group`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...crusherResponse,
          suggested_subtasks: selectedSubtasks,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          "Tasks Created! 🎉", 
          `Successfully created ${data.subtasks_created} subtasks from your complex task.`,
          [
            {
              text: "View Tasks",
              onPress: () => {
                setShowAnalysisModal(false);
                setActiveTab("groups");
                fetchTaskGroups();
                // Clear form
                setMainTask("");
                setDescription("");
                setCrusherResponse(null);
              }
            }
          ]
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Error", "Failed to create task group. Please try again.");
      }
    } catch (error) {
      console.error("Error creating task group:", error);
      Alert.alert("Error", "Failed to create tasks. Please check your connection.");
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "easy": return colors.success;
      case "medium": return colors.warning;
      case "hard": return colors.error;
      case "expert": return "#8B5CF6";
      default: return colors.primary;
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTaskGroups();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchTaskGroups();
      setLoading(false);
    };
    loadData();
  }, []);

  const styles = createStyles(colors);

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
          <Text style={styles.headerTitle}>Task Crusher</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="hammer" size={24} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.headerSubtitle}>
          Break complex tasks into manageable steps with AI
        </Text>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "crusher" && styles.activeTab]}
            onPress={() => setActiveTab("crusher")}
          >
            <Ionicons name="hammer" size={20} color={activeTab === "crusher" ? colors.primary : "#ffffff"} />
            <Text style={[styles.tabText, activeTab === "crusher" && styles.activeTabText]}>
              Crusher
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === "groups" && styles.activeTab]}
            onPress={() => setActiveTab("groups")}
          >
            <Ionicons name="list" size={20} color={activeTab === "groups" ? colors.primary : "#ffffff"} />
            <Text style={[styles.tabText, activeTab === "groups" && styles.activeTabText]}>
              My Groups ({taskGroups.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {activeTab === "crusher" ? (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Input Form */}
            <View style={[styles.inputCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Describe Your Complex Task
              </Text>
              
              <TextInput
                style={[styles.mainTaskInput, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                placeholder="Enter your complex task or project (e.g., 'Launch a new mobile app', 'Organize a wedding', 'Write a research paper')"
                placeholderTextColor={colors.textSecondary}
                value={mainTask}
                onChangeText={setMainTask}
                multiline
                maxLength={500}
              />

              <TextInput
                style={[styles.descriptionInput, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                placeholder="Additional details (optional)"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={1000}
              />

              {/* Difficulty Selection */}
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Difficulty Level</Text>
              <View style={styles.difficultyContainer}>
                {(["easy", "medium", "hard", "expert"] as const).map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.difficultyButton,
                      { 
                        backgroundColor: difficulty === level ? getDifficultyColor(level) : colors.border + "30",
                        borderColor: getDifficultyColor(level)
                      }
                    ]}
                    onPress={() => setDifficulty(level)}
                  >
                    <Text style={[
                      styles.difficultyText,
                      { color: difficulty === level ? "#ffffff" : getDifficultyColor(level) }
                    ]}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Estimated Duration */}
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Estimated Total Duration (minutes)
              </Text>
              <TextInput
                style={[styles.durationInput, { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                placeholder="e.g., 480 (8 hours)"
                placeholderTextColor={colors.textSecondary}
                value={estimatedDuration}
                onChangeText={setEstimatedDuration}
                keyboardType="numeric"
              />

              {/* Analyze Button */}
              <TouchableOpacity
                style={[styles.analyzeButton, { backgroundColor: colors.primary }]}
                onPress={analyzeTask}
                disabled={isAnalyzing}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  style={styles.analyzeButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isAnalyzing ? (
                    <>
                      <Ionicons name="sync" size={20} color="#ffffff" />
                      <Text style={styles.analyzeButtonText}>Analyzing...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={20} color="#ffffff" />
                      <Text style={styles.analyzeButtonText}>Crush This Task!</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* How It Works */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>How Task Crusher Works</Text>
              
              <View style={styles.stepsList}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    Enter your complex task or project description
                  </Text>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    AI analyzes and breaks it into manageable subtasks
                  </Text>
                </View>
                
                <View style={styles.stepItem}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.text }]}>
                    Review, customize, and create your task group
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Task Groups Tab */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {taskGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="list-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No task groups yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  Use Task Crusher to break down complex projects into manageable steps
                </Text>
                <TouchableOpacity
                  style={[styles.switchTabButton, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab("crusher")}
                >
                  <Text style={styles.switchTabButtonText}>Start Crushing Tasks</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.groupsList}>
                {taskGroups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupCard, { backgroundColor: colors.surface }]}
                    onPress={() => router.push(`/task-group/${group.id}`)}
                  >
                    <View style={styles.groupHeader}>
                      <Text style={[styles.groupTitle, { color: colors.text }]} numberOfLines={2}>
                        {group.main_task_title}
                      </Text>
                      <Text style={[styles.groupProgress, { color: colors.primary }]}>
                        {Math.round(group.progress_percentage)}%
                      </Text>
                    </View>
                    
                    <Text style={[styles.groupDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                      {group.main_task_description}
                    </Text>
                    
                    <View style={styles.groupStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="list" size={16} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {group.completed_subtasks}/{group.total_subtasks} tasks
                        </Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {new Date(group.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Progress Bar */}
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View style={[
                        styles.progressFill,
                        { 
                          width: `${group.progress_percentage}%`,
                          backgroundColor: colors.primary 
                        }
                      ]} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Analysis Modal */}
      <Modal
        visible={showAnalysisModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAnalysisModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Task Analysis Complete</Text>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowAnalysisModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {crusherResponse && (
            <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalContent}>
              {/* Main Task Summary */}
              <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {crusherResponse.main_task}
                </Text>
                <Text style={[styles.summaryStrategy, { color: colors.textSecondary }]}>
                  {crusherResponse.completion_strategy}
                </Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryStatItem}>
                    <Text style={[styles.summaryStatNumber, { color: colors.primary }]}>
                      {crusherResponse.suggested_subtasks.length}
                    </Text>
                    <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
                      Subtasks
                    </Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={[styles.summaryStatNumber, { color: colors.primary }]}>
                      {formatDuration(crusherResponse.total_estimated_duration)}
                    </Text>
                    <Text style={[styles.summaryStatLabel, { color: colors.textSecondary }]}>
                      Total Time
                    </Text>
                  </View>
                </View>
              </View>

              {/* Subtasks List */}
              <Text style={[styles.subtasksHeader, { color: colors.text }]}>
                Select Subtasks to Create
              </Text>
              
              {crusherResponse.suggested_subtasks.map((subtask, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.subtaskCard,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: subtask.selected ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => toggleSubtaskSelection(index)}
                >
                  <View style={styles.subtaskHeader}>
                    <View style={styles.subtaskTitleRow}>
                      <Ionicons 
                        name={subtask.selected ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={subtask.selected ? colors.primary : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.subtaskTitle, 
                        { 
                          color: colors.text,
                          opacity: subtask.selected ? 1 : 0.6
                        }
                      ]}>
                        {subtask.title}
                      </Text>
                    </View>
                    <View style={styles.subtaskMeta}>
                      <Text style={[styles.subtaskDuration, { color: colors.textSecondary }]}>
                        {formatDuration(subtask.estimated_duration)}
                      </Text>
                      <View style={[
                        styles.priorityBadge,
                        { backgroundColor: `${colors.primary}${subtask.priority * 20}` }
                      ]}>
                        <Text style={[styles.priorityText, { color: colors.primary }]}>
                          P{subtask.priority}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <Text style={[
                    styles.subtaskDescription, 
                    { 
                      color: colors.textSecondary,
                      opacity: subtask.selected ? 1 : 0.6
                    }
                  ]}>
                    {subtask.description}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.createTasksButton, { backgroundColor: colors.primary }]}
                onPress={createTaskGroup}
              >
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  style={styles.createTasksButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add-circle" size={20} color="#ffffff" />
                  <Text style={styles.createTasksButtonText}>
                    Create {crusherResponse.suggested_subtasks.filter(s => s.selected).length} Tasks
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e0e0e0",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#ffffff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  activeTabText: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  mainTaskInput: {
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  descriptionInput: {
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  difficultyContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  durationInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  analyzeButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  analyzeButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  analyzeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  stepText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
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
  switchTabButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  switchTabButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  groupsList: {
    gap: 16,
  },
  groupCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginRight: 12,
  },
  groupProgress: {
    fontSize: 16,
    fontWeight: "bold",
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  groupStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeModalButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryStrategy: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStatItem: {
    alignItems: "center",
  },
  summaryStatNumber: {
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  subtasksHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  subtaskCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subtaskHeader: {
    marginBottom: 8,
  },
  subtaskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  subtaskTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },
  subtaskMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtaskDuration: {
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
  },
  subtaskDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  createTasksButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
  },
  createTasksButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  createTasksButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});