import { useLocalSearchParams, router } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLessonSet } from '../../../hooks/useLessonSet'
import { useEnrollInLessonSet } from '../../../hooks/useEnrollInLessonSet'
import { useCancelLessonSetRegistration } from '../../../hooks/useCancelLessonSetRegistration'
import { useEnroll, useCancelRegistration } from '../../../hooks/useEnroll'
import { useMyRegistrations } from '../../../hooks/useMyRegistrations'
import type { Class, RegistrationWithClass } from '../../../lib/types'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface DropInSessionRowProps {
  session: Class
  registrations: RegistrationWithClass[]
}

function DropInSessionRow({ session, registrations }: DropInSessionRowProps) {
  const enroll = useEnroll(session.id)
  const cancelRegistration = useCancelRegistration()

  const existingRegistration = registrations.find(
    (registration) =>
      registration.classId === session.id &&
      (registration.status === 'ENROLLED' || registration.status === 'WAITLISTED'),
  )

  const isFull = session.enrolledCount >= session.capacity
  const spotsLeft = session.capacity - session.enrolledCount

  function handleEnroll() {
    enroll.mutate(undefined, {
      onError: (error) => Alert.alert('Enroll failed', error.message),
    })
  }

  function handleCancel() {
    if (existingRegistration === undefined) return
    Alert.alert('Cancel enrollment', 'Cancel your spot in this session?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: () =>
          cancelRegistration.mutate(
            { registrationId: existingRegistration.id, classId: session.id },
            { onError: (error) => Alert.alert('Cancel failed', error.message) },
          ),
      },
    ])
  }

  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionNumber}>Session {session.sessionNumber}</Text>
        <Text style={styles.sessionDate}>{formatDateTime(session.startsAt)}</Text>
        {session.location !== null && (
          <Text style={styles.sessionLocation}>{session.location}</Text>
        )}
        <Text style={[styles.sessionSpots, isFull && styles.sessionSpotsFull]}>
          {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
        </Text>
      </View>

      {existingRegistration ? (
        <Pressable
          style={styles.cancelSessionButton}
          onPress={handleCancel}
          disabled={cancelRegistration.isPending}
        >
          <Text style={styles.cancelSessionButtonText}>Cancel</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.enrollSessionButton, (isFull || enroll.isPending) && styles.buttonDisabled]}
          onPress={handleEnroll}
          disabled={enroll.isPending}
        >
          <Text style={styles.enrollSessionButtonText}>
            {enroll.isPending ? '...' : isFull ? 'Full' : 'Enroll'}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

export default function LessonSetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: lessonSet, isLoading: lessonSetLoading } = useLessonSet(id)
  const { data: registrations, isLoading: registrationsLoading } = useMyRegistrations()
  const enrollInLessonSet = useEnrollInLessonSet(id)
  const cancelLessonSetRegistration = useCancelLessonSetRegistration()

  const isLoading = lessonSetLoading || registrationsLoading

  const classIds = new Set(lessonSet?.classes.map((session) => session.id) ?? [])
  const isEnrolled = (registrations ?? []).some(
    (registration) =>
      classIds.has(registration.classId) &&
      (registration.status === 'ENROLLED' || registration.status === 'WAITLISTED'),
  )

  function handleEnrollSeries() {
    enrollInLessonSet.mutate(undefined, {
      onError: (error) => Alert.alert('Enrollment failed', error.message),
    })
  }

  function handleCancelSeries() {
    Alert.alert('Cancel series enrollment', 'Cancel your enrollment in this full series?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: () =>
          cancelLessonSetRegistration.mutate(
            { lessonSetId: id },
            { onError: (error) => Alert.alert('Cancel failed', error.message) },
          ),
      },
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (lessonSet === undefined) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Lesson set not found.</Text>
      </View>
    )
  }

  const isFullSet = lessonSet.enrollmentType === 'FULL_SET'
  const firstSession = lessonSet.classes.at(0)
  const firstSessionDate = firstSession ? formatDateTime(firstSession.startsAt) : null

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>{lessonSet.title}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaChip}>{lessonSet.totalSessions} sessions</Text>
        <Text style={styles.metaChip}>
          {isFullSet ? 'Full Set' : 'Drop-in'} enrollment
        </Text>
        {firstSessionDate !== null && (
          <Text style={styles.metaChip}>Starts {firstSessionDate}</Text>
        )}
      </View>

      {lessonSet.description !== null && (
        <Text style={styles.description}>{lessonSet.description}</Text>
      )}

      {isFullSet && (
        <View style={styles.ctaBlock}>
          {isEnrolled ? (
            <>
              <View style={styles.enrolledBadge}>
                <Text style={styles.enrolledText}>{"You're enrolled in this series"}</Text>
              </View>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelSeries}
                disabled={cancelLessonSetRegistration.isPending}
              >
                <Text style={styles.cancelButtonText}>
                  {cancelLessonSetRegistration.isPending ? 'Cancelling...' : 'Cancel Series Enrollment'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.button, enrollInLessonSet.isPending && styles.buttonDisabled]}
              onPress={handleEnrollSeries}
              disabled={enrollInLessonSet.isPending}
            >
              <Text style={styles.buttonText}>
                {enrollInLessonSet.isPending ? 'Processing...' : 'Enroll in Full Series'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={styles.sectionLabel}>Sessions</Text>

      <View style={styles.sessionList}>
        {lessonSet.classes.map((session) =>
          isFullSet ? (
            <View key={session.id} style={styles.sessionRow}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionNumber}>Session {session.sessionNumber}</Text>
                <Text style={styles.sessionDate}>{formatDateTime(session.startsAt)}</Text>
                {session.location !== null && (
                  <Text style={styles.sessionLocation}>{session.location}</Text>
                )}
              </View>
              <Text style={styles.sessionSpots}>
                {session.enrolledCount} / {session.capacity}
              </Text>
            </View>
          ) : (
            <DropInSessionRow
              key={session.id}
              session={session}
              registrations={registrations ?? []}
            />
          ),
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
  backLink: {
    marginBottom: 16,
  },
  backLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  metaChip: {
    fontSize: 13,
    color: '#6b7280',
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
  },
  ctaBlock: {
    gap: 12,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sessionList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  sessionInfo: {
    flex: 1,
    marginRight: 12,
  },
  sessionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  sessionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  sessionLocation: {
    fontSize: 12,
    color: '#6b7280',
  },
  sessionSpots: {
    fontSize: 12,
    color: '#6b7280',
  },
  sessionSpotsFull: {
    color: '#dc2626',
  },
  enrollSessionButton: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  enrollSessionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelSessionButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  cancelSessionButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
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
