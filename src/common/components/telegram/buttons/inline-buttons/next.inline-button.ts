import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

export const NextInlineButton = async ({
  data,
}: {
  data: string;
}): Promise<InlineKeyboardButton[]> => [Markup.button.callback('Next', data)];
