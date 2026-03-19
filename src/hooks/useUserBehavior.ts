/**
 * useUserBehavior — Fetches real user behavior signals for homepage personalization.
 * Returns booking history, registered devices, and derived category preferences.
 */
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserBehaviorSignals {
  /** Authenticated user ID, or null for guests */
  userId: string | null;
  /** Past booking category codes, most recent first */
  bookingCategories: string[];
  /** Registered device category codes */
  deviceCategories: string[];
  /** Number of completed bookings */
  bookingCount: number;
  /** Whether user has a pending/active booking */
  hasPendingBooking: boolean;
  /** Whether user has ever booked (returning user) */
  isReturningUser: boolean;
  /** Category codes ranked by user relevance (bookings > devices > default) */
  rankedCategories: string[];
  /** Loading state */
  loading: boolean;
}

const EMPTY: UserBehaviorSignals = {
  userId: null,
  bookingCategories: [],
  deviceCategories: [],
  bookingCount: 0,
  hasPendingBooking: false,
  isReturningUser: false,
  rankedCategories: [],
  loading: true,
};

export function useUserBehavior(): UserBehaviorSignals {
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<{ category_code: string; status: string }[]>([]);
  const [devices, setDevices] = useState<{ category_code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch bookings + devices in parallel
      const [bookingRes, deviceRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('category_code, status')
          .eq('customer_id', user.id)
          .eq('is_pilot_test', false)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('device_registry')
          .select('category_code')
          .eq('user_id', user.id)
          .limit(20),
      ]);

      if (!cancelled) {
        setBookings(bookingRes.data ?? []);
        setDevices(deviceRes.data ?? []);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return useMemo(() => {
    if (loading) return { ...EMPTY, loading: true };

    const completedBookings = bookings.filter(b =>
      b.status === 'completed'
    );
    const pendingBookings = bookings.filter(b =>
      ['requested', 'confirmed', 'in_progress'].includes(b.status)
    );

    // Count categories from bookings
    const catCounts: Record<string, number> = {};
    for (const b of bookings) {
      catCounts[b.category_code] = (catCounts[b.category_code] || 0) + 1;
    }

    // Ranked: most-booked first, then device categories not yet in bookings
    const sortedBookingCats = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);

    const deviceCats = [...new Set(devices.map(d => d.category_code))];
    const seen = new Set(sortedBookingCats);
    const additional = deviceCats.filter(c => !seen.has(c));

    return {
      userId,
      bookingCategories: sortedBookingCats,
      deviceCategories: deviceCats,
      bookingCount: completedBookings.length,
      hasPendingBooking: pendingBookings.length > 0,
      isReturningUser: completedBookings.length > 0,
      rankedCategories: [...sortedBookingCats, ...additional],
      loading: false,
    };
  }, [userId, bookings, devices, loading]);
}
