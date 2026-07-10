import React from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';
import { AppProviders } from '@/components/app-providers';
import { Button } from '@/components/ui';
import { colors } from '@/theme';

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><AppProviders><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="(auth)" options={{ headerShown: false }} /><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="onboarding" options={{ title: 'Complete your profile', presentation: 'modal' }} /><Stack.Screen name="settings" options={{ title: 'Settings' }} /><Stack.Screen name="community" options={{ title: 'Community' }} /><Stack.Screen name="connections" options={{ title: 'Connections' }} /><Stack.Screen name="post/[id]" options={{ title: 'Discussion' }} /><Stack.Screen name="conversation/[id]" options={{ title: 'Conversation' }} /><Stack.Screen name="group/[slug]" options={{ title: 'Group' }} /><Stack.Screen name="marketplace/[id]" options={{ title: 'Listing' }} /><Stack.Screen name="calls/index" options={{ title: 'Calls' }} /><Stack.Screen name="calls/[room]" options={{ title: 'Flow call', headerShown: false }} /></Stack></AppProviders></GestureHandlerRootView>;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <View style={errorStyles.root}><Text style={errorStyles.kicker}>FLOW ENCOUNTERED A PROBLEM</Text><Text style={errorStyles.title}>The app could not render this screen</Text><Text style={errorStyles.message}>{error.message || 'An unexpected error occurred.'}</Text><Button onPress={retry} title="Try again" /></View>;
}
const errorStyles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 24, gap: 16 }, kicker: { color: colors.danger, fontSize: 12, fontWeight: '900', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, message: { color: colors.muted, lineHeight: 22, marginBottom: 8 } });
