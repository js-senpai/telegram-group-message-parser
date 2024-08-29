import { Module } from '@nestjs/common';
import { TelegramModule } from './telegram/telegram.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { telegramConfig } from './common/configs/telegram.config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: telegramConfig,
      inject: [ConfigService],
    }),
    TelegramModule,
  ],
})
export class AppModule {}
