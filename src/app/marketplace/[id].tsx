import React, { useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Flag, MapPin, MessageCircle, ShoppingBag, X } from 'lucide-react-native';

import { Avatar } from '@/components/avatar';
import { CachedImage } from '@/components/media';
import { Button, Card, Field } from '@/components/ui';
import {
  archiveMarketplaceListing,
  contactMarketplaceSeller,
  fetchMarketplaceListing,
  reportMarketplaceListing,
  saveMarketplaceListing,
  setMarketplaceListingStatus,
  unsaveMarketplaceListing,
} from '@/lib/api';
import { marketplaceKeys } from '@/lib/query-keys';
import { colors, radii, spacing } from '@/theme';
import { showApiError, showConfirm, showSuccess } from '@/state/ui-store';
import type { MarketplaceStatus } from '@/types';

export default function MarketplaceDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(rawId);
  const client = useQueryClient();
  const [messageOpen, setMessageOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const query = useQuery({ queryKey: marketplaceKeys.detail(id), queryFn: () => fetchMarketplaceListing(id), enabled: Number.isFinite(id) });
  const listing = query.data;
  const invalidate = () => { client.invalidateQueries({ queryKey: marketplaceKeys.root }); client.invalidateQueries({ queryKey: marketplaceKeys.detail(id) }); };
  const saveMutation = useMutation({ mutationFn: () => listing?.is_saved ? unsaveMarketplaceListing(id) : saveMarketplaceListing(id), onSuccess: () => { invalidate(); showSuccess(listing?.is_saved ? 'Removed from saved' : 'Listing saved', listing?.is_saved ? 'The listing was removed from your saved items.' : 'You can find it under Saved in the marketplace.'); }, onError: (error) => showApiError(error, 'Could not update saved listing') });
  const reportMutation = useMutation({ mutationFn: () => reportMarketplaceListing(id, reason.trim()), onSuccess: () => { setReason(''); setReportOpen(false); showSuccess('Report received', 'Flow moderation will review this listing privately.'); }, onError: (error) => showApiError(error, 'Could not submit report') });
  const statusMutation = useMutation({ mutationFn: (status: MarketplaceStatus) => setMarketplaceListingStatus(id, status), onSuccess: () => { invalidate(); showSuccess('Status updated', 'Buyers will see the latest listing status.'); }, onError: (error) => showApiError(error, 'Could not update listing') });
  const archiveMutation = useMutation({ mutationFn: () => archiveMarketplaceListing(id), onSuccess: () => { invalidate(); showSuccess('Listing archived', 'The listing is no longer publicly visible.'); router.back(); }, onError: (error) => showApiError(error, 'Could not archive listing') });
  const contactMutation = useMutation({
    mutationFn: () => contactMarketplaceSeller(id, message.trim()),
    onSuccess: ({ conversation }) => {
      setMessage('');
      setMessageOpen(false);
      client.invalidateQueries({ queryKey: ['conversations'] });
      router.push({ pathname: '/conversation/[id]', params: { id: String(conversation.id), name: conversation.name } });
    },
    onError: (error) => showApiError(error, 'Could not contact seller'),
  });
  const images = useMemo(() => listing ? [...(listing.images || []).map((item) => item.image), ...(listing.image && !(listing.images || []).some((item) => item.image === listing.image) ? [listing.image] : [])] : [], [listing]);
  if (query.isLoading || !listing) return <View style={styles.center}><Text style={styles.muted}>{query.isError ? 'Could not load this listing.' : 'Loading listing…'}</Text></View>;
  const price = listing.price ? `₦${Number(listing.price).toLocaleString()}` : 'Contact seller';
  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.primary} />}>
    {images.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>{images.map((uri) => <CachedImage key={uri} source={uri} style={styles.galleryImage} />)}</ScrollView> : <View style={styles.imageFallback}><ShoppingBag color={colors.primary} size={52} /></View>}
    <View style={styles.titleRow}><View style={{ flex: 1 }}><Text style={styles.category}>{listing.category.replace('_', ' ')} · {listing.condition.replace('_', ' ')}</Text><Text style={styles.title}>{listing.title}</Text><Text style={styles.price}>{price}</Text></View>{!listing.is_owner ? <Pressable accessibilityLabel={listing.is_saved ? 'Unsave listing' : 'Save listing'} disabled={saveMutation.isPending} onPress={() => saveMutation.mutate()} style={[styles.iconButton, listing.is_saved && styles.iconButtonActive]}><Bookmark color={listing.is_saved ? '#fff' : colors.primary} fill={listing.is_saved ? '#fff' : 'transparent'} size={22} /></Pressable> : null}</View>
    <View style={styles.metaRow}><View style={styles.pill}><Text style={styles.pillText}>{listing.status}</Text></View>{listing.location ? <View style={styles.location}><MapPin color={colors.muted} size={16} /><Text style={styles.locationText}>{listing.location}</Text></View> : null}<Text style={styles.views}>{listing.views_count} views · {listing.saved_count} saves</Text></View>
    <Card><Text style={styles.sectionTitle}>Description</Text><Text style={styles.description}>{listing.description}</Text></Card>
    <Card style={styles.sellerCard}><Avatar user={listing.seller} size={52} /><View style={{ flex: 1 }}><Text style={styles.sellerName}>{listing.seller.user_name || listing.seller.first_name || listing.seller.email}</Text><Text style={styles.muted}>{listing.seller.department || 'Flow student seller'}</Text></View>{!listing.is_owner ? <Pressable onPress={() => setMessageOpen(true)} style={styles.messageButton}><MessageCircle color="#fff" size={18} /></Pressable> : null}</Card>
    {listing.is_owner ? <Card style={styles.ownerControls}><Text style={styles.sectionTitle}>Manage listing</Text><Text style={styles.muted}>Keep the status accurate so buyers know whether this item is available.</Text><View style={styles.statusGrid}>{(['active', 'reserved', 'sold'] as MarketplaceStatus[]).map((status) => <Pressable key={status} disabled={statusMutation.isPending} onPress={() => statusMutation.mutate(status)} style={[styles.statusChoice, listing.status === status && styles.statusChoiceActive]}><Text style={[styles.statusText, listing.status === status && styles.statusTextActive]}>{status}</Text></Pressable>)}</View><Button onPress={() => showConfirm('Archive listing?', 'This removes it from public marketplace results.', () => archiveMutation.mutate())} title="Archive listing" variant="danger" /></Card> : <View style={styles.buyerActions}><Button onPress={() => setMessageOpen(true)} title="Message seller" /><Button onPress={() => setReportOpen(true)} title="Report listing" variant="secondary" /></View>}
    <ActionModal open={messageOpen} onClose={() => setMessageOpen(false)} title="Message seller"><Text style={styles.muted}>The first message automatically includes this item, its image, price, and a direct listing link.</Text><Field label="Message (optional)" maxLength={1000} multiline onChangeText={setMessage} placeholder={`Hi, is ${listing.title} still available?`} style={styles.multiline} value={message} /><Button loading={contactMutation.isPending} onPress={() => contactMutation.mutate()} title="Send enquiry" /></ActionModal>
    <ActionModal open={reportOpen} onClose={() => setReportOpen(false)} title="Report listing"><Text style={styles.muted}>Reports are private and visible only to moderation staff.</Text><Field label="Reason" maxLength={1000} multiline onChangeText={setReason} placeholder="Explain why this listing should be reviewed" style={styles.multiline} value={reason} /><Button disabled={reason.trim().length < 10} loading={reportMutation.isPending} onPress={() => reportMutation.mutate()} title="Submit report" variant="danger" /></ActionModal>
  </ScrollView>;
}

function ActionModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) { return <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={open}><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled"><View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><Pressable onPress={onClose} style={styles.close}><X color={colors.text} size={21} /></Pressable></View>{children}</ScrollView></Modal>; }

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: 50, gap: 16, backgroundColor: colors.background }, gallery: { marginHorizontal: -spacing.lg }, galleryImage: { width: 360, maxWidth: '100%', height: 300, marginRight: 8 }, imageFallback: { height: 230, borderRadius: radii.lg, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 }, category: { color: colors.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }, title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 5 }, price: { color: colors.primary, fontSize: 23, fontWeight: '900', marginTop: 7 }, iconButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }, iconButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary }, metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, alignItems: 'center' }, pill: { backgroundColor: '#ECFDF5', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }, pillText: { color: colors.success, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, location: { flexDirection: 'row', alignItems: 'center', gap: 5 }, locationText: { color: colors.muted, fontWeight: '700', fontSize: 12 }, views: { color: colors.muted, fontSize: 11 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, description: { color: colors.text, lineHeight: 22, marginTop: 10 }, sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, sellerName: { color: colors.text, fontWeight: '900', fontSize: 16 }, muted: { color: colors.muted, lineHeight: 20, marginTop: 3 }, messageButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, buyerActions: { gap: 10 }, ownerControls: { gap: 14 }, statusGrid: { flexDirection: 'row', gap: 8 }, statusChoice: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', borderRadius: 13, paddingVertical: 11, alignItems: 'center' }, statusChoiceActive: { backgroundColor: '#EEF2FF', borderColor: '#A5B4FC' }, statusText: { color: colors.muted, fontWeight: '800', textTransform: 'capitalize' }, statusTextActive: { color: colors.primary }, modalContent: { padding: spacing.xl, gap: 18, backgroundColor: colors.background, minHeight: '100%' }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: { color: colors.text, fontSize: 26, fontWeight: '900' }, close: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, multiline: { minHeight: 120, textAlignVertical: 'top', paddingTop: 14 } });
