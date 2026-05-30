import { IsString, MinLength } from 'class-validator';

export class ReviewReplyDto {
  @IsString()
  @MinLength(1)
  adminReply: string;
}
