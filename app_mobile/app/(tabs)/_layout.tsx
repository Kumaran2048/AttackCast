import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
        },
      }}
    >
      {/* 1. Live Monitor */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'radar' : 'radar'}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* 2. Coordinated Campaigns */}
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campaigns',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'transit-connection-variant' : 'transit-connection'}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* 3. What-If Analysis */}
      <Tabs.Screen
        name="whatif"
        options={{
          title: 'What-If',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons
              name={focused ? 'alt-route' : 'alt-route'}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* 4. Model Performance */}
      <Tabs.Screen
        name="performance"
        options={{
          title: 'Performance',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* 5. Data & States (Taxonomy) */}
      <Tabs.Screen
        name="states"
        options={{
          title: 'States',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'view-grid' : 'view-grid-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* 6. PCAP Upload & Ingestion */}
      <Tabs.Screen
        name="pcap"
        options={{
          title: 'PCAP',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cloud-upload' : 'cloud-upload-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* 7. About AttackCast */}
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'information-circle' : 'information-circle-outline'}
              size={20}
              color={color}
            />
          ),
        }}
      />

      {/* Hide two.tsx if still in router */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
