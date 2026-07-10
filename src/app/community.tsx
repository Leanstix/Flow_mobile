import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronRight, ShieldCheck, ShoppingBag, UsersRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { Card } from '@/components/ui';
import { colors, spacing } from '@/theme';

const items = [
  { icon: UsersRound, title: 'Student groups', description: 'Discover course, project, club and interest communities.', route: '/groups', operational: true },
  { icon: ShoppingBag, title: 'Student marketplace', description: 'Browse, save and manage trusted campus listings.', route: '/marketplace', operational: true },
  { icon: CalendarDays, title: 'Campus events', description: 'The events backend domain is still pending.', operational: false },
  { icon: ShieldCheck, title: 'Moderation queue', description: 'Staff action endpoints are still required.', operational: false },
];

export default function CommunityScreen() {
  return <ScrollView contentContainerStyle={styles.content}><Text style={styles.kicker}>CAMPUS TOOLS</Text><Text style={styles.title}>Community</Text><Text style={styles.subtitle}>Join focused groups and trade safely with other students.</Text>{items.map(({ icon: Icon, title, description, route, operational }) => <Pressable disabled={!operational} key={title} onPress={() => route && router.push(route as never)}><Card style={[styles.card, !operational && styles.disabled]}><View style={styles.icon}><Icon color={operational ? colors.primary : colors.muted} size={24} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.description}>{description}</Text></View>{operational ? <ChevronRight color={colors.primary} size={20} /> : null}</Card></Pressable>)}</ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: spacing.xl, gap: 16 }, kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 29, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 22, marginBottom: 8 }, card: { flexDirection: 'row', gap: 14, alignItems: 'center' }, disabled: { opacity: .62 }, icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: colors.text, fontWeight: '900', fontSize: 17 }, description: { color: colors.muted, lineHeight: 20, marginTop: 5 } });
