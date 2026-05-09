import { useClerk } from '@clerk/clerk-expo'
import { Stack, useRouter } from 'expo-router'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useMyRegistrations } from '../../hooks/useMyRegistrations'
import type { RegistrationWithClass } from '../../lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function SignOutButton() {
  const { signOut } = useClerk()
  return (
    <Pressable onPress={() => signOut()} style={styles.signOutButton}>
      <Text style={styles.signOutText}>Sign out</Text>
    </Pressable>
  )
}

function RegistrationRow({ item }: { item: RegistrationWithClass }) {
  const router = useRouter()
  const isWaitlisted = item.status === 'WAITLISTED'

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/(app)/classes/${item.classId}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.class.title}
        </Text>
        <View style={isWaitlisted ? styles.waitlistBadge : styles.enrolledBadge}>
          <Text style={isWaitlisted ? styles.waitlistBadgeText : styles.enrolledBadgeText}>
            {isWaitlisted ? `Waitlist #${item.waitlistPosition ?? '—'}` : 'Enrolled'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>{formatDate(item.class.startsAt)}</Text>
      {item.class.location !== null && (
        <Text style={styles.cardMeta}>{item.class.location}</Text>
      )}
    </Pressable>
  )
}

export default function DashboardScreen() {
  const { data: registrations, isLoading, isError, refetch } = useMyRegistrations()

  const now = new Date()

  const upcoming = (registrations ?? [])
    .filter(
      (reg) =>
        (reg.status === 'ENROLLED' || reg.status === 'WAITLISTED') &&
        new Date(reg.class.startsAt) > now,
    )
    .sort(
      (a, b) =>
        new Date(a.class.startsAt).getTime() - new Date(b.class.startsAt).getTime(),
    )

  const enrolledCount = (registrations ?? []).filter(
    (reg) => reg.status === 'ENROLLED',
  ).length
  const waitlistedCount = (registrations ?? []).filter(
    (reg) => reg.status === 'WAITLISTED',
  ).length

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Dashboard',
          headerRight: () => <SignOutButton />,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{isLoading ? '—' : enrolledCount}</Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{isLoading ? '—' : waitlistedCount}</Text>
            <Text style={styles.statLabel}>Waitlisted</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Upcoming Classes</Text>

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}

        {isError && (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Failed to load registrations.</Text>
            <Pressable style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && upcoming.length === 0 && (
          <Text style={styles.emptyText}>No upcoming classes.</Text>
        )}

        {upcoming.map((item) => (
          <RegistrationRow key={item.id} item={item} />
        ))}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginTop: 4,
    marginBottom: 4,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  enrolledBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  enrolledBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  waitlistBadge: {
    backgroundColor: '#fef9c3',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  waitlistBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#854d0e',
  },
  cardMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  signOutButton: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  signOutText: {
    fontSize: 15,
    color: '#dc2626',
    fontWeight: '500',
  },
})
