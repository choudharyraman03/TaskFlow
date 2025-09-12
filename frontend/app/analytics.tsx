import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  xp_points: number;
  karma_level: number;
  habit_completions_this_week: number;
}

export default function Analytics() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

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

  const fetchInsights = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/insights`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchInsights()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchStats(), fetchInsights()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getProgressColor = (rate: number) => {
    if (rate >= 0.8) return "#30D158";
    if (rate >= 0.6) return "#FFCC00";
    if (rate >= 0.4) return "#FF9500";
    return "#FF3B30";
  };

  const getXPLevelProgress = (xp: number) => {
    const currentLevel = Math.floor(xp / 100) + 1;
    const progressInLevel = xp % 100;
    return { currentLevel, progressInLevel };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing your productivity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const xpProgress = stats ? getXPLevelProgress(stats.xp_points) : { currentLevel: 1, progressInLevel: 0 };

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
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* XP Progress Card */}
        <View style={styles.xpCard}>
          <LinearGradient
            colors={["#FFD93D", "#FFAA00"]}
            style={styles.xpGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.xpHeader}>
              <Ionicons name="star" size={32} color="#ffffff" />
              <View style={styles.xpInfo}>
                <Text style={styles.xpLevel}>Level {xpProgress.currentLevel}</Text>
                <Text style={styles.xpPoints}>{stats?.xp_points || 0} XP</Text>
              </View>
            </View>
            
            <View style={styles.xpProgressContainer}>
              <View style={styles.xpProgressBg}>
                <View style={[
                  styles.xpProgressBar,
                  { width: `${xpProgress.progressInLevel}%` }
                ]} />
              </View>
              <Text style={styles.xpProgressText}>
                {xpProgress.progressInLevel}/100 to next level
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={32} color="#30D158" />
              <Text style={styles.statNumber}>{stats.completed_tasks}</Text>
              <Text style={styles.statLabel}>Completed Tasks</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={32} color={getProgressColor(stats.completion_rate)} />
              <Text style={styles.statNumber}>{Math.round(stats.completion_rate * 100)}%</Text>
              <Text style={styles.statLabel}>Completion Rate</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="repeat" size={32} color="#FF6B6B" />
              <Text style={styles.statNumber}>{stats.habit_completions_this_week}</Text>
              <Text style={styles.statLabel}>Habits This Week</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="list" size={32} color="#4ECDC4" />
              <Text style={styles.statNumber}>{stats.total_tasks}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
          </View>
        )}

        {/* Progress Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Weekly Progress</Text>
          <View style={styles.progressChart}>
            {stats && (
              <View style={styles.progressRing}>
                <View style={[
                  styles.progressRingFill,
                  {
                    width: width * 0.4,
                    height: width * 0.4,
                    borderRadius: width * 0.2,
                    borderColor: getProgressColor(stats.completion_rate),
                  }
                ]}>
                  <Text style={styles.progressPercentage}>
                    {Math.round(stats.completion_rate * 100)}%
                  </Text>
                </View>
              </View>
            )}
          </View>
          <Text style={styles.progressDescription}>
            Keep up the great work! You're making consistent progress.
          </Text>
        </View>

        {/* AI Insights */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="sparkles" size={24} color="#667eea" />
            <Text style={styles.cardTitle}>AI Insights</Text>
          </View>
          
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <View style={styles.insightIcon}>
                  <Ionicons name="bulb" size={20} color="#FF6B6B" />
                </View>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))
          ) : (
            <View style={styles.noInsights}>
              <Ionicons name="bulb-outline" size={48} color="#cccccc" />
              <Text style={styles.noInsightsText}>Complete more tasks to get personalized insights!</Text>
            </View>
          )}
        </View>

        {/* Achievement Badges */}
        <View style={styles.achievementsCard}>
          <Text style={styles.cardTitle}>Achievements</Text>
          <View style={styles.badgesContainer}>
            <View style={[
              styles.badge,
              { opacity: (stats?.completed_tasks || 0) >= 1 ? 1 : 0.3 }
            ]}>
              <Ionicons name="star" size={24} color="#FFD93D" />
              <Text style={styles.badgeText}>First Task</Text>
            </View>
            
            <View style={[
              styles.badge,
              { opacity: (stats?.completed_tasks || 0) >= 10 ? 1 : 0.3 }
            ]}>
              <Ionicons name="trophy" size={24} color="#FF6B6B" />
              <Text style={styles.badgeText}>Task Master</Text>
            </View>
            
            <View style={[
              styles.badge,
              { opacity: (stats?.habit_completions_this_week || 0) >= 7 ? 1 : 0.3 }
            ]}>
              <Ionicons name="flame" size={24} color="#FF9500" />
              <Text style={styles.badgeText}>Streak Hero</Text>
            </View>
            
            <View style={[
              styles.badge,
              { opacity: (stats?.xp_points || 0) >= 100 ? 1 : 0.3 }
            ]}>
              <Ionicons name="diamond" size={24} color="#4ECDC4" />
              <Text style={styles.badgeText}>Level Up</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.quickActionsList}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/")}
            >
              <Ionicons name="add-circle" size={24} color="#667eea" />
              <Text style={styles.quickActionText}>Add Task</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => router.push("/habits")}
            >
              <Ionicons name="repeat" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Track Habit</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  xpCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  xpGradient: {
    padding: 20,
  },
  xpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  xpInfo: {
    marginLeft: 16,
  },
  xpLevel: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  xpPoints: {
    fontSize: 16,
    color: "#fff8e1",
  },
  xpProgressContainer: {
    marginTop: 8,
  },
  xpProgressBg: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  xpProgressBar: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 4,
  },
  xpProgressText: {
    fontSize: 14,
    color: "#fff8e1",
    marginTop: 8,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    flex: 1,
    minWidth: "45%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2d3748",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#718096",
    marginTop: 4,
    textAlign: "center",
  },
  chartCard: {
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
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2d3748",
    marginBottom: 16,
  },
  progressChart: {
    alignItems: "center",
    marginVertical: 20,
  },
  progressRing: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressRingFill: {
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2d3748",
  },
  progressDescription: {
    fontSize: 16,
    color: "#718096",
    textAlign: "center",
    lineHeight: 24,
  },
  insightsCard: {
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
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff5f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 15,
    color: "#2d3748",
    lineHeight: 22,
  },
  noInsights: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noInsightsText: {
    fontSize: 16,
    color: "#a0aec0",
    marginTop: 16,
    textAlign: "center",
  },
  achievementsCard: {
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
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  badge: {
    alignItems: "center",
    flex: 1,
    minWidth: "20%",
  },
  badgeText: {
    fontSize: 12,
    color: "#718096",
    marginTop: 8,
    textAlign: "center",
  },
  quickActionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionsList: {
    flexDirection: "row",
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f7fafc",
    borderRadius: 12,
    padding: 16,
  },
  quickActionText: {
    fontSize: 14,
    color: "#2d3748",
    marginTop: 8,
    fontWeight: "500",
  },
});