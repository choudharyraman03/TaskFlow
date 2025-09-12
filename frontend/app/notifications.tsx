import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { format } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  scheduled_time: string;
  sent: boolean;
  opened: boolean;
  created_at: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const createSampleNotifications = async () => {
    const sampleNotifications = [
      {
        title: "Daily Check-in",
        message: "How did your day go? Quick reflection time!",
        type: "reflection",
        scheduled_time: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      },
      {
        title: "Habit Reminder",
        message: "Don't forget your morning meditation!",
        type: "reminder",
        scheduled_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      },
      {
        title: "Task Nudge",
        message: "You have 3 high-priority tasks waiting. Need help choosing?",
        type: "nudge",
        scheduled_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      },
    ];

    try {
      for (const notification of sampleNotifications) {
        await fetch(`${BACKEND_URL}/api/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notification),
        });
      }
      await fetchNotifications();
      Alert.alert("Success", "Sample notifications created!");
    } catch (error) {
      console.error("Error creating notifications:", error);
      Alert.alert("Error", "Failed to create notifications");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchNotifications();
      setLoading(false);
    };
    loadData();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder": return "alarm";
      case "nudge": return "push";
      case "achievement": return "trophy";
      case "reflection": return "chatbubble-ellipses";
      default: return "notifications";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "reminder": return "#FF6B6B";
      case "nudge": return "#4ECDC4";
      case "achievement": return "#FFD93D";
      case "reflection": return "#667eea";
      default: return "#718096";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
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
          <Text style={styles.headerTitle}>Smart Reminders</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={createSampleNotifications}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
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
        {/* Notification Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.cardTitle}>Notification Preferences</Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="alarm" size={24} color="#FF6B6B" />
                <View style={styles.settingDetails}>
                  <Text style={styles.settingName}>Task Reminders</Text>
                  <Text style={styles.settingDescription}>Get notified about upcoming deadlines</Text>
                </View>
              </View>
              <View style={styles.settingToggle}>
                <Text style={styles.toggleText}>ON</Text>
              </View>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="repeat" size={24} color="#4ECDC4" />
                <View style={styles.settingDetails}>
                  <Text style={styles.settingName}>Habit Nudges</Text>
                  <Text style={styles.settingDescription}>Gentle reminders for your daily habits</Text>
                </View>
              </View>
              <View style={styles.settingToggle}>
                <Text style={styles.toggleText}>ON</Text>
              </View>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="sparkles" size={24} color="#FFD93D" />
                <View style={styles.settingDetails}>
                  <Text style={styles.settingName}>AI Insights</Text>
                  <Text style={styles.settingDescription}>Productivity tips and recommendations</Text>
                </View>
              </View>
              <View style={styles.settingToggle}>
                <Text style={styles.toggleText}>ON</Text>
              </View>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#667eea" />
                <View style={styles.settingDetails}>
                  <Text style={styles.settingName}>Daily Reflections</Text>
                  <Text style={styles.settingDescription}>Evening check-ins and progress reviews</Text>
                </View>
              </View>
              <View style={styles.settingToggle}>
                <Text style={styles.toggleText}>ON</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsCard}>
          <Text style={styles.cardTitle}>Recent Notifications</Text>
          
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-outline" size={64} color="#cccccc" />
              <Text style={styles.emptyStateText}>No notifications yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create some tasks and habits to start receiving smart reminders
              </Text>
              <TouchableOpacity 
                style={styles.createSampleButton}
                onPress={createSampleNotifications}
              >
                <Text style={styles.createSampleText}>Create Sample Notifications</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.notificationsList}>
              {notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationCard}>
                  <View style={styles.notificationHeader}>
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: `${getNotificationColor(notification.type)}20` }
                    ]}>
                      <Ionicons 
                        name={getNotificationIcon(notification.type)} 
                        size={20} 
                        color={getNotificationColor(notification.type)} 
                      />
                    </View>
                    
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      <Text style={styles.notificationTime}>
                        Scheduled: {formatTime(notification.scheduled_time)}
                      </Text>
                    </View>
                    
                    <View style={styles.notificationStatus}>
                      {notification.sent ? (
                        <Ionicons name="checkmark-circle" size={20} color="#30D158" />
                      ) : (
                        <Ionicons name="time" size={20} color="#FF9500" />
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.notificationMeta}>
                    <Text style={[
                      styles.notificationTypeTag,
                      { 
                        backgroundColor: `${getNotificationColor(notification.type)}20`,
                        color: getNotificationColor(notification.type)
                      }
                    ]}>
                      {notification.type}
                    </Text>
                    
                    <Text style={styles.notificationCreated}>
                      Created: {formatTime(notification.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Smart Features Info */}
        <View style={styles.featuresCard}>
          <Text style={styles.cardTitle}>Smart Notification Features</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="location" size={24} color="#FF6B6B" />
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>Location-Based</Text>
                <Text style={styles.featureDescription}>
                  Get reminders when you arrive at specific locations
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="calendar" size={24} color="#4ECDC4" />
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>Calendar-Aware</Text>
                <Text style={styles.featureDescription}>
                  Smart timing based on your calendar events
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="brain" size={24} color="#667eea" />
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>Context-Sensitive</Text>
                <Text style={styles.featureDescription}>
                  Adapt to your productivity patterns and energy levels
                </Text>
              </View>
            </View>
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
  settingsCard: {
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
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingDetails: {
    marginLeft: 12,
    flex: 1,
  },
  settingName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
  },
  settingDescription: {
    fontSize: 14,
    color: "#718096",
    marginTop: 2,
  },
  settingToggle: {
    backgroundColor: "#30D158",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  notificationsCard: {
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
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
    paddingHorizontal: 20,
  },
  createSampleButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  createSampleText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationsList: {
    gap: 16,
  },
  notificationCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f7fafc",
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#718096",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: "#a0aec0",
  },
  notificationStatus: {
    marginLeft: 8,
  },
  notificationMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  notificationCreated: {
    fontSize: 12,
    color: "#a0aec0",
  },
  featuresCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureInfo: {
    marginLeft: 12,
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
  },
  featureDescription: {
    fontSize: 14,
    color: "#718096",
    marginTop: 2,
    lineHeight: 20,
  },
});