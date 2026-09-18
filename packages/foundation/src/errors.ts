export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function publicError(error: unknown): { code: string; message: string; httpStatus: number } {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, httpStatus: error.httpStatus };
  }
  return { code: "INTERNAL_ERROR", message: "The action could not be completed.", httpStatus: 500 };
}
