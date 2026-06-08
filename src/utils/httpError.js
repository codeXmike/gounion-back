export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const notFound = (message = 'Not found') => new HttpError(404, message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const unauthorized = (message = 'Not authenticated') => new HttpError(401, message);
