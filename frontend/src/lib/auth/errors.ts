export type AuthErrorCode =
  | "invalid_input"
  | "email_taken"
  | "invalid_credentials"
  | "storage_unavailable";

export type AuthFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly fields: AuthFieldErrors;

  constructor(code: AuthErrorCode, message: string, fields: AuthFieldErrors = {}) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.fields = fields;
  }
}
