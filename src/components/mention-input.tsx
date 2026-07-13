import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { UserRound } from 'lucide-react-native';

import { Avatar } from './avatar';
import { searchMentionUsers } from '@/lib/api';
import { getActiveMention, insertMention, mentionTokens, mergeMentionUser, validMentionIds, type ActiveMention } from '@/lib/mentions';
import { colors } from '@/theme';
import type { User } from '@/types';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'style'> & {
  value: string;
  onChangeText: (value: string) => void;
  onMentionUserIdsChange: (ids: number[]) => void;
  style?: StyleProp<TextStyle>;
};

export function MentionInput({ value, onChangeText, onMentionUserIdsChange, style, ...props }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const [active, setActive] = useState<ActiveMention | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(active?.query || ''), 180);
    return () => clearTimeout(timer);
  }, [active?.query]);

  const suggestionsQuery = useQuery({
    queryKey: ['mention-suggestions', debouncedQuery],
    queryFn: () => searchMentionUsers(debouncedQuery),
    enabled: Boolean(active),
    staleTime: 30_000,
  });
  const suggestions = useMemo(() => suggestionsQuery.data || [], [suggestionsQuery.data]);

  const updateActiveMention = (text: string, cursor: number) => {
    setActive(getActiveMention(text, cursor));
  };

  const handleChange = (next: string) => {
    const delta = next.length - value.length;
    const cursor = Math.max(0, Math.min(next.length, selection.end + delta));
    const tokens = mentionTokens(next);
    const nextUsers = selectedUsers.filter((user) => user.user_name && tokens.has(user.user_name.toLowerCase()));
    if (nextUsers.length !== selectedUsers.length) setSelectedUsers(nextUsers);
    onMentionUserIdsChange(validMentionIds(next, nextUsers));
    setSelection({ start: cursor, end: cursor });
    updateActiveMention(next, cursor);
    onChangeText(next);
  };

  const selectUser = (user: User) => {
    if (!active || !user.user_name) return;
    const inserted = insertMention(value, active, user.user_name);
    const nextUsers = mergeMentionUser(selectedUsers, user);
    setSelectedUsers(nextUsers);
    onMentionUserIdsChange(validMentionIds(inserted.value, nextUsers));
    onChangeText(inserted.value);
    setSelection({ start: inserted.cursor, end: inserted.cursor });
    setActive(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <View style={styles.root}>
      <TextInput
        {...props}
        onChangeText={handleChange}
        onSelectionChange={(event) => {
          const nextSelection = event.nativeEvent.selection;
          setSelection(nextSelection);
          updateActiveMention(value, nextSelection.end);
          props.onSelectionChange?.(event);
        }}
        ref={inputRef}
        selection={selection}
        style={style}
        value={value}
      />
      {active ? (
        <View accessibilityLabel="Mention suggestions" style={styles.suggestions}>
          {suggestionsQuery.isFetching ? <View style={styles.stateRow}><ActivityIndicator color={colors.primary} size="small" /><Text style={styles.stateText}>Finding people…</Text></View> : null}
          {!suggestionsQuery.isFetching && suggestions.length === 0 ? <Text style={styles.empty}>No active user matches this username.</Text> : null}
          {suggestions.map((candidate) => (
            <Pressable key={String(candidate.id)} onPress={() => selectUser(candidate)} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
              <Avatar user={candidate} size={34} />
              <View style={styles.identity}>
                <Text numberOfLines={1} style={styles.username}>@{candidate.user_name}</Text>
                <Text numberOfLines={1} style={styles.name}>{[candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || candidate.email}</Text>
              </View>
              <View style={[styles.badge, candidate.is_friends && styles.friendBadge]}>
                <UserRound color={candidate.is_friends ? '#047857' : colors.muted} size={12} />
                <Text style={[styles.badgeText, candidate.is_friends && styles.friendBadgeText]}>{candidate.is_friends ? 'Friend' : 'Flow user'}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative', zIndex: 20 },
  suggestions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  option: { minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: '#EFF6FF' },
  identity: { flex: 1, minWidth: 0 },
  username: { color: colors.text, fontSize: 13, fontWeight: '900' },
  name: { color: colors.muted, fontSize: 11, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 4 },
  friendBadge: { backgroundColor: '#ECFDF5' },
  badgeText: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  friendBadgeText: { color: '#047857' },
  stateRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateText: { color: colors.muted, fontSize: 12 },
  empty: { color: colors.muted, fontSize: 12, textAlign: 'center', padding: 16 },
});
