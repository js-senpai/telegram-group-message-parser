import { Module, Logger } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { TelegramStartWizardService } from './wizards/telegram-start.wizard';
import { TelegramParserHandler } from './handlers/telegra-parser.handler';

@Module({
  providers: [
    TelegramUpdate,
    Logger,
    TelegramParserHandler,
    TelegramStartWizardService,
  ],
})
export class TelegramModule {}
