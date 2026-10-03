/** An error whose message is safe and friendly enough to show a player. */
export class UserError extends Error {
  override name = "UserError";
}

export const userMessage = (err: unknown): string =>
  err instanceof UserError ? err.message : "Something went wrong. Please try again.";
