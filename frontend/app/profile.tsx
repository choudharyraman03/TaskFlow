import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface User {
  name: string;
  email: string;
  xp_points: number;
  karma_level: number;
}

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const router = useRouter();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/default_user`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        // Create default user if not exists
        const createResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Productivity Pro",
            email: "user@example.com",
            timezone: "UTC",
          }),
        });
        if (createResponse.ok) {
          const newUser = await createResponse.json();
          setUser(newUser);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Set default user data
      setUser({
        name: "Productivity Pro",
        email: "user@example.com",
        xp_points: 150,
        karma_level: 2,
      });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const premiumFeatures: PremiumFeature[] = [
    {
      id: "1",
      name: "Advanced Analytics",
      description: "Deep insights into your productivity patterns with AI-powered recommendations",
      icon: "analytics",
      available: false,
    },
    {
      id: "2",
      name: "Team Collaboration",
      description: "Share tasks and projects with team members, assign responsibilities",
      icon: "people",
      available: false,
    },
    {
      id: "3",
      name: "Deep Integrations",
      description: "Connect with Slack, Notion, GitHub, and 50+ other productivity tools",
      icon: "link",
      available: false,
    },
    {
      id: "4",
      name: "Advanced AI Coach",
      description: "Personalized productivity coaching with context-aware suggestions",
      icon: "sparkles",
      available: false,
    },
    {
      id: "5",
      name: "Custom Workflows",
      description: "Create automated workflows and IFTTT-style integrations",
      icon: "git-branch",
      available: false,
    },
    {
      id: "6",
      name: "Unlimited Everything",
      description: "No limits on tasks, habits, projects, or team members",
      icon: "infinite",
      available: false,
    },
  ];

  const freeFeatures = [
    "Core task management",
    "Basic habit tracking",
    "Calendar view",
    "Smart reminders",
    "Basic analytics",
    "Up to 5 habits",
    "Up to 100 tasks",
    "AI priority suggestions",
  ];

  const handleUpgradeToPremium = () => {
    Alert.alert(
      "Upgrade to Premium",
      "Unlock all advanced features and unlimited access. Would you like to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Upgrade", 
          onPress: () => {
            setIsPremium(true);
            Alert.alert("Success!", "Welcome to TaskFlow Premium! 🎉");
          }
        },
      ]
    );
  };

  const getXPLevelProgress = (xp: number) => {
    const currentLevel = Math.floor(xp / 100) + 1;
    const progressInLevel = xp % 100;
    return { currentLevel, progressInLevel };
  };

  const xpProgress = user ? getXPLevelProgress(user.xp_points) : { currentLevel: 1, progressInLevel: 0 };

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
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* User Info */}
        {user && (
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.userStats}>
                <View style={styles.statBadge}>
                  <Ionicons name="star" size={16} color="#FFD93D" />
                  <Text style={styles.statText}>Level {xpProgress.currentLevel}</Text>
                </View>
                <View style={styles.statBadge}>
                  <Ionicons name="flash" size={16} color="#FF6B6B" />
                  <Text style={styles.statText}>{user.xp_points} XP</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* XP Progress */}
        <View style={styles.xpProgressContainer}>
          <View style={styles.xpProgressBg}>
            <View style={[
              styles.xpProgressBar,
              { width: `${xpProgress.progressInLevel}%` }
            ]} />
          </View>
          <Text style={styles.xpProgressText}>
            {xpProgress.progressInLevel}/100 to Level {xpProgress.currentLevel + 1}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Premium Status */}
        <View style={styles.premiumCard}>
          <LinearGradient
            colors={isPremium ? ["#FFD93D", "#FFAA00"] : ["#f7fafc", "#edf2f7"]}
            style={styles.premiumGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.premiumHeader}>
              <Ionicons 
                name={isPremium ? "diamond" : "diamond-outline"} 
                size={32} 
                color={isPremium ? "#ffffff" : "#667eea"} 
              />
              <View style={styles.premiumInfo}>
                <Text style={[
                  styles.premiumTitle,
                  { color: isPremium ? "#ffffff" : "#2d3748" }
                ]}>
                  {isPremium ? "TaskFlow Premium" : "TaskFlow Free"}
                </Text>
                <Text style={[
                  styles.premiumSubtitle,
                  { color: isPremium ? "#fff8e1" : "#718096" }
                ]}>
                  {isPremium ? "All features unlocked" : "Upgrade for more features"}
                </Text>
              </View>
              {!isPremium && (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={handleUpgradeToPremium}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Free Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.cardTitle}>What's Included (Free)</Text>
          <View style={styles.featuresList}>
            {freeFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#30D158" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Premium Features */}
        <View style={styles.featuresCard}>
          <View style={styles.premiumFeaturesHeader}>
            <Text style={styles.cardTitle}>Premium Features</Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>UNLOCKED</Text>
              </View>
            )}
          </View>
          
          <View style={styles.premiumFeaturesList}>
            {premiumFeatures.map((feature) => (
              <View key={feature.id} style={[
                styles.premiumFeatureItem,
                { opacity: isPremium ? 1 : 0.6 }
              ]}>
                <View style={styles.premiumFeatureIcon}>
                  <Ionicons 
                    name={feature.icon as any} 
                    size={24} 
                    color={isPremium ? "#667eea" : "#a0aec0"} 
                  />
                </View>
                <View style={styles.premiumFeatureInfo}>
                  <Text style={[
                    styles.premiumFeatureName,
                    { color: isPremium ? "#2d3748" : "#a0aec0" }
                  ]}>
                    {feature.name}
                  </Text>
                  <Text style={[
                    styles.premiumFeatureDescription,
                    { color: isPremium ? "#718096" : "#cbd5e0" }
                  ]}>
                    {feature.description}
                  </Text>
                </View>
                {isPremium ? (
                  <Ionicons name="checkmark-circle" size={24} color="#30D158" />
                ) : (
                  <Ionicons name="lock-closed" size={24} color="#a0aec0" />
                )}
              </View>
            ))}
          </View>

          {!isPremium && (
            <TouchableOpacity 
              style={styles.upgradeCTAButton}
              onPress={handleUpgradeToPremium}
            >
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.upgradeCTAGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="diamond" size={20} color="#ffffff" />
                <Text style={styles.upgradeCTAText}>Upgrade to Premium - $9.99/month</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.cardTitle}>About TaskFlow</Text>
          <View style={styles.appInfoList}>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Version</Text>
              <Text style={styles.appInfoValue}>1.0.0</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Build</Text>
              <Text style={styles.appInfoValue}>2025.01</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Platform</Text>
              <Text style={styles.appInfoValue}>Universal</Text>
            </View>
          </View>
          
          <View style={styles.appActions}>
            <TouchableOpacity style={styles.appActionButton}>
              <Ionicons name="help-circle" size={20} color="#667eea" />
              <Text style={styles.appActionText}>Help & Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.appActionButton}>
              <Ionicons name="document-text" size={20} color="#667eea" />
              <Text style={styles.appActionText}>Privacy Policy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.appActionButton}>
              <Ionicons name="star" size={20} color="#667eea" />
              <Text style={styles.appActionText}>Rate App</Text>
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
  headerGradient: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 20,
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  userEmail: {
    fontSize: 16,
    color: "#e0e0e0",
    marginTop: 4,
  },
  userStats: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  xpProgressContainer: {
    paddingHorizontal: 20,
  },
  xpProgressBg: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  xpProgressBar: {
    height: "100%",
    backgroundColor: "#FFD93D",
    borderRadius: 4,
  },
  xpProgressText: {
    fontSize: 14,
    color: "#e0e0e0",
    marginTop: 8,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  premiumCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  premiumGradient: {
    padding: 20,
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumInfo: {
    flex: 1,
    marginLeft: 16,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  premiumSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  upgradeButton: {
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  featuresCard: {
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
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    fontSize: 16,
    color: "#2d3748",
    marginLeft: 12,
  },
  premiumFeaturesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  premiumBadge: {
    backgroundColor: "#30D158",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  premiumFeaturesList: {
    gap: 16,
  },
  premiumFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
  },
  premiumFeatureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  premiumFeatureInfo: {
    flex: 1,
  },
  premiumFeatureName: {
    fontSize: 16,
    fontWeight: "600",
  },
  premiumFeatureDescription: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  upgradeCTAButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  upgradeCTAGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  upgradeCTAText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  appInfoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appInfoList: {
    gap: 12,
    marginBottom: 20,
  },
  appInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appInfoLabel: {
    fontSize: 16,
    color: "#718096",
  },
  appInfoValue: {
    fontSize: 16,
    color: "#2d3748",
    fontWeight: "500",
  },
  appActions: {
    gap: 8,
  },
  appActionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
  },
  appActionText: {
    fontSize: 16,
    color: "#2d3748",
    marginLeft: 12,
  },
});