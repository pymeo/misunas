import { describe, expect, it } from 'vitest';
import {
  campaignSchema,
  readCampaignAttribution,
} from '@/application/campaign';

describe('campaign attribution', () => {
  it('keeps only the four allowed UTM fields', () => {
    expect(
      readCampaignAttribution(
        '?utm_source=instagram&utm_medium=paid_social&utm_campaign=lanzamiento&utm_content=story-1&email=private@example.com&other=value',
      ),
    ).toEqual({
      utmSource: 'instagram',
      utmMedium: 'paid_social',
      utmCampaign: 'lanzamiento',
      utmContent: 'story-1',
    });
  });

  it('sanitizes client values and rejects unsafe server payloads', () => {
    expect(readCampaignAttribution('?utm_source=%3Cscript%3E')).toEqual({
      utmSource: 'script',
      utmMedium: undefined,
      utmCampaign: undefined,
      utmContent: undefined,
    });
    expect(
      campaignSchema.safeParse({ utmSource: 'https://tracker.example' })
        .success,
    ).toBe(false);
    expect(
      campaignSchema.safeParse({ utmSource: 'x'.repeat(101) }).success,
    ).toBe(false);
  });
});
