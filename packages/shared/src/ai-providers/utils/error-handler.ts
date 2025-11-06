/**
 * F8'E E9'D,) 'D#.7'! 'DEH-/
 */

export enum ProviderErrorType {
  // #.7'! API
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_API_KEY = 'INVALID_API_KEY',
  INVALID_REQUEST = 'INVALID_REQUEST',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // #.7'! 'D4(C)
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // #.7'! 'DE2H/
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // #.7'! 'D(J'F'*
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',

  // #.7'! #.1I
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ProviderError extends Error {
  public readonly type: ProviderErrorType;
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly originalError?: any;
  public readonly timestamp: Date;

  constructor(
    type: ProviderErrorType,
    provider: string,
    message: string,
    options: {
      statusCode?: number;
      retryable?: boolean;
      originalError?: any;
    } = {}
  ) {
    super(message);
    this.name = 'ProviderError';
    this.type = type;
    this.provider = provider;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? this.isRetryableByDefault(type);
    this.originalError = options.originalError;
    this.timestamp = new Date();

    // DD*H'AB E9 TypeScript
    Object.setPrototypeOf(this, ProviderError.prototype);
  }

  private isRetryableByDefault(type: ProviderErrorType): boolean {
    const retryableTypes = [
      ProviderErrorType.RATE_LIMIT,
      ProviderErrorType.TIMEOUT,
      ProviderErrorType.NETWORK_ERROR,
      ProviderErrorType.CONNECTION_ERROR,
      ProviderErrorType.SERVICE_UNAVAILABLE,
      ProviderErrorType.INTERNAL_ERROR
    ];
    return retryableTypes.includes(type);
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      provider: this.provider,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp
    };
  }
}

/**
 * E9'D, 'D#.7'! 'DEH-/
 */
export class ErrorHandler {
  /**
   * *-HJD .7# 9'E D.7# EH-/
   */
  static normalizeError(error: any, provider: string): ProviderError {
    // %0' C'F 'D.7# ('DA9D ProviderError
    if (error instanceof ProviderError) {
      return error;
    }

    // *-DJD 'D.7#
    const errorInfo = this.analyzeError(error);

    return new ProviderError(
      errorInfo.type,
      provider,
      errorInfo.message,
      {
        statusCode: errorInfo.statusCode,
        retryable: errorInfo.retryable,
        originalError: error
      }
    );
  }

  /**
   * *-DJD 'D.7# D*-/J/ FH9G
   */
  private static analyzeError(error: any): {
    type: ProviderErrorType;
    message: string;
    statusCode?: number;
    retryable: boolean;
  } {
    const errorMessage = error?.message?.toLowerCase() || '';
    const statusCode = error?.status || error?.statusCode;

    // *-DJD -3( CH/ HTTP
    if (statusCode) {
      if (statusCode === 401) {
        return {
          type: ProviderErrorType.INVALID_API_KEY,
          message: 'Invalid API key',
          statusCode,
          retryable: false
        };
      }
      if (statusCode === 429) {
        return {
          type: ProviderErrorType.RATE_LIMIT,
          message: 'Rate limit exceeded',
          statusCode,
          retryable: true
        };
      }
      if (statusCode === 403) {
        return {
          type: ProviderErrorType.QUOTA_EXCEEDED,
          message: 'Quota exceeded',
          statusCode,
          retryable: false
        };
      }
      if (statusCode >= 500) {
        return {
          type: ProviderErrorType.SERVICE_UNAVAILABLE,
          message: 'Service unavailable',
          statusCode,
          retryable: true
        };
      }
      if (statusCode === 400) {
        return {
          type: ProviderErrorType.INVALID_REQUEST,
          message: error?.message || 'Invalid request',
          statusCode,
          retryable: false
        };
      }
    }

    // *-DJD -3( 13'D) 'D.7#
    if (errorMessage.includes('timeout')) {
      return {
        type: ProviderErrorType.TIMEOUT,
        message: 'Request timeout',
        retryable: true
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        type: ProviderErrorType.NETWORK_ERROR,
        message: 'Network error',
        retryable: true
      };
    }

    if (errorMessage.includes('rate limit')) {
      return {
        type: ProviderErrorType.RATE_LIMIT,
        message: 'Rate limit exceeded',
        retryable: true
      };
    }

    if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
      return {
        type: ProviderErrorType.INVALID_API_KEY,
        message: 'Invalid API key',
        retryable: false
      };
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        type: ProviderErrorType.VALIDATION_ERROR,
        message: error?.message || 'Validation error',
        retryable: false
      };
    }

    // .7# :J1 E91HA
    return {
      type: ProviderErrorType.UNKNOWN_ERROR,
      message: error?.message || 'Unknown error',
      retryable: false
    };
  }

  /**
   * 'D*-BB %0' C'F 'D.7# B'(D'K DD%9'/)
   */
  static isRetryable(error: any): boolean {
    if (error instanceof ProviderError) {
      return error.retryable;
    }

    const errorInfo = this.analyzeError(error);
    return errorInfo.retryable;
  }

  /**
   * -3'( HB* 'D'F*8'1 DD%9'/)
   */
  static calculateRetryDelay(attempt: number, error?: ProviderError): number {
    // %0' C'F rate limit '3*./E HB* #7HD
    if (error?.type === ProviderErrorType.RATE_LIMIT) {
      return Math.min(5000 * Math.pow(2, attempt - 1), 60000); // -*I /BJB)
    }

    // Exponential backoff 9'/J
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000); // -*I 10 +H'FJ
  }

  /**
   * *F3JB 'D.7# DD916
   */
  static formatError(error: any): string {
    if (error instanceof ProviderError) {
      return `[${error.provider}] ${error.type}: ${error.message}`;
    }
    return error?.message || 'Unknown error';
  }
}
