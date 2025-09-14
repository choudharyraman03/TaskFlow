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
  Modal,
  TextInput,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../contexts/ThemeContext";
import * as Haptics from "expo-haptics";

interface StoreItem {
  id: string;
  name: string;
  description: string;
  price_coins: number;
  price_inr: number;
  category: string;
  image_url?: string;
  stock_quantity: number;
  is_available: boolean;
}

interface CoinBalance {
  coins: number;
  inr_value: number;
}

export default function Store() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [coinBalance, setCoinBalance] = useState<CoinBalance>({ coins: 0, inr_value: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const router = useRouter();
  const { colors, isDarkMode } = useTheme();

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

  const fetchStoreItems = async (category?: string) => {
    try {
      const url = category && category !== "all" 
        ? `${BACKEND_URL}/api/store/items?category=${category}`
        : `${BACKEND_URL}/api/store/items`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Error fetching store items:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/store/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(["all", ...data.categories]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCoinBalance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/coins/balance`);
      if (response.ok) {
        const data = await response.json();
        setCoinBalance(data);
      }
    } catch (error) {
      console.error("Error fetching coin balance:", error);
    }
  };

  const handlePurchase = (item: StoreItem) => {
    if (coinBalance.coins < item.price_coins) {
      Alert.alert(
        "Insufficient Coins",
        `You need ${item.price_coins} coins but only have ${coinBalance.coins} coins. Complete more tasks to earn coins!`,
        [{ text: "OK" }]
      );
      return;
    }

    setSelectedItem(item);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/store/purchase/${selectedItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery_address: deliveryAddress.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        Alert.alert(
          "Purchase Successful! 🎉",
          `You have successfully purchased ${selectedItem.name} for ${selectedItem.price_coins} coins!`,
          [{ text: "OK" }]
        );

        // Update coin balance
        await fetchCoinBalance();
        
        // Close modal and reset
        setShowPurchaseModal(false);
        setSelectedItem(null);
        setDeliveryAddress("");
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const error = await response.json();
        Alert.alert("Purchase Failed", error.detail || "Failed to complete purchase");
      }
    } catch (error) {
      console.error("Error making purchase:", error);
      Alert.alert("Error", "Failed to complete purchase. Please try again.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStoreItems(selectedCategory),
      fetchCoinBalance(),
    ]);
    setRefreshing(false);
  };

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);
    await fetchStoreItems(category);
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchStoreItems(),
        fetchCategories(),
        fetchCoinBalance(),
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "electronics": return "phone-portrait";
      case "books": return "book";
      case "food": return "restaurant";
      case "gift_cards": return "gift";
      case "fitness": return "fitness";
      case "stationery": return "pencil";
      default: return "storefront";
    }
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ");
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading store...</Text>
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
          <Text style={styles.headerTitle}>TaskFlow Store</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Coin Balance */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceInfo}>
            <Ionicons name="diamond" size={24} color="#FFD93D" />
            <View style={styles.balanceDetails}>
              <Text style={styles.balanceCoins}>{coinBalance.coins} Coins</Text>
              <Text style={styles.balanceINR}>₹{coinBalance.inr_value.toFixed(2)} INR</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.earnCoinsButton}>
            <Text style={styles.earnCoinsText}>Earn More</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === category ? colors.primary : colors.surface,
                borderColor: colors.border
              }
            ]}
            onPress={() => handleCategoryChange(category)}
          >
            <Ionicons 
              name={getCategoryIcon(category)} 
              size={20} 
              color={selectedCategory === category ? "#ffffff" : colors.textSecondary} 
            />
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === category ? "#ffffff" : colors.text }
            ]}>
              {formatCategory(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Store Items */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No items available
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
              Check back later for new items!
            </Text>
          </View>
        ) : (
          <View style={styles.itemsGrid}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.surface }]}
                onPress={() => handlePurchase(item)}
                activeOpacity={0.8}
              >
                <View style={styles.itemHeader}>
                  <View style={[styles.itemIconContainer, { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons 
                      name={getCategoryIcon(item.category)} 
                      size={24} 
                      color={colors.primary} 
                    />
                  </View>
                  <View style={[styles.stockBadge, { backgroundColor: colors.success + "20" }]}>
                    <Text style={[styles.stockText, { color: colors.success }]}>
                      {item.stock_quantity} left
                    </Text>
                  </View>
                </View>

                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                  {item.name}
                </Text>
                
                <Text style={[styles.itemDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.description}
                </Text>

                <View style={styles.itemFooter}>
                  <View style={styles.priceContainer}>
                    <View style={styles.coinPrice}>
                      <Ionicons name="diamond" size={16} color="#FFD93D" />
                      <Text style={[styles.coinPriceText, { color: colors.text }]}>
                        {item.price_coins}
                      </Text>
                    </View>
                    <Text style={[styles.inrPrice, { color: colors.textSecondary }]}>
                      ₹{item.price_inr}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.buyButton,
                      { 
                        backgroundColor: coinBalance.coins >= item.price_coins 
                          ? colors.primary 
                          : colors.textSecondary + "50"
                      }
                    ]}
                    onPress={() => handlePurchase(item)}
                    disabled={coinBalance.coins < item.price_coins}
                  >
                    <Text style={[
                      styles.buyButtonText,
                      { opacity: coinBalance.coins >= item.price_coins ? 1 : 0.6 }
                    ]}>
                      Buy
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Purchase</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPurchaseModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={styles.purchaseDetails}>
                <Text style={[styles.purchaseItemName, { color: colors.text }]}>
                  {selectedItem.name}
                </Text>
                <Text style={[styles.purchaseItemDescription, { color: colors.textSecondary }]}>
                  {selectedItem.description}
                </Text>
                
                <View style={styles.purchasePriceContainer}>
                  <View style={styles.purchasePrice}>
                    <Ionicons name="diamond" size={20} color="#FFD93D" />
                    <Text style={[styles.purchasePriceText, { color: colors.text }]}>
                      {selectedItem.price_coins} Coins
                    </Text>
                  </View>
                  <Text style={[styles.purchaseINR, { color: colors.textSecondary }]}>
                    (₹{selectedItem.price_inr})
                  </Text>
                </View>

                <TextInput
                  style={[styles.addressInput, { 
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text
                  }]}
                  placeholder="Delivery address (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: colors.border }]}
                    onPress={() => setShowPurchaseModal(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                    onPress={confirmPurchase}
                  >
                    <Text style={styles.confirmButtonText}>Confirm Purchase</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  headerRight: {
    width: 40,
  },
  balanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
  },
  balanceInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceDetails: {
    marginLeft: 12,
  },
  balanceCoins: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  balanceINR: {
    fontSize: 14,
    color: "#e0e0e0",
  },
  earnCoinsButton: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  earnCoinsText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  categoriesScroll: {
    backgroundColor: colors.background,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
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
  },
  itemsGrid: {
    gap: 16,
  },
  itemCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 10,
    fontWeight: "600",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flex: 1,
  },
  coinPrice: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  coinPriceText: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 6,
  },
  inrPrice: {
    fontSize: 12,
  },
  buyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  buyButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  purchaseDetails: {
    alignItems: "center",
  },
  purchaseItemName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  purchaseItemDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  purchasePriceContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  purchasePrice: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  purchasePriceText: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 8,
  },
  purchaseINR: {
    fontSize: 14,
  },
  addressInput: {
    width: "100%",
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});