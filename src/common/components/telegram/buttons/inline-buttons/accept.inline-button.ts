import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

export const AcceptInlineButton = async ({
  data,
}: {
  data: string;
}): Promise<InlineKeyboardButton[]> => [Markup.button.callback('Accept', data)];
