'use client'

import { useTideCloak } from '@tidecloak/nextjs'
import { useCallback } from 'react'

/** Empty in production: nginx serves the NestJS API under /api on the same origin. */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ''

/** Matches the _tide_vault.selfencrypt / _tide_vault.selfdecrypt realm roles. */
export const TAG = 'vault'

export interface StoredDoc {
  id: string
  category: string
  titleCt: string
  bodyCt: string
  bodyBytes: number
  createdAt: string
}

export interface AccessRequest {
  id: string
  reason: string
}

export interface PlanResult {
  needed: AccessRequest[]
  message: string
}

export interface AnswerResult {
  answer: string
  citations: string[]
  followUps: AccessRequest[]
  injectionSuspected: boolean
  injectionNote: string
  toolCalls: string[]
  blockedLinks: string[]
}

export interface Receipt {
  id: string
  kind: 'index' | 'disclosure' | 'denied'
  docIds: string[]
  questionCt: string | null
  model: string | null
  note: string | null
  createdAt: string
}

/** Calls the NestJS API with the user's threshold-signed Tide token. */
export function useApi() {
  const { getToken } = useTideCloak()
  return useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${API_BASE}/api${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message ?? `${res.status} ${res.statusText}`)
      return data as T
    },
    [getToken],
  )
}

/**
 * Tide self-encryption. Keys never exist in one place: each call is a threshold operation on the
 * Tide ORK network, authorised by this user's session and the _tide_vault.* roles.
 */
export function useVaultCrypto() {
  const { doEncrypt, doDecrypt } = useTideCloak()
  const encrypt = useCallback(
    async (values: string[]): Promise<string[]> =>
      values.length ? ((await doEncrypt(values.map((data) => ({ data, tags: [TAG] })))) as string[]) : [],
    [doEncrypt],
  )
  const decrypt = useCallback(
    async (cts: string[]): Promise<string[]> =>
      cts.length
        ? ((await doDecrypt(cts.map((encrypted) => ({ encrypted, tags: [TAG] })))) as unknown[]).map(String)
        : [],
    [doDecrypt],
  )
  return { encrypt, decrypt }
}

export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}
