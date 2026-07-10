import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react-native';
import { colors, radii, spacing } from '@/theme';
import { useUIStore } from '@/state/ui-store';

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Button({ title, onPress, loading, variant = 'primary', disabled, testID }: { title: string; onPress?: () => void; loading?: boolean; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; testID?: string }) {
  const palette = variant === 'primary' ? styles.primary : variant === 'danger' ? styles.danger : styles.secondary;
  const text = variant === 'secondary' ? styles.secondaryText : styles.buttonText;
  return <Pressable testID={testID} accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, palette, (disabled || loading) && styles.disabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#fff'} /> : <Text style={[styles.buttonLabel, text]}>{title}</Text>}</Pressable>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.muted} style={[styles.input, error && styles.inputError]} {...props} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[styles.card, style]}>{children}</View>; }

export function FeedbackModal() {
  const feedback = useUIStore();
  const Icon = feedback.type === 'success' ? CheckCircle2 : feedback.type === 'error' ? AlertCircle : feedback.type === 'confirm' ? TriangleAlert : Info;
  const color = feedback.type === 'success' ? colors.success : feedback.type === 'error' ? colors.danger : feedback.type === 'confirm' ? colors.warning : colors.primary;
  return <Modal animationType="fade" transparent visible={feedback.visible} onRequestClose={feedback.hide}><View style={styles.backdrop}><View style={styles.modalCard}><View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}><Icon color={color} size={28} /></View><Text style={styles.modalTitle}>{feedback.title}</Text><Text style={styles.modalMessage}>{feedback.message}</Text><View style={styles.modalActions}>{feedback.type === 'confirm' ? <Button title="Cancel" variant="secondary" onPress={feedback.hide} /> : null}<Button title={feedback.type === 'confirm' ? feedback.confirmLabel || 'Continue' : 'Okay'} variant={feedback.type === 'error' ? 'danger' : 'primary'} onPress={() => { const action = feedback.onConfirm; feedback.hide(); action?.(); }} /></View></View></View></Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  button: { minHeight: 48, borderRadius: radii.md, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }, danger: { backgroundColor: colors.danger },
  buttonText: { color: '#fff' }, secondaryText: { color: colors.text }, buttonLabel: { fontSize: 15, fontWeight: '700' }, disabled: { opacity: .55 }, pressed: { opacity: .82 },
  field: { gap: 7 }, label: { color: colors.text, fontWeight: '700', fontSize: 14 }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: '#fff', paddingHorizontal: spacing.lg, color: colors.text, fontSize: 16 }, inputError: { borderColor: colors.danger }, error: { color: colors.danger, fontSize: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,.62)', justifyContent: 'center', padding: 24 }, modalCard: { backgroundColor: '#fff', borderRadius: 28, padding: 24, alignItems: 'center' }, iconWrap: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, modalTitle: { marginTop: 18, fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' }, modalMessage: { marginTop: 10, color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' }, modalActions: { marginTop: 22, width: '100%', gap: 10 },
});
