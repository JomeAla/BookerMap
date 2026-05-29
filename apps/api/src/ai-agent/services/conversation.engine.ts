import { Injectable } from '@nestjs/common';
import { EntityMap, ConversationState } from '../dto/chat-message.dto';

@Injectable()
export class ConversationEngine {
  private readonly datePatterns = [
    { regex: /\b(tomorrow)\b/i, normalize: () => this.getRelativeDate(1) },
    { regex: /\b(next week)\b/i, normalize: () => this.getRelativeDate(7) },
    { regex: /\b(next monday)\b/i, normalize: () => this.getNextDay(1) },
    { regex: /\b(next tuesday)\b/i, normalize: () => this.getNextDay(2) },
    { regex: /\b(next wednesday)\b/i, normalize: () => this.getNextDay(3) },
    { regex: /\b(next thursday)\b/i, normalize: () => this.getNextDay(4) },
    { regex: /\b(next friday)\b/i, normalize: () => this.getNextDay(5) },
    { regex: /\b(next saturday)\b/i, normalize: () => this.getNextDay(6) },
    { regex: /\b(next sunday)\b/i, normalize: () => this.getNextDay(0) },
    { regex: /\b(today)\b/i, normalize: () => this.formatDate(new Date()) },
    { regex: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i, normalize: (match: RegExpExecArray) => this.formatDate(new Date(`${match[1]} ${match[2]}, ${new Date().getFullYear()}`)) },
    { regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/i, normalize: (match: RegExpExecArray) => this.formatDate(new Date(`${match[3]}-${match[1]}-${match[2]}`)) },
    { regex: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/i, normalize: (match: RegExpExecArray) => this.formatDate(new Date(`${match[1]}-${match[2]}-${match[3]}`)) },
  ];

  private readonly timePatterns = [
    { regex: /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, normalize: (match: RegExpExecArray) => {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const meridian = match[3].toLowerCase();
      if (meridian === 'pm' && hours !== 12) hours += 12;
      if (meridian === 'am' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }},
    { regex: /\b(morning)\b/i, normalize: () => '09:00' },
    { regex: /\b(afternoon)\b/i, normalize: () => '14:00' },
    { regex: /\b(evening)\b/i, normalize: () => '17:00' },
  ];

  private readonly serviceKeywords = [
    { word: 'haircut', service: 'Haircut' },
    { word: 'hair style', service: 'Hair Styling' },
    { word: 'hairstyle', service: 'Hair Styling' },
    { word: 'massage', service: 'Massage' },
    { word: 'facial', service: 'Facial' },
    { word: 'manicure', service: 'Manicure' },
    { word: 'pedicure', service: 'Pedicure' },
    { word: 'cleaning', service: 'Cleaning' },
    { word: 'repair', service: 'Repair' },
    { word: 'consultation', service: 'Consultation' },
  ];

  private readonly namePattern = /\bmy name is (\w+(?:\s+\w+)?)\b/i;
  private readonly phonePattern = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  private readonly emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/;
  private readonly bookingIdPattern = /\b(?:booking|reference|ref|id)[:\s]*([A-Z0-9]{6,})\b/i;

  private knownServices: string[] = [];

  setKnownServices(services: string[]): void {
    this.knownServices = services;
  }

  detectIntent(message: string): string {
    const lower = message.toLowerCase().trim();

    const greetingWords = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'help'];
    for (const word of greetingWords) {
      if (lower === word || lower.startsWith(word + ' ') || lower.endsWith(' ' + word) || lower.includes(' ' + word + ' ') || lower === 'help' || lower.startsWith('help ')) {
        return 'GREETING';
      }
    }

    const bookWords = ['book', 'schedule', 'appointment', 'booking', 'i want to', 'i need', 'i\'d like to'];
    if (bookWords.some(w => lower.includes(w)) && !lower.includes('cancel') && !lower.includes('reschedule') && !lower.includes('change')) {
      return 'BOOKING_CREATE';
    }

    if (lower.includes('cancel') || lower.includes('cancellation')) {
      return 'BOOKING_CANCEL';
    }

    if (lower.includes('reschedule') || lower.includes('move') || lower.includes('change time') || lower.includes('change date') || lower.includes('postpone') || lower.includes('reschedule')) {
      return 'BOOKING_RESCHEDULE';
    }

    const statusWords = ['status', 'when', 'upcoming', 'my booking', 'my appointment', 'check'];
    for (const word of statusWords) {
      if (lower.includes(word)) {
        return 'BOOKING_STATUS';
      }
    }

    const payWords = ['pay', 'payment', 'invoice', 'bill', 'paid', 'invoice'];
    if (payWords.some(w => lower.includes(w))) {
      return 'PAYMENT_INQUIRY';
    }

    const priceWords = ['price', 'cost', 'how much', 'pricing', 'rate', 'fee', 'charges'];
    if (priceWords.some(w => lower.includes(w))) {
      return 'PRICE_INQUIRY';
    }

    return 'FALLBACK';
  }

  extractEntities(message: string): EntityMap {
    const entities: EntityMap = {};

    for (const pattern of this.datePatterns) {
      const match = pattern.regex.exec(message);
      if (match) {
        entities.date = pattern.normalize(match);
        break;
      }
    }

    for (const pattern of this.timePatterns) {
      const match = pattern.regex.exec(message);
      if (match) {
        entities.time = pattern.normalize(match);
        break;
      }
    }

    const serviceMatch = this.serviceKeywords.find(s => message.toLowerCase().includes(s.word));
    if (serviceMatch) {
      entities.service = serviceMatch.service;
    }

    if (this.knownServices.length > 0) {
      for (const svc of this.knownServices) {
        if (message.toLowerCase().includes(svc.toLowerCase())) {
          entities.service = svc;
          break;
        }
      }
    }

    const nameMatch = this.namePattern.exec(message);
    if (nameMatch) {
      entities.name = nameMatch[1].trim();
    }

    const phoneMatch = this.phonePattern.exec(message);
    if (phoneMatch) {
      entities.phone = phoneMatch[0].trim();
    }

    const emailMatch = this.emailPattern.exec(message);
    if (emailMatch) {
      entities.email = emailMatch[1].trim().toLowerCase();
    }

    const bookingMatch = this.bookingIdPattern.exec(message);
    if (bookingMatch) {
      entities.bookingId = bookingMatch[1].trim();
    }

    return entities;
  }

  getMissingFields(intent: string, entities: EntityMap): string[] {
    const missing: string[] = [];
    switch (intent) {
      case 'BOOKING_CREATE':
        if (!entities.service) missing.push('service');
        if (!entities.date) missing.push('date');
        if (!entities.time) missing.push('time');
        if (!entities.name) missing.push('name');
        if (!entities.phone) missing.push('phone');
        break;
      case 'BOOKING_CANCEL':
        if (!entities.bookingId && !entities.phone) missing.push('bookingId');
        break;
      case 'BOOKING_RESCHEDULE':
        if (!entities.bookingId && !entities.phone) missing.push('bookingId');
        if (!entities.date && !entities.time) missing.push('date');
        break;
      case 'BOOKING_STATUS':
        if (!entities.phone && !entities.email && !entities.bookingId) missing.push('phone');
        break;
      case 'PAYMENT_INQUIRY':
        if (!entities.phone && !entities.email) missing.push('phone');
        break;
      case 'PRICE_INQUIRY':
        if (!entities.service) missing.push('service');
        break;
    }
    return missing;
  }

  mergeEntities(existing: EntityMap, incoming: EntityMap): EntityMap {
    return { ...existing, ...incoming };
  }

  private getRelativeDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return this.formatDate(date);
  }

  private getNextDay(targetDay: number): string {
    const today = new Date();
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    today.setDate(today.getDate() + diff);
    return this.formatDate(today);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
