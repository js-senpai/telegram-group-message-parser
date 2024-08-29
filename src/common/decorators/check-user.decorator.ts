import { ConfigService } from '@nestjs/config';
import { ErrorNotAllowedAction } from '../components/telegram/actions/errors/error-not-allowed.action';

export const CheckUserDecorator = () => {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    descriptor.value = async function (ctx) {
      const configService = new ConfigService();
      const { id } = ctx.message.from;
      const getAvailableIds = configService.get('TELEGRAM_ALLOWED_USERS');
      if (!getAvailableIds.split(',').includes(`${id}`)) {
        await ErrorNotAllowedAction({ ctx });
        return;
      } else {
        return await originalMethod.call(this, ctx);
      }
    };
    return descriptor;
  };
};
