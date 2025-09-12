import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import QRCode from "react-native-qrcode-svg";

const { width } = Dimensions.get("window");

interface Friend {
  id: string;
  username: string;
  name: string;
  profile_picture?: string;
  xp_points: number;
  current_streak: number;
  last_active: string;
}

interface FriendRequest {
  id: string;
  from_user: {
    id: string;
    username: string;
    name: string;
    profile_picture?: string;
  };
  message: string;
  created_at: string;
}

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [userQRCode, setUserQRCode] = useState("");
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "search">("friends");
  
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/requests`);
      if (response.ok) {
        const data = await response.json();
        setFriendRequests(data);
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  };

  const fetchUserQRCode = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/default_user`);
      if (response.ok) {
        const user = await response.json();
        setUserQRCode(user.qr_code || "");
      }
    } catch (error) {
      console.error("Error fetching user QR code:", error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/request?to_user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        Alert.alert("Success", "Friend request sent!");
        // Remove from search results
        setSearchResults(searchResults.filter(user => user.id !== userId));
      } else {
        const error = await response.json();
        Alert.alert("Error", error.detail || "Failed to send friend request");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      Alert.alert("Error", "Failed to send friend request");
    }
  };

  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/friends/respond/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });

      if (response.ok) {
        Alert.alert("Success", accept ? "Friend request accepted!" : "Friend request declined");
        await fetchFriendRequests();
        if (accept) await fetchFriends();
      }
    } catch (error) {
      console.error("Error responding to friend request:", error);
      Alert.alert("Error", "Failed to respond to friend request");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFriends(), fetchFriendRequests()]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchFriends(), fetchFriendRequests(), fetchUserQRCode()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchUsers(searchQuery);
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading friends...</Text>
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
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity 
            style={styles.qrButton}
            onPress={() => setShowQRModal(true)}
          >
            <Ionicons name="qr-code" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "friends" && styles.activeTab]}
            onPress={() => setActiveTab("friends")}
          >
            <Text style={[styles.tabText, activeTab === "friends" && styles.activeTabText]}>
              Friends ({friends.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === "requests" && styles.activeTab]}
            onPress={() => setActiveTab("requests")}
          >
            <Text style={[styles.tabText, activeTab === "requests" && styles.activeTabText]}>
              Requests ({friendRequests.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === "search" && styles.activeTab]}
            onPress={() => setActiveTab("search")}
          >
            <Text style={[styles.tabText, activeTab === "search" && styles.activeTabText]}>
              Search
            </Text>
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
        {/* Search Tab */}
        {activeTab === "search" && (
          <View style={styles.searchSection}>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by username or name..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            
            {searchResults.map((user) => (
              <View key={user.id} style={[styles.userCard, { backgroundColor: colors.surface }]}>
                <View style={styles.userInfo}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                    <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{user.username}</Text>
                    {user.bio && (
                      <Text style={[styles.userBio, { color: colors.textSecondary }]} numberOfLines={1}>
                        {user.bio}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => sendFriendRequest(user.id)}
                >
                  <Ionicons name="person-add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ))}
            
            {searchQuery && searchResults.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No users found
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Friend Requests Tab */}
        {activeTab === "requests" && (
          <View style={styles.requestsSection}>
            {friendRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No friend requests
                </Text>
              </View>
            ) : (
              friendRequests.map((request) => (
                <View key={request.id} style={[styles.requestCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.requestInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {request.from_user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.requestDetails}>
                      <Text style={[styles.requestName, { color: colors.text }]}>
                        {request.from_user.name}
                      </Text>
                      <Text style={[styles.requestUsername, { color: colors.textSecondary }]}>
                        @{request.from_user.username}
                      </Text>
                      <Text style={[styles.requestMessage, { color: colors.textSecondary }]}>
                        {request.message}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.acceptButton, { backgroundColor: colors.success }]}
                      onPress={() => respondToFriendRequest(request.id, true)}
                    >
                      <Ionicons name="checkmark" size={20} color="#ffffff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.declineButton, { backgroundColor: colors.error }]}
                      onPress={() => respondToFriendRequest(request.id, false)}
                    >
                      <Ionicons name="close" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <View style={styles.friendsSection}>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  No friends yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  Start connecting with others to compete and stay motivated!
                </Text>
              </View>
            ) : (
              friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.friendCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/profile/${friend.id}`)}
                >
                  <View style={styles.friendInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>
                        {friend.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
                      <Text style={[styles.friendUsername, { color: colors.textSecondary }]}>
                        @{friend.username}
                      </Text>
                      <View style={styles.friendStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="flash" size={16} color={colors.warning} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {friend.xp_points} XP
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="flame" size={16} color={colors.error} />
                          <Text style={[styles.statText, { color: colors.textSecondary }]}>
                            {friend.current_streak} day streak
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/leaderboard")}
          >
            <Ionicons name="trophy" size={24} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Leaderboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push("/social")}
          >
            <Ionicons name="newspaper" size={24} color={colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.text }]}>Activity Feed</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.qrModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Your QR Code</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowQRModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrContainer}>
              {userQRCode ? (
                <QRCode
                  value={`taskflow://add-friend/default_user`}
                  size={200}
                  backgroundColor={colors.surface}
                  color={colors.text}
                />
              ) : (
                <View style={[styles.qrPlaceholder, { backgroundColor: colors.background }]}>
                  <Ionicons name="qr-code" size={64} color={colors.textSecondary} />
                </View>
              )}
            </View>
            
            <Text style={[styles.qrInstructions, { color: colors.textSecondary }]}>
              Share this QR code with friends to connect instantly!
            </Text>
          </View>
        </View>
      </Modal>
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
  qrButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
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
  searchSection: {
    gap: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  userCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
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
  userBio: {
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  requestsSection: {
    gap: 16,
  },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: "600",
  },
  requestUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  requestMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  friendsSection: {
    gap: 16,
  },
  friendCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
  },
  friendUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  friendStats: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
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
  quickActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
  },
  quickActionButton: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  qrModalContent: {
    width: width * 0.9,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  qrContainer: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  qrInstructions: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});