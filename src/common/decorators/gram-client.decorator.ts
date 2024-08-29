import { TelegramClient } from 'telegram';
import * as SQLiteSession from 'gramjs-sqlitesession';
import { TelegramWizardsNamesEnums } from '../enums/telegram-wizards.enum';
import * as fs from 'fs';
import { join } from 'path';

export const GramClientDecorator = () => {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    descriptor.value = async function (ctx) {
      if (ctx.client) {
        return await originalMethod.call(this, ctx);
      }
      if (!ctx.session?.settings) {
        return ctx.scene.enter(TelegramWizardsNamesEnums.START);
      }
      const {
        proxyIp,
        proxyPort,
        proxyUsername,
        proxyPassword,
        clientId,
        clientHash,
        appVersion,
        deviceModel,
        langCode,
        systemLangCode,
        sessionPathName,
      } = ctx.session?.settings;
      const filePath = join(__dirname, '..', '..', '..', sessionPathName);
      if (!fs.existsSync(filePath)) {
        return ctx.scene.enter(TelegramWizardsNamesEnums.START);
      }
      const sqliteSession = new SQLiteSession(filePath);
      const client = new TelegramClient(sqliteSession, clientId, clientHash, {
        connectionRetries: 2,
        useWSS: false,
        proxy: {
          ip: proxyIp,
          port: +proxyPort,
          password: proxyPassword,
          username: proxyUsername,
          MTProxy: false,
          socksType: 5,
        },
        appVersion,
        deviceModel,
        langCode,
        systemLangCode,
        timeout: 1000 * 60 * 5,
      });
      try {
        await client.connect();
        return await originalMethod.call(this, ctx, client);
      } catch (e) {
        console.error(e);
        client.disconnect();
        delete ctx.client;
        delete ctx.settings;
        throw e;
      }
    };
    return descriptor;
  };
};
