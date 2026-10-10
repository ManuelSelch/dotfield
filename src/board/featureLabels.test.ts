import { expect, it } from 'vitest';
import { featureLabels } from './featureLabels';

it('labels authored and legacy Factories by current ownership', () => {
  for (const beneficiaryId of [undefined, 'player']) {
    const city = { id: 'plant', x: 80, y: 190, owner: 'enemy', units: 14,
      features: [{ id: 'plant:factory', kind: 'factory' as const, productionMultiplier: 2, ...(beneficiaryId ? { beneficiaryId } : {}) }] };
    expect(featureLabels(city)).toContain('Factory active (2× production)');
    expect(featureLabels({ ...city, owner: 'neutral' })).toContain('Factory inactive');
  }
});
