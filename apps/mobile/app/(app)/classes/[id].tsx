import { useLocalSearchParams } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useClass } from '../../../hooks/useClass'
import { useCancelRegistration, useEnroll } from '../../../hooks/useEnroll'
import { useMyRegistrations } from '../../../hooks/useMyRegistrations'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: classDetail, isLoading: classLoading } = useClass(id)
  const { data: registrations, isLoading: registrationsLoading } = useMyRegistrations()
  const enroll = useEnroll(id)
  const cancelRegistration = useCancelRegistration()

  const isLoading = classLoading || registrationsLoading

  const existingRegistration = registrations?.find((reg) => reg.classId === id)
  const isEnrolled = existingRegistration?.status === 'ENROLLED' || existingRegistration?.status === 'ATTENDED'
  const isWaitlisted = existingRegistration?.status === 'WAITLISTED'
  const isFull = classDetail !== undefined && classDetail.enrolledCount >= classDetail.capacity

  function handleEnroll() {
    enroll.mutate(undefined, {
      onError: (error) => {
        Alert.alert('Enroll failed', error.message)
      },
    })
  }

  function handleCancel() {
    if (existingRegistration === undefined) return
    Alert.alert(
      isWaitlisted ? 'Leave waitlist' : 'Cancel enrollment',
      isWaitlisted
        ? 'Remove yourself from the waitlist?'
        : 'Cancel your spot in this class?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => {
            cancelRegistration.mutate(
              { registrationId: existingRegistration.id, classId: id },
              { onError: (error) => Alert.alert('Cancel failed', error.message) },
            )
          },
        },
      ],
    )
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (classDetail === undefined) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Class not found.</Text>
      </View>
    )
  }

  const spotsLeft = classDetail.capacity - classDetail.enrolledCount

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{classDetail.title}</Text>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Date</Text>
        <Text style={styles.metaValue}>{formatDate(classDetail.startsAt)}</Text>
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Duration</Text>
        <Text style={styles.metaValue}>{classDetail.durationMinutes} minutes</Text>
      </View>

      {classDetail.location !== null && (
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Location</Text>
          <Text style={styles.metaValue}>{classDetail.location}</Text>
        </View>
      )}

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Capacity</Text>
        <Text style={styles.metaValue}>
          {classDetail.enrolledCount} / {classDetail.capacity} enrolled
          {!isEnrolled && !isWaitlisted && (
            <Text style={spotsLeft === 0 ? styles.full : styles.spots}>
              {spotsLeft === 0 ? '  ·  Full' : `  ·  ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
            </Text>
          )}
        </Text>
      </View>

      {classDetail.description !== null && (
        <View style={styles.descriptionBlock}>
          <Text style={styles.metaLabel}>About</Text>
          <Text style={styles.description}>{classDetail.description}</Text>
        </View>
      )}

      <View style={styles.actionBlock}>
        {isEnrolled && (
          <>
            <View style={styles.enrolledBadge}>
              <Text style={styles.enrolledText}>You are enrolled</Text>
            </View>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={cancelRegistration.isPending}
            >
              <Text style={styles.cancelButtonText}>
                {cancelRegistration.isPending ? 'Cancelling...' : 'Cancel enrollment'}
              </Text>
            </Pressable>
          </>
        )}

        {isWaitlisted && (
          <>
            <View style={styles.waitlistBadge}>
              <Text style={styles.waitlistText}>
                Waitlisted — position {existingRegistration?.waitlistPosition ?? '—'}
              </Text>
            </View>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={cancelRegistration.isPending}
            >
              <Text style={styles.cancelButtonText}>
                {cancelRegistration.isPending ? 'Leaving...' : 'Leave waitlist'}
              </Text>
            </Pressable>
          </>
        )}

        {!isEnrolled && !isWaitlisted && (
          <Pressable
            style={[styles.button, enroll.isPending && styles.buttonDisabled]}
            onPress={handleEnroll}
            disabled={enroll.isPending}
          >
            <Text style={styles.buttonText}>
              {enroll.isPending
                ? 'Processing...'
                : isFull
                ? 'Join waitlist'
                : 'Enroll'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 20,
  },
  metaBlock: {
    marginBottom: 14,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    color: '#374151',
  },
  descriptionBlock: {
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  spots: {
    color: '#16a34a',
  },
  full: {
    color: '#dc2626',
  },
  actionBlock: {
    marginTop: 8,
    gap: 12,
  },
  enrolledBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  enrolledText: {
    color: '#15803d',
    fontWeight: '600',
    fontSize: 15,
  },
  waitlistBadge: {
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  waitlistText: {
    color: '#854d0e',
    fontWeight: '600',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
  },
})
