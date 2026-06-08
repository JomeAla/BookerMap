import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const POSITIVE_KEYWORDS = [
  'great', 'excellent', 'good', 'happy', 'satisfied', 'professional',
  'on time', 'recommend', 'thank', 'wonderful', 'amazing', 'perfect',
  'clean', 'friendly', 'helpful', 'efficient', 'impressed', 'love',
  'best', 'fantastic', 'outstanding', 'pleased', 'prompt', 'quality',
];

const NEGATIVE_KEYWORDS = [
  'bad', 'terrible', 'poor', 'late', 'rude', 'disappointed', 'awful',
  'horrible', 'dirty', 'damaged', 'broken', 'waste', 'never again',
  'unprofessional', 'slow', 'overpriced', 'expensive', 'worst', 'unhappy',
  'complaint', 'issue', 'problem', 'not good', "couldn't", "didn't", "wasn't",
];

const NEGATION_MAP: Record<string, string> = {
  'not good': 'negative',
  'not bad': 'positive',
  'not great': 'negative',
  'not happy': 'negative',
  'not satisfied': 'negative',
  'not impressed': 'negative',
  'not clean': 'negative',
  'not friendly': 'negative',
  'not professional': 'negative',
  'not worth': 'negative',
  "couldn't": 'negative',
  "didn't": 'negative',
  "wasn't": 'negative',
  'never': 'negative',
  'no good': 'negative',
};

export interface SentimentResult {
  score: number;
  label: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  confidence: number;
}

export interface SentimentTrendPoint {
  date: string;
  score: number;
}

export interface SentimentTrendResult {
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  total: number;
  trend: SentimentTrendPoint[];
}

export interface SentimentCategoryResult {
  category: string;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  averageScore: number;
  total: number;
}

export interface TopKeywordsResult {
  keyword: string;
  count: number;
}

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(private prisma: PrismaService) {}

  analyzeSentiment(text: string): SentimentResult {
    if (!text || text.trim().length === 0) {
      return { score: 0, label: 'neutral', keywords: [], confidence: 0 };
    }

    const normalized = text.toLowerCase().trim();

    let positiveCount = 0;
    let negativeCount = 0;
    const matchedKeywords: string[] = [];

    const negationFlipped: Record<string, boolean> = {};
    for (const [pattern, polarity] of Object.entries(NEGATION_MAP)) {
      if (normalized.includes(pattern)) {
        negationFlipped[pattern] = true;
        if (polarity === 'negative') {
          negativeCount++;
          matchedKeywords.push(pattern);
        } else {
          positiveCount++;
          matchedKeywords.push(pattern);
        }
      }
    }

    for (const kw of POSITIVE_KEYWORDS) {
      if (normalized.includes(kw) && !negationFlipped[kw]) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(normalized)) {
          positiveCount++;
          matchedKeywords.push(kw);
        }
      }
    }

    for (const kw of NEGATIVE_KEYWORDS) {
      if (negationFlipped[kw]) continue;
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(normalized)) {
        negativeCount++;
        matchedKeywords.push(kw);
      }
    }

    const total = positiveCount + negativeCount;
    if (total === 0) {
      return { score: 0, label: 'neutral', keywords: [], confidence: 0 };
    }

    const score = (positiveCount - negativeCount) / total;
    let label: 'positive' | 'neutral' | 'negative';
    if (score > 0.2) label = 'positive';
    else if (score < -0.2) label = 'negative';
    else label = 'neutral';

    const confidence = Math.min(total / 10, 1);

    return { score: Math.round(score * 1000) / 1000, label, keywords: matchedKeywords, confidence: Math.round(confidence * 1000) / 1000 };
  }

  async analyzeSurvey(surveyId: string): Promise<SentimentResult | null> {
    const survey = await this.prisma.satisfactionSurvey.findUnique({
      where: { id: surveyId },
      select: { id: true, feedback: true },
    });

    if (!survey || !survey.feedback) return null;

    const result = this.analyzeSentiment(survey.feedback);

    await this.prisma.satisfactionSurvey.update({
      where: { id: surveyId },
      data: {
        sentimentScore: result.score,
        sentimentLabel: result.label,
      },
    });

    return result;
  }

  async getSentimentTrend(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<SentimentTrendResult> {
    const where: any = {
      tenantId,
      sentimentLabel: { not: null },
    };

    if (startDate || endDate) {
      where.respondedAt = {};
      if (startDate) where.respondedAt.gte = new Date(startDate);
      if (endDate) where.respondedAt.lte = new Date(endDate);
    }

    const surveys = await this.prisma.satisfactionSurvey.findMany({
      where,
      select: { sentimentLabel: true, sentimentScore: true, respondedAt: true },
      orderBy: { respondedAt: 'asc' },
    });

    const total = surveys.length;
    if (total === 0) {
      return { positivePct: 0, neutralPct: 0, negativePct: 0, total: 0, trend: [] };
    }

    const posCount = surveys.filter((s) => s.sentimentLabel === 'positive').length;
    const neuCount = surveys.filter((s) => s.sentimentLabel === 'neutral').length;
    const negCount = surveys.filter((s) => s.sentimentLabel === 'negative').length;

    const dailyMap = new Map<string, { sum: number; count: number }>();
    for (const s of surveys) {
      const key = s.respondedAt.toISOString().slice(0, 10);
      if (!dailyMap.has(key)) dailyMap.set(key, { sum: 0, count: 0 });
      const entry = dailyMap.get(key)!;
      entry.sum += s.sentimentScore ?? 0;
      entry.count++;
    }

    const trend: SentimentTrendPoint[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        score: data.count > 0 ? Math.round((data.sum / data.count) * 1000) / 1000 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      positivePct: Math.round((posCount / total) * 10000) / 100,
      neutralPct: Math.round((neuCount / total) * 10000) / 100,
      negativePct: Math.round((negCount / total) * 10000) / 100,
      total,
      trend,
    };
  }

  async getSentimentByCategory(tenantId: string): Promise<SentimentCategoryResult[]> {
    const surveys = await this.prisma.satisfactionSurvey.findMany({
      where: {
        tenantId,
        category: { not: null },
        sentimentLabel: { not: null },
      },
      select: { category: true, sentimentLabel: true, sentimentScore: true },
    });

    const grouped = new Map<string, { pos: number; neu: number; neg: number; scores: number[] }>();
    for (const s of surveys) {
      const cat = s.category || 'other';
      if (!grouped.has(cat)) grouped.set(cat, { pos: 0, neu: 0, neg: 0, scores: [] });
      const entry = grouped.get(cat)!;
      if (s.sentimentLabel === 'positive') entry.pos++;
      else if (s.sentimentLabel === 'negative') entry.neg++;
      else entry.neu++;
      if (s.sentimentScore !== null) entry.scores.push(s.sentimentScore);
    }

    return Array.from(grouped.entries()).map(([category, data]) => ({
      category,
      positiveCount: data.pos,
      neutralCount: data.neu,
      negativeCount: data.neg,
      averageScore:
        data.scores.length > 0
          ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 1000) / 1000
          : 0,
      total: data.pos + data.neu + data.neg,
    }));
  }

  async getTopKeywords(
    tenantId: string,
    sentiment: 'positive' | 'negative' | 'all' = 'all',
  ): Promise<TopKeywordsResult[]> {
    const where: any = { tenantId, feedback: { not: null } };

    if (sentiment !== 'all') {
      where.sentimentLabel = sentiment;
    }

    const surveys = await this.prisma.satisfactionSurvey.findMany({
      where,
      select: { feedback: true, sentimentLabel: true },
    });

    const keywordCounts = new Map<string, number>();

    for (const survey of surveys) {
      if (!survey.feedback) continue;
      const result = this.analyzeSentiment(survey.feedback);

      for (const kw of result.keywords) {
        // filter based on requested sentiment
        if (sentiment === 'all') {
          keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
        } else {
          // Only count keywords from surveys matching the requested sentiment
          if (
            (sentiment === 'positive' &&
              (POSITIVE_KEYWORDS.includes(kw) || Object.values(NEGATION_MAP).includes(kw))) ||
            (sentiment === 'negative' &&
              (NEGATIVE_KEYWORDS.includes(kw) || Object.values(NEGATION_MAP).includes(kw)))
          ) {
            keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + 1);
          }
        }
      }
    }

    return Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }
}
