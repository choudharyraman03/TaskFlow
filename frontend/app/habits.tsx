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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

interface Habit {
  id: string;
  name: string;
  description?: string;
  category: string;
  frequency: string;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  target_count: number;
  reminder_time?: string;
}

export default function Habits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("health");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchHabits = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/habits`);
      if (response.ok) {
        const data = await response.json();
        setHabits(data);
      }
    } catch (error) {
      console.error("Error fetching habits:", error);
    }
  };

  const createHabit = async () => {
    if (!newHabitName.trim()) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/habits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHabitName,
          category: newHabitCategory,
          frequency: "daily",
          target_count: 1,
        }),
      });

      if (response.ok) {
        setNewHabitName("");
        setShowAddHabit(false);
        await fetchHabits();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error creating habit:", error);
      Alert.alert("Error", "Failed to create habit");
    }
  };

  const completeHabit = async (habitId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/habits/${habitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        await fetchHabits();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Great job!", `Streak: ${data.streak} days! +5 XP`);
      }
    } catch (error) {
      console.error("Error completing habit:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHabits();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchHabits();
      setLoading(false);
    };
    loadData();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "health": return "fitness";
      case "productivity": return "briefcase";
      case "learning": return "library";
      case "social": return "people";
      default: return "checkmark-circle";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "health": return "#FF6B6B";
      case "productivity": return "#4ECDC4";
      case "learning": return "#45B7D1";
      case "social": return "#96CEB4";
      default: return "#667eea";
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return "#FFD93D";
    if (streak >= 7) return "#6BCF7F";
    if (streak >= 3) return "#4D96FF";
    return "#A8A8A8";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your habits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Habits & Routines</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddHabit(!showAddHabit)}
          >
            <Ionicons 
              name={showAddHabit ? "close" : "add"} 
              size={24} 
              color="#ffffff" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Add Habit Form */}
        {showAddHabit && (
          <View style={styles.addHabitForm}>
            <TextInput
              style={styles.habitInput}
              placeholder="Habit name (e.g., Morning meditation)"
              placeholderTextColor="#999"
              value={newHabitName}
              onChangeText={setNewHabitName}
            />
            
            <View style={styles.categorySelector}>
              {["health", "productivity", "learning", "social"].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    { backgroundColor: newHabitCategory === category ? getCategoryColor(category) : "#f0f0f0" }
                  ]}
                  onPress={() => setNewHabitCategory(category)}
                >
                  <Ionicons 
                    name={getCategoryIcon(category)} 
                    size={20} 
                    color={newHabitCategory === category ? "#ffffff" : "#666"} 
                  />
                  <Text style={[
                    styles.categoryButtonText,
                    { color: newHabitCategory === category ? "#ffffff" : "#666" }
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.createButton} onPress={createHabit}>
              <Text style={styles.createButtonText}>Create Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Habits List */}
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={64} color="#cccccc" />
            <Text style={styles.emptyStateText}>No habits yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Build lasting routines that support your goals
            </Text>
          </View>
        ) : (
          <View style={styles.habitsList}>
            {habits.map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={[
                  styles.habitCard,
                  { borderLeftColor: getCategoryColor(habit.category) }
                ]}
                onPress={() => completeHabit(habit.id)}
                activeOpacity={0.8}
              >
                <View style={styles.habitHeader}>
                  <View style={styles.habitInfo}>
                    <Ionicons 
                      name={getCategoryIcon(habit.category)} 
                      size={24} 
                      color={getCategoryColor(habit.category)} 
                    />
                    <View style={styles.habitDetails}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      <Text style={styles.habitFrequency}>{habit.frequency}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => completeHabit(habit.id)}
                  >
                    <Ionicons name="checkmark" size={20} color="#30D158" />
                  </TouchableOpacity>
                </View>

                <View style={styles.habitStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: getStreakColor(habit.current_streak) }]}>
                      {habit.current_streak}
                    </Text>
                    <Text style={styles.statLabel}>Current Streak</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{habit.best_streak}</Text>
                    <Text style={styles.statLabel}>Best Streak</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{habit.total_completions}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>

                {habit.current_streak > 0 && (
                  <View style={styles.streakIndicator}>
                    <View style={[
                      styles.streakBar,
                      { 
                        width: `${Math.min((habit.current_streak / 30) * 100, 100)}%`,
                        backgroundColor: getStreakColor(habit.current_streak)
                      }
                    ]} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Motivational Section */}
        {habits.length > 0 && (
          <View style={styles.motivationSection}>
            <LinearGradient
              colors={["#FF6B6B", "#FF8E8E"]}
              style={styles.motivationCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="flame" size={32} color="#ffffff" />
              <View style={styles.motivationText}>
                <Text style={styles.motivationTitle}>Keep the momentum!</Text>
                <Text style={styles.motivationSubtitle}>
                  You're building {habits.length} positive habit{habits.length > 1 ? 's' : ''}
                </Text>
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  addHabitForm: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitInput: {
    fontSize: 16,
    color: "#2d3748",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  categorySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
    textTransform: "capitalize",
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
    paddingHorizontal: 40,
  },
  habitsList: {
    gap: 16,
  },
  habitCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  habitInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  habitDetails: {
    marginLeft: 12,
  },
  habitName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
  },
  habitFrequency: {
    fontSize: 14,
    color: "#718096",
    textTransform: "capitalize",
  },
  completeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0fff4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#30D158",
  },
  habitStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2d3748",
  },
  statLabel: {
    fontSize: 12,
    color: "#a0aec0",
    marginTop: 4,
  },
  streakIndicator: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  streakBar: {
    height: "100%",
    borderRadius: 2,
  },
  motivationSection: {
    marginTop: 24,
  },
  motivationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
  },
  motivationText: {
    marginLeft: 16,
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  motivationSubtitle: {
    fontSize: 14,
    color: "#ffe0e0",
    marginTop: 4,
  },
});