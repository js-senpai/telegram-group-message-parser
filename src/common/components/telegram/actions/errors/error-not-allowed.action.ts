import { TelegramContext } from '../../../../contexts/telegram.context';
export const ErrorNotAllowedAction = async ({
  ctx,
}: {
  ctx: TelegramContext;
}): Promise<void> => {
  await ctx.reply('You dont have access for this bot', {
    parse_mode: 'HTML',
  });
};
