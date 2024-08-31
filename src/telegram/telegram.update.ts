import { Action, Command, Ctx, Start, Update } from 'nestjs-telegraf';
import {
  TelegramCallbackQueryUpdateContext,
  TelegramMessageUpdateContext,
} from '../common/contexts/telegram.context';
import { Logger, UseFilters } from '@nestjs/common';
import { TelegramWizardsNamesEnums } from 'src/common/enums/telegram-wizards.enum';
import { TelegramCommandsEnums } from 'src/common/enums/telegram-commands.enum';
import { CheckUserDecorator } from 'src/common/decorators/check-user.decorator';
import { TelegrafExceptionFilter } from 'src/common/filters/telegraf-exception.filter';
import { GramClientDecorator } from 'src/common/decorators/gram-client.decorator';
import { ErrorForbiddenForBotsAction } from 'src/common/components/telegram/actions/errors/error-forbidden-bots.action';
import { TelegramClient } from 'telegram';
import { TelegramParserHandler } from './handlers/telegram-parser.handler';

@Update()
@UseFilters(TelegrafExceptionFilter)
export class TelegramUpdate {
  constructor(
    private readonly logger: Logger,
    private readonly telegramParserService: TelegramParserHandler,
  ) {}

  // Start

  @Start()
  @CheckUserDecorator()
  async start(@Ctx() ctx: TelegramMessageUpdateContext) {
    try {
      const {
        update: {
          message: {
            from: { is_bot = false },
          },
        },
      } = ctx;
      if (is_bot) {
        await ErrorForbiddenForBotsAction({ ctx });
        return;
      }
      await ctx.scene.leave();
      // Enter the "start" scene
      await ctx.scene.enter(TelegramWizardsNamesEnums.START);
    } catch (e) {
      this.logger.error(
        'Error in start method',
        JSON.stringify(e?.response?.data || e.stack),
        TelegramUpdate.name,
      );
      throw e;
    }
  }

  @Command(TelegramCommandsEnums.PARSE_GROUPS)
  @CheckUserDecorator()
  @GramClientDecorator()
  async parseGroups(
    @Ctx() ctx: TelegramMessageUpdateContext,
    client: TelegramClient,
  ) {
    try {
      const {
        update: {
          message: {
            from: { is_bot = false },
            text,
          },
        },
      } = ctx;
      if (is_bot) {
        await ErrorForbiddenForBotsAction({ ctx });
        return;
      }
      const command = `/${TelegramCommandsEnums.PARSE_GROUPS}`;
      const textAfterCommand = text.replace(command, '').trim();
      if (!textAfterCommand) {
        return await ctx.reply(
          'The command should be followed by a list of links separated by commas.',
          {
            parse_mode: 'HTML',
          },
        );
      }

      const links = textAfterCommand.split(',').map((link) => link.trim());
      const invalidGroups = [];

      ctx.session.acceptedLinks = [];

      for (const link of links) {
        if (this.telegramParserService.isTelegramGroupOrChannel(link)) {
          const { valid, reason } =
            await this.telegramParserService.checkGroupConditions(client, link);
          if (valid) {
            ctx.session.acceptedLinks.push(link);
          } else {
            invalidGroups.push({ link, reason });
          }
        } else {
          invalidGroups.push({
            link,
            reason: 'Invalid Telegram group/channel URL',
          });
        }
      }

      if (invalidGroups.length > 0) {
        const invalidLinksMessage = invalidGroups
          .map((group) => `${group.link} - ${group.reason}`)
          .join('\n');
        await ctx.reply(
          `Some groups/channels do not meet the conditions:\n\n${invalidLinksMessage}`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Parse',
                    callback_data: JSON.stringify({ parseGroups: true }),
                  },
                  {
                    text: 'Decline',
                    callback_data: JSON.stringify({ parseGroups: false }),
                  },
                ],
              ],
            },
          },
        );
      } else {
        this.telegramParserService.startParsing(ctx, client);
      }
    } catch (e) {
      this.logger.error(
        'Error in parseGroups method',
        JSON.stringify(e?.response?.data || e.stack),
        TelegramUpdate.name,
      );
      throw e;
    }
  }

  @Action(/parseGroups/)
  @CheckUserDecorator()
  @GramClientDecorator()
  async handleParseGroups(
    @Ctx() ctx: TelegramCallbackQueryUpdateContext,
    client: TelegramClient,
  ) {
    try {
      const { parseGroups } = JSON.parse(ctx.update.callback_query.data);
      if (parseGroups) {
        this.telegramParserService.startParsing(ctx, client);
      } else {
        await ctx.reply('Parsing declined.');
      }
    } catch (e) {
      this.logger.error(
        'Error in handleParseGroups method',
        JSON.stringify(e?.response?.data || e.stack),
        TelegramUpdate.name,
      );
      throw e;
    }
  }
}
