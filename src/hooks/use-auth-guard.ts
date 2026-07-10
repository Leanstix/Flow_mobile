import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/state/auth-store';

export function useAuthGuard(requireProfile = true) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);
  useEffect(() => {
    if (!hydrated) return;
    if (!session) router.replace('/(auth)/login');
    else if (requireProfile && !session.user.user_name) router.replace('/onboarding');
  }, [hydrated, requireProfile, session]);
  return { hydrated, session };
}
