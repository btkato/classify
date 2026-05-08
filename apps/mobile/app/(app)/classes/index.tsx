import { useRouter } from 'expo-router'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useClasses } from '../../../hooks/useClasses'
import type { Class } from '../../../lib/types'

function formatDate(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ClassCard({ item }: { item: Class }) {
  const router = useRouter()
  const spotsLeft = item.capacity - item.enrolledCount

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/(app)/classes/${item.id}`)}
    >
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardMeta}>{formatDate(item.startsAt)}</Text>
      {item.location !== null && (
        <Text style={styles.cardMeta}>{item.location}</Text>
      )}
      <View style={styles.cardFooter}>
        <Text style={styles.cardDuration}>{item.durationMinutes} min</Text>
        <Text style={spotsLeft === 0 ? styles.cardFull : styles.cardSpots}>
          {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
        </Text>
      </View>
    </Pressable>
  )
}

export default function ClassListScreen() {
  const { data, isLoading, isError, refetch } = useClasses()

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load classes.</Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <FlatList
      data={data?.data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ClassCard item={item} />}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No upcoming classes.</Text>
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cardDuration: {
    fontSize: 13,
    color: '#6b7280',
  },
  cardSpots: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
  },
  cardFull: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
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
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
})
