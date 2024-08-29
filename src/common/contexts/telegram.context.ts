import { Scenes } from 'telegraf';
import { SceneSession, SceneSessionData } from 'telegraf/typings/scenes';
import { Context } from 'telegraf/typings/context';
import { Update } from 'telegraf/typings/core/types/typegram';
import { TelegramClient } from 'telegram';
export interface TelegramContext extends Scenes.SceneContext, Context {
  session: SceneSession<SceneSessionData> & {
    settings?: {
      proxyIp?: string;
      proxyPort?: number;
      proxyUsername?: string;
      proxyPassword?: string;
      clientId?: number;
      clientHash?: string;
      appVersion?: string;
      deviceModel?: string;
      langCode?: string;
      systemLangCode?: string;
      sessionPathName?: string;
    };
    acceptedLinks?: string[];
  };
  startPayload?: any;
}

export type TelegramMessageUpdateContext = TelegramContext & {
  update: Update.MessageUpdate & {
    message: Update.MessageUpdate['message'] & {
      text: string;
    };
  };
};

export type TelegramMessageWithPhoneUpdateContext = TelegramContext & {
  update: Update.MessageUpdate & {
    message: Update.MessageUpdate['message'] & {
      contact: {
        phone_number: string;
      };
    };
  };
};

export type TelegramCallbackQueryUpdateContext = TelegramContext & {
  update: Update.CallbackQueryUpdate & {
    callback_query: Update.CallbackQueryUpdate['callback_query'] & {
      data: string;
    };
  };
};
