export class AppError extends Error {
  public readonly name: string
  public readonly statusCode: number
  public readonly cause?: unknown

  constructor(message: string, statusCode = 500, cause?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.cause = cause
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error', cause?: unknown) {
    super(message, 400, cause)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404)
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError
} 