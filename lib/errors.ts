export class NotImplementedError extends Error {
  constructor(operation: string) {
    super(`${operation} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}

export class PairNotFoundError extends Error {
  constructor() {
    super("Pair not found");
    this.name = "PairNotFoundError";
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Too many attempts");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
