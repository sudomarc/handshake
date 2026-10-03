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
