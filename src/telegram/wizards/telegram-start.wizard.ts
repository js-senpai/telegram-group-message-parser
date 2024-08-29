import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { TelegramContext } from 'src/common/contexts/telegram.context';
import { TelegramWizardsNamesEnums } from 'src/common/enums/telegram-wizards.enum';
import { Scenes } from 'telegraf';
import * as fs from 'fs';
import { join } from 'path';
import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { TelegramCommandsEnums } from 'src/common/enums/telegram-commands.enum';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';

@Wizard(TelegramWizardsNamesEnums.START)
@Injectable()
export class TelegramStartWizardService {
  @WizardStep(1)
  async step1(@Ctx() ctx: Scenes.WizardContext & TelegramContext) {
    ctx.session.settings = {};
    await ctx.reply(
      'Write proxy data using ",". For example: 127.0.0.1,8080,username,password',
      {
        parse_mode: 'HTML',
      },
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: Scenes.WizardContext & TelegramContext) {
    if (ctx.message && 'text' in ctx.message) {
      const getText = ctx.message.text || '';
      const [proxyIp, proxyPort, proxyUsername, proxyPassword] =
        getText.split(',');
      if (
        !proxyIp ||
        !Number.isInteger(Number(proxyPort)) ||
        !proxyUsername ||
        !proxyPassword
      ) {
        return ctx.wizard.back();
      }
      ctx.session.settings = {
        proxyIp,
        proxyPort: Number(proxyPort),
        proxyUsername,
        proxyPassword,
      };
      await ctx.reply('Upload .json file with user data', {
        parse_mode: 'HTML',
      });
      ctx.wizard.next();
    } else {
      ctx.wizard.back();
    }
  }

  @WizardStep(3)
  async step3(@Ctx() ctx: Scenes.WizardContext & TelegramContext) {
    if (ctx.message && 'document' in ctx.message) {
      const document = ctx.message.document;
      const fileName = document.file_name;
      if (!fileName.endsWith('.json')) {
        await ctx.reply(
          'Invalid file. Please send a file with a .json extension.',
        );
        return;
      }
      const fileLink = await ctx.telegram.getFileLink(document.file_id);
      const response = await axios({
        url: fileLink.href,
        method: 'GET',
        responseType: 'stream',
      });

      let rawData = '';

      const writableStream = new Writable({
        write(chunk, encoding, callback) {
          rawData += chunk;
          callback();
        },
      });

      await pipeline(response.data, writableStream);

      try {
        const {
          app_id,
          app_hash,
          app_version,
          device,
          lang_code,
          system_lang_code,
        } = JSON.parse(rawData);

        const newSettings = {
          clientId: +app_id,
          clientHash: app_hash,
          appVersion: app_version,
          deviceModel: device,
          langCode: lang_code,
          systemLangCode: system_lang_code,
        };
        ctx.session.settings = {
          ...ctx.session.settings,
          ...newSettings,
        };

        await ctx.reply('Upload .session file');
        ctx.wizard.next();
      } catch (parseError) {
        await ctx.reply('An error occurred while parsing the JSON file.');
        ctx.wizard.back();
      }
    } else {
      ctx.wizard.back();
    }
  }

  @WizardStep(4)
  async step4(@Ctx() ctx: Scenes.WizardContext & TelegramContext) {
    if (ctx.message && 'document' in ctx.message) {
      const document = ctx.message.document;

      const fileName = document.file_name;
      if (!fileName.endsWith('.session')) {
        await ctx.reply(
          'Invalid file. Please send a file with a .session extension.',
        );
        return;
      }
      const fileLink = await ctx.telegram.getFileLink(document.file_id);
      const telegramId = ctx.from.id;
      const dirAbsolutePath = `/files/session/${telegramId}/`;
      const dirPath = join(__dirname, '..', '..', '..', dirAbsolutePath);
      const filePath = join(dirPath, fileName);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      ctx.session.settings = {
        ...ctx.session.settings,
        sessionPathName: `${dirAbsolutePath}${fileName}`,
      };
      try {
        const response = await axios({
          url: fileLink.href,
          method: 'GET',
          responseType: 'stream',
        });

        await pipeline(response.data, fs.createWriteStream(filePath));

        await ctx.reply(
          `File has successfully uploaded. Now you have ability to use command "/${TelegramCommandsEnums.PARSE_GROUPS}"`,
        );
        ctx.scene.leave();
      } catch (error) {
        // Обработка ошибки
        console.error('Ошибка при загрузке файла:', error);
        await ctx.reply('An error occurred while saving the file.');
        ctx.wizard.back();
      }
    } else {
      ctx.wizard.back();
    }
  }
}
