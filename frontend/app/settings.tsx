import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";

interface UserSettings {
  notifications: {
    task_reminders: boolean;
    habit_nudges: boolean;
    social_updates: boolean;
    ai_insights: boolean;
    friend_activities: boolean;
    leaderboard_updates: boolean;
  };
  privacy: {
    profile_visibility: string;
    task_sharing: string;
    stats_visibility: string;
    friend_requests: string;
  };
  appearance: {
    dark_mode: boolean;
    language: string;
    region: string;
    time_format: string;
  };
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      task_reminders: true,
      habit_nudges: true,
      social_updates: true,
      ai_insights: true,
      friend_activities: true,
      leaderboard_updates: false,
    },
    privacy: {
      profile_visibility: "friends",
      task_sharing: "friends",
      stats_visibility: "friends",
      friend_requests: "everyone",
    },
    appearance: {
      dark_mode: false,
      language: "en",
      region: "US",
      time_format: "12h",
    },
  });
  
  const router = useRouter();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const updateSettings = async (newSettings: UserSettings) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/default_user/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings(newSettings);
      } else {
        Alert.alert("Error", "Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      Alert.alert("Error", "Failed to update settings");
    }
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    updateSettings(newSettings);
  };

  const handlePrivacyChange = (key: string, value: string) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    updateSettings(newSettings);
  };

  const handleThemeToggle = () => {
    toggleTheme();
    const newSettings = {
      ...settings,
      appearance: {
        ...settings.appearance,
        dark_mode: !isDarkMode,
      },
    };
    updateSettings(newSettings);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            // Handle logout logic here
            Alert.alert("Success", "Logged out successfully");
            router.replace("/");
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            Alert.alert("Account Deleted", "Your account has been deleted successfully");
          }
        },
      ]
    );
  };

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
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Appearance Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Use dark theme with red accents
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleThemeToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDarkMode ? "#ffffff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="language" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Language</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  English (US)
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="time" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Time Format</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  12-hour format
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </View>

        {/* Notification Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="alarm" size={24} color={colors.error} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Task Reminders</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Get notified about upcoming deadlines
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.task_reminders}
              onValueChange={(value) => handleNotificationToggle("task_reminders", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.notifications.task_reminders ? "#ffffff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="repeat" size={24} color={colors.warning} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Habit Nudges</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Gentle reminders for your daily habits
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.habit_nudges}
              onValueChange={(value) => handleNotificationToggle("habit_nudges", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.notifications.habit_nudges ? "#ffffff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="people" size={24} color={colors.success} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Friend Activities</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Updates when friends complete tasks
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.friend_activities}
              onValueChange={(value) => handleNotificationToggle("friend_activities", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.notifications.friend_activities ? "#ffffff" : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>AI Insights</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Productivity tips and recommendations
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.ai_insights}
              onValueChange={(value) => handleNotificationToggle("ai_insights", value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={settings.notifications.ai_insights ? "#ffffff" : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Visibility</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="eye" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Profile Visibility</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Who can see your profile: Friends only
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="share" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Task Sharing</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Who can see your completed tasks: Friends only
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="stats-chart" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Stats Visibility</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Who can see your XP and streaks: Friends only
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Account Management */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="key" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Update your account password
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Email Preferences</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Manage email notifications
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="download" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Export Data</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Download your data
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Support & About */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support & About</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Help & Support</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Get help and contact support
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Read our privacy policy
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.text }]}>About TaskFlow</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Version 1.0.0 • Learn more
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingInfo}>
              <Ionicons name="log-out" size={24} color={colors.error} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.error }]}>Logout</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Sign out of your account
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <View style={styles.settingInfo}>
              <Ionicons name="trash" size={24} color={colors.error} />
              <View style={styles.settingDetails}>
                <Text style={[styles.settingName, { color: colors.error }]}>Delete Account</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Permanently delete your account and data
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
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
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerSection: {
    borderWidth: 1,
    borderColor: colors.error + "30",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "50",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingDetails: {
    marginLeft: 16,
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});