import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import { format } from "date-fns";

interface SocialActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  data: any;
  created_at: string;
  likes: string[];
  comments: any[];
  user: {
    id: string;
    username: string;
    name: string;
    profile_picture?: string;
  };
}

export default function Social() {
  const [activities, setActivities] = useState<SocialActivity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchSocialFeed = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/social/feed`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      console.error("Error fetching social feed:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSocialFeed();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchSocialFeed();
      setLoading(false);
    };
    loadData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task_completed": return "checkmark-circle";
      case "habit_completed": return "repeat";
      case "achievement_unlocked": return "trophy";
      case "streak_milestone": return "flame";
      default: return "star";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "task_completed": return colors.success;
      case "habit_completed": return colors.primary;
      case "achievement_unlocked": return "#FFD93D";
      case "streak_milestone": return colors.error;
      default: return colors.textSecondary;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading activity feed...</Text>
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
          <Text style={styles.headerTitle}>Activity Feed</Text>
          <TouchableOpacity 
            style={styles.friendsButton}
            onPress={() => router.push("/friends")}
          >
            <Ionicons name="people" size={24} color="#ffffff" />
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
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No activity yet
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
              Connect with friends to see their achievements and progress!
            </Text>
            <TouchableOpacity 
              style={[styles.addFriendsButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/friends")}
            >
              <Text style={styles.addFriendsText}>Add Friends</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activitiesList}>
            {activities.map((activity) => (
              <View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.surface }]}>
                <View style={styles.activityHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {activity.user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        {activity.user.name}
                      </Text>
                      <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
                        @{activity.user.username}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                    {formatTime(activity.created_at)}
                  </Text>
                </View>

                <View style={styles.activityContent}>
                  <View style={styles.activityMain}>
                    <View style={[
                      styles.activityIcon,
                      { backgroundColor: getActivityColor(activity.activity_type) + "20" }
                    ]}>
                      <Ionicons 
                        name={getActivityIcon(activity.activity_type)} 
                        size={20} 
                        color={getActivityColor(activity.activity_type)} 
                      />
                    </View>
                    <View style={styles.activityText}>
                      <Text style={[styles.activityTitle, { color: colors.text }]}>
                        {activity.title}
                      </Text>
                      <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>
                        {activity.description}
                      </Text>
                    </View>
                  </View>

                  {/* Activity-specific data */}
                  {activity.data && activity.data.category && (
                    <View style={styles.activityMeta}>
                      <View style={[styles.categoryTag, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.categoryText, { color: colors.primary }]}>
                          {activity.data.category}
                        </Text>
                      </View>
                      {activity.data.streak && (
                        <View style={styles.streakInfo}>
                          <Ionicons name="flame" size={16} color={colors.error} />
                          <Text style={[styles.streakText, { color: colors.text }]}>
                            {activity.data.streak} days
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.activityActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                      {activity.likes.length}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                      {activity.comments.length}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Motivational Card */}
        <View style={[styles.motivationCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            style={styles.motivationGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="rocket" size={32} color="#ffffff" />
            <View style={styles.motivationText}>
              <Text style={styles.motivationTitle}>Stay Motivated!</Text>
              <Text style={styles.motivationSubtitle}>
                Complete tasks and habits to inspire your friends
              </Text>
            </View>
          </LinearGradient>
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
  friendsButton: {
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
  addFriendsButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  addFriendsText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  activitiesList: {
    gap: 16,
  },
  activityCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
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
  userDetails: {
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
  timestamp: {
    fontSize: 12,
  },
  activityContent: {
    marginBottom: 16,
  },
  activityMain: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  activityMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  streakInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: "500",
  },
  activityActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.border + "50",
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 14,
  },
  motivationCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motivationGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
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