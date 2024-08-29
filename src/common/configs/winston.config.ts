import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
export const winstonConfig: WinstonModuleOptions = {
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({
          all: true,
        }),
        winston.format.label({
          label: '[LOGGER]',
        }),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf(
          (error) =>
            `[Nest]    - ${[error.timestamp]}  [${error.context}] :  ${
              error.level
            }: ${error.message}`,
        ),
      ),
    }),
    new winston.transports.DailyRotateFile({
      datePattern: 'DD.MM.YYYY',
      filename: `logs/info-%DATE%.log`,
      level: 'info',
      maxFiles: '30d',
    }),
    new winston.transports.DailyRotateFile({
      filename: `logs/errors-%DATE%.log`,
      datePattern: 'DD.MM.YYYY',
      level: 'error',
      maxFiles: '30d',
    }),
  ],
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: `logs/exceptions-%DATE%.log`,
      datePattern: 'DD.MM.YYYY',
      maxFiles: '30d',
      level: 'exception',
    }),
  ],
  exitOnError: false,
};
