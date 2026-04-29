import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter<T> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionBody = exception.getResponse() as unknown;

      if (typeof exceptionBody === 'object') {
        const codeMap: Record<number, string> = {
          400: 'VALIDATION_ERROR',
          401: 'UNAUTHORIZED',
          403: 'FORBIDDEN',
          404: 'NOT_FOUND',
          409: 'CONFLICT',
          422: 'UNPROCESSABLE',
        };
        code = codeMap[status] ?? 'ERROR';

        if (
          exceptionBody &&
          typeof exceptionBody === 'object' &&
          'message' in exceptionBody
        ) {
          const msg = exceptionBody.message;

          message = Array.isArray(msg) ? String(msg[0]) : String(msg);
        }
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
      },
    });
  }
}
