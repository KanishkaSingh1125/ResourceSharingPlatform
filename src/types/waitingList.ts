export type WaitingListStatus =
  | 'waiting'
  | 'awaiting_decision'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'withdrawn'
  | 'allocated'
  | 'not_allocated'

export interface WaitingListEntry {
  id: string
  resourceId: string
  resourceTitle: string
  startTime: string
  endTime: string
  purpose: string
  status: WaitingListStatus
  queuePosition: number | null
  queuePositionVisible: boolean
  offerExpiresAt: string | null
  outcomeReason: string | null
  allocationExplanation: string | null
  updatedAt: string
}

export interface WaitingListAlternative {
  resourceId: string
  resourceTitle: string
  startTime: string
  endTime: string
  explanation: string | null
}

export interface JoinWaitingListInput {
  resourceId: string
  startTime: string
  endTime: string
  purpose: string
  idempotencyKey: string
}

export type WaitingListOfferDecision = 'accept' | 'decline'
