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
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface LeaderboardUser {
  user_id: string;
  username: string;
  name: string;
  profile_picture?: string;
  tasks_completed: number;
  xp_points: number;
  current_streak: number;
}

interface LeaderboardData {
  period: string;
  leaderboard: LeaderboardUser[];
  generated_at: string;
}

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [activePeriod, setActivePeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchLeaderboard = async (period: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leaderboard/${period}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard(activePeriod);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchLeaderboard(activePeriod);
      setLoading(false);
    };
    loadData();
  }, [activePeriod]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return "trophy";
      case 2: return "medal";
      case 3: return "medal";
      default: return "person";
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1: return "#FFD93D";
      case 2: return "#C0C0C0";
      case 3: return "#CD7F32";
      default: return colors.textSecondary;
    }
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading leaderboard...</Text>
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
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Period Selector */}
        <View style={styles.periodContainer}>
          {["daily", "weekly", "monthly"].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                activePeriod === period && styles.activePeriodButton
              ]}
              onPress={() => setActivePeriod(period as any)}
            >
              <Text style={[
                styles.periodText,
                activePeriod === period && styles.activePeriodText
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Top 3 Podium */}
        {leaderboardData && leaderboardData.leaderboard.length > 0 && (
          <View style={styles.podiumContainer}>
            <View style={styles.podium}>
              {/* Second Place */}
              {leaderboardData.leaderboard[1] && (
                <View style={styles.podiumPosition}>
                  <View style={[styles.podiumAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.podiumAvatarText}>
                      {leaderboardData.leaderboard[1].name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                    {leaderboardData.leaderboard[1].name}
                  </Text>
                  <Text style={[styles.podiumScore, { color: colors.textSecondary }]}>
                    {leaderboardData.leaderboard[1].tasks_completed} tasks
                  </Text>
                  <View style={[styles.podiumBase, styles.secondPlace]}>
                    <Text style={styles.podiumRank}>2</Text>
                  </View>
                </View>
              )}

              {/* First Place */}
              <View style={styles.podiumPosition}>
                <View style={styles.crownContainer}>
                  <Ionicons name="diamond" size={24} color="#FFD93D" />
                </View>
                <View style={[styles.podiumAvatar, styles.winnerAvatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.podiumAvatarText}>
                    {leaderboardData.leaderboard[0].name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.podiumName, styles.winnerName, { color: colors.text }]} numberOfLines={1}>
                  {leaderboardData.leaderboard[0].name}
                </Text>
                <Text style={[styles.podiumScore, { color: colors.textSecondary }]}>
                  {leaderboardData.leaderboard[0].tasks_completed} tasks
                </Text>
                <View style={[styles.podiumBase, styles.firstPlace]}>
                  <Text style={styles.podiumRank}>1</Text>
                </View>
              </View>

              {/* Third Place */}
              {leaderboardData.leaderboard[2] && (
                <View style={styles.podiumPosition}>
                  <View style={[styles.podiumAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.podiumAvatarText}>
                      {leaderboardData.leaderboard[2].name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.podiumName, { color: colors.text }]} numberOfLines={1}>
                    {leaderboardData.leaderboard[2].name}
                  </Text>
                  <Text style={[styles.podiumScore, { color: colors.textSecondary }]}>
                    {leaderboardData.leaderboard[2].tasks_completed} tasks
                  </Text>
                  <View style={[styles.podiumBase, styles.thirdPlace]}>
                    <Text style={styles.podiumRank}>3</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Full Leaderboard */}
        <View style={styles.leaderboardSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1)} Rankings
          </Text>
          
          {leaderboardData && leaderboardData.leaderboard.length > 0 ? (
            <View style={styles.leaderboardList}>
              {leaderboardData.leaderboard.map((user, index) => (
                <TouchableOpacity
                  key={user.user_id}
                  style={[
                    styles.leaderboardItem,
                    { backgroundColor: colors.surface },
                    index < 3 && styles.topThreeItem
                  ]}
                >
                  <View style={styles.rankContainer}>
                    <Ionicons 
                      name={getRankIcon(index + 1)} 
                      size={24} 
                      color={getRankColor(index + 1)} 
                    />
                    <Text style={[styles.rankText, { color: colors.text }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  
                  <View style={styles.userContainer}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                      <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
                        @{user.username}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {user.tasks_completed}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>tasks</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {user.xp_points}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>XP</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {user.current_streak}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>streak</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No leaderboard data
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                Complete tasks and compete with friends to see rankings
              </Text>
            </View>
          )}
        </View>

        {/* Competition Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.infoHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="information-circle" size={24} color="#ffffff" />
            <Text style={styles.infoTitle}>How Rankings Work</Text>
          </LinearGradient>
          
          <View style={styles.infoContent}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Complete tasks to earn points and climb the leaderboard
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="flash" size={20} color={colors.warning} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Maintain streaks for bonus XP and higher rankings
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Rankings include you and your connected friends
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
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
  headerRight: {
    width: 40,
  },
  periodContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
  },
  activePeriodButton: {
    backgroundColor: "#ffffff",
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  activePeriodText: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  podiumContainer: {
    marginBottom: 30,
  },
  podium: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: 20,
    paddingHorizontal: 20,
  },
  podiumPosition: {
    alignItems: "center",
    flex: 1,
  },
  crownContainer: {
    position: "absolute",
    top: -12,
    zIndex: 1,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  winnerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "#FFD93D",
  },
  podiumAvatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  podiumName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  winnerName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  podiumScore: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  podiumBase: {
    width: "100%",
    height: 60,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  firstPlace: {
    backgroundColor: "#FFD93D",
    height: 80,
  },
  secondPlace: {
    backgroundColor: "#C0C0C0",
    height: 65,
  },
  thirdPlace: {
    backgroundColor: "#CD7F32",
    height: 50,
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  leaderboardSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topThreeItem: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  rankContainer: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 40,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  userUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
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
  infoCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    marginLeft: 12,
  },
  infoContent: {
    padding: 16,
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});