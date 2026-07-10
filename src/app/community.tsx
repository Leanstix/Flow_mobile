import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ShieldCheck, UsersRound } from 'lucide-react-native';
import { Card } from '@/components/ui';
import { colors, spacing } from '@/theme';

const items = [
  { icon: CalendarDays, title: 'Campus events', description: 'The mobile experience is ready, but the backend does not currently expose an events domain or API.' },
  { icon: UsersRound, title: 'Student groups', description: 'Group discovery and membership will activate when the backend group endpoints are implemented.' },
  { icon: ShieldCheck, title: 'Moderation queue', description: 'Post reports are operational. A staff moderation queue requires dedicated backend list and action endpoints.' },
];
export default function CommunityScreen() {
  return <ScrollView contentContainerStyle={styles.content}><Text style={styles.kicker}>COMING IN PHASE TWO</Text><Text style={styles.title}>Community tools</Text><Text style={styles.subtitle}>These surfaces are designed and routed without pretending unavailable backend features already work.</Text>{items.map(({ icon: Icon, title, description }) => <Card key={title} style={styles.card}><View style={styles.icon}><Icon color={colors.primary} size={24} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.description}>{description}</Text></View></Card>)}</ScrollView>;
}
const styles = StyleSheet.create({ content: { padding: spacing.xl, gap: 16 }, kicker: { color: colors.primary, fontWeight: '900', letterSpacing: 1.4 }, title: { color: colors.text, fontSize: 29, fontWeight: '900' }, subtitle: { color: colors.muted, lineHeight: 22, marginBottom: 8 }, card: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' }, icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: colors.text, fontWeight: '900', fontSize: 17 }, description: { color: colors.muted, lineHeight: 20, marginTop: 5 } });
