import { randomBytes } from 'crypto';

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateBookingReference(): string {
  const bytes = randomBytes(8);
  let reference = '';
  for (let i = 0; i < 8; i++) {
    reference += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `BM-${reference}`;
}