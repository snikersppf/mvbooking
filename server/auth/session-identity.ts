export type SessionIdentity = {
  userId: string;
  sessionVersion: number;
  mfaVerified?: boolean;
};
