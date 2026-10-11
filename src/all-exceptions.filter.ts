import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: any = 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null && (res as any).message) {
        message = (res as any).message;
      }
    } else {
      this.logger.error('Unhandled Exception:', exception);
    }

    if (status === 500 && (message === 'Internal server error' || !message)) {
      message = 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
