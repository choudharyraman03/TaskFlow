import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    gradientStart: string;
    gradientEnd: string;
  };
}

const lightTheme = {
  primary: '#667eea',
  secondary: '#764ba2',
  background: '#f8f9fa',
  surface: '#ffffff',
  text: '#2d3748',
  textSecondary: '#718096',
  border: '#e2e8f0',
  success: '#30D158',
  warning: '#FFCC00',
  error: '#FF3B30',
  gradientStart: '#667eea',
  gradientEnd: '#764ba2',
};

const darkTheme = {
  primary: '#FF6B6B',
  secondary: '#FF4757',
  background: '#1a1a1a',
  surface: '#2d2d2d',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  border: '#404040',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  gradientStart: '#FF6B6B',
  gradientEnd: '#FF4757',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDarkMode ? darkTheme : lightTheme;

  const value: ThemeContextType = {
    isDarkMode,
    toggleTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};