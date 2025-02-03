import { elizaLogger } from '@elizaos/core';
import debug from 'debug';

const debugLog = debug('eliza:pubmed');

export enum PubmedErrorCodes {
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_SEARCH_PARAMS = 'INVALID_SEARCH_PARAMS',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  INVALID_ACTION = 'INVALID_ACTION'
}

export class PubmedError extends Error {
  constructor(
    public code: PubmedErrorCodes,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'PubmedError';

    // Log error details for debugging
    debugLog('PubMed error occurred: %O', {
      code,
      message,
      cause,
      stack: this.stack
    });

    // Log to Eliza's logger for production monitoring
    elizaLogger.error('PubMed operation failed', {
      code,
      message,
      cause: cause instanceof Error ? cause.message : cause
    });
  }

  static fromError(error: unknown, defaultCode = PubmedErrorCodes.API_ERROR): PubmedError {
    if (error instanceof PubmedError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new PubmedError(defaultCode, message, error);
  }
}
