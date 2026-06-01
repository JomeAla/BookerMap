import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ApiKeyContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  },
);
