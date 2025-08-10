import { NextResponse } from 'next/server'
import { AppError, isAppError } from '@/shared/errors'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function jsonError(message: string, status = 500, init?: ResponseInit) {
  return new NextResponse(message, { status, ...init })
}

export function handleHttpError(error: unknown) {
  if (isAppError(error)) {
    return jsonError(error.message, error.statusCode)
  }
  console.error('Unhandled error:', error)
  return jsonError('Internal server error', 500)
} 