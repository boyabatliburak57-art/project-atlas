declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      authenticatedUserId?: string;
      authenticatedSessionId?: string;
      authenticatedRoles?: readonly string[];
      authenticationAt?: Date;
      authenticationMethod?: 'bearer' | 'cookie';
      authenticatedEmailVerified?: boolean;
      requestId?: string;
      traceId?: string;
      traceparent?: string;
    }
  }
}

export {};
