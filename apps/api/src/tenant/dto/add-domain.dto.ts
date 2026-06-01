import { IsString, Matches } from 'class-validator';

export class AddDomainDto {
  @IsString()
  @Matches(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    { message: 'Invalid domain format. Must be a valid domain (e.g., bookings.mycompany.com)' },
  )
  domain!: string;
}
