import { Injectable } from '@nestjs/common';
import { Api, TelegramClient } from 'telegram';
import * as fs from 'fs';
import * as path from 'path';
import { delay } from 'src/common/utils/common.utils';
import { TelegramContext } from 'src/common/contexts/telegram.context';

@Injectable()
export class TelegramParserHandler {
  async isTelegramGroupOrChannel(link: string): Promise<boolean> {
    const telegramGroupRegex = /^https:\/\/t\.me\/[\w_]+$/;
    return telegramGroupRegex.test(link);
  }

  async checkGroupConditions(
    client: TelegramClient,
    link: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const entity = await client.getEntity(link);

    if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
      const participants = await client.getParticipants(entity);
      const totalMembers = participants.total;
      const messages = await client.getMessages(entity, { limit: 100 });

      if (totalMembers < 100) {
        return { valid: false, reason: 'less than 100 users' };
      }

      if (messages.length < 100) {
        return { valid: false, reason: 'less than 100 messages' };
      }

      return { valid: true };
    }

    return { valid: false, reason: 'Not a valid group or channel' };
  }

  async joinGroupOrChannel(
    client: TelegramClient,
    entity: Api.Channel | Api.Chat,
  ) {
    if (!(entity instanceof Api.Channel || entity instanceof Api.Chat)) {
      return {
        joined: false,
        continueParsing: false,
        reason: 'Not a group or channel',
      };
    }

    try {
      const result = await client.invoke(
        new Api.channels.GetParticipant({
          channel: entity,
          participant: 'me',
        }),
      );

      if (result.participant) {
        return {
          joined: false,
          continueParsing: true,
          reason: 'Already joined',
        };
      }
    } catch (error) {
      if (error.errorMessage !== 'USER_NOT_PARTICIPANT') {
        throw error;
      }
    }

    try {
      await client.invoke(new Api.channels.JoinChannel({ channel: entity }));
      return { joined: true, continueParsing: true };
    } catch (error) {
      if (error.errorMessage === 'INVITE_REQUEST_SENT') {
        return {
          joined: true,
          continueParsing: true,
          reason: 'Invite request already sent',
        };
      } else {
        throw error;
      }
    }
  }

  async parseGroupMessages({
    client,
    link,
    telegramId,
    ctx,
  }: {
    client: TelegramClient;
    link: string;
    telegramId: number;
    ctx: TelegramContext;
  }) {
    const entity = await client.getEntity(link);

    let entityName: string;

    if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
      entityName = entity.title || 'group';
    } else {
      entityName = 'unknown';
    }

    const dateLimit = new Date();
    dateLimit.setFullYear(dateLimit.getFullYear() - 1);
    const dateLimitTimestamp = Math.floor(dateLimit.getTime() / 1000);

    let offsetId = 0;
    let hasMoreMessages = true;
    let processedMessages = 0;

    const fileName = `${entityName}-${new Date().toLocaleDateString(
      'en-GB',
    )}.json`;
    const dirPath = path.join(
      __dirname,
      '..',
      '..',
      '..',
      `/files/result/${telegramId}`,
    );
    const filePath = path.join(dirPath, fileName);

    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      await fs.promises.writeFile(filePath, '[', 'utf8');

      await ctx.reply(`Started parsing group/channel: ${entityName}`);

      while (hasMoreMessages) {
        const messages = await client.getMessages(entity, {
          offsetDate: dateLimitTimestamp,
          offsetId,
          limit: 100,
        });

        if (messages.length === 0) {
          hasMoreMessages = false;
          break;
        }

        const parsedMessages = messages.map((msg) => {
          const parsedMessage = {
            id: msg.id,
            type: msg.className || 'message',
            date: new Date(msg.date * 1000).toISOString(),
            date_unixtime: msg.date,
            from: '',
            from_id: '',
            reply_to_message_id: msg.replyTo?.replyToMsgId || null,
            text: msg.message || '',
          };

          if (msg.fromId instanceof Api.PeerUser) {
            parsedMessage.from_id = msg.fromId.userId.toString();
            const user = client.getEntity(msg.fromId.userId);

            if (user instanceof Api.User) {
              parsedMessage.from =
                user.username ||
                `${user.firstName} ${user.lastName || ''}`.trim();
            } else {
              parsedMessage.from = parsedMessage.from_id;
            }
          } else if (msg.fromId instanceof Api.PeerChannel) {
            parsedMessage.from_id = msg.fromId.channelId.toString();
            parsedMessage.from = entityName;
          } else if (msg.fromId instanceof Api.PeerChat) {
            parsedMessage.from_id = msg.fromId.chatId.toString();
            parsedMessage.from = entityName;
          } else {
            parsedMessage.from = 'unknown';
          }

          if (msg.post) {
            parsedMessage.from = `${entityName} (channel post)`;
          }

          return JSON.stringify(parsedMessage, null, 2);
        });

        const dataToWrite =
          (processedMessages > 0 ? ',' : '') + parsedMessages.join(',');

        await fs.promises.appendFile(filePath, dataToWrite, 'utf8');

        offsetId = messages[messages.length - 1].id;
        processedMessages += messages.length;

        await ctx.reply(
          `Parsing progress: ${processedMessages} messages processed in ${entityName}`,
        );

        const randomMinutes = Math.floor(Math.random() * 5) + 1;
        const delayTime = randomMinutes * 60 * 1000;
        await delay(delayTime);
      }

      await fs.promises.appendFile(filePath, ']', 'utf8');

      await ctx.reply(
        `Finished parsing group/channel: ${entityName}. Total messages parsed: ${processedMessages}`,
      );
    } catch (error) {
      await ctx.reply(`Error during parsing: ${error.message}`);
    }
  }

  async startParsing<T extends TelegramContext>(
    ctx: T,
    client: TelegramClient,
  ) {
    await ctx.reply('Parsing started. Please wait...');

    const links = ctx.session.acceptedLinks;

    for (const link of links) {
      const entity = await client.getEntity(link);

      if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
        const joinResult = await this.joinGroupOrChannel(client, entity);

        if (!joinResult.continueParsing) {
          await ctx.reply(`Skipped joining ${link}: ${joinResult.reason}`);
          continue;
        }
      }

      await this.parseGroupMessages({
        client,
        link,
        telegramId: ctx.from.id,
        ctx,
      });

      const randomMinutes = Math.floor(Math.random() * 10) + 1;
      const delayTime = randomMinutes * 60 * 1000;
      await delay(delayTime);
    }

    await ctx.reply('Parsing successfully completed.');
  }
}
