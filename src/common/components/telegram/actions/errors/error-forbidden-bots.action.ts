import { TelegramContext } from 'src/common/contexts/telegram.context';

export const ErrorForbiddenForBotsAction = async ({
  ctx,
}: {
  ctx: TelegramContext;
}): Promise<void> => {
  await ctx.reply('Bots are not allowed to use this bot', {
    parse_mode: 'HTML',
  });
};
