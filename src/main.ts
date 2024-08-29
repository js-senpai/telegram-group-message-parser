import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { winstonConfig } from './common/configs/winston.config';
import { WinstonModule } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Winston logger
  app.useLogger(WinstonModule.createLogger(winstonConfig));
  await app.listen(3005);
}
bootstrap();
