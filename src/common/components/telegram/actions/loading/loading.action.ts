import { TelegramContext } from '../../../../contexts/telegram.context';

export const LoadingAction = async ({
  ctx,
}: {
  ctx: TelegramContext;
}): Promise<void> => {
  await ctx.reply('Loading...', {
    parse_mode: 'HTML',
  });
};
