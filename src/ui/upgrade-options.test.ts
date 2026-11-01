import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { UpgradeOptions } from './upgrade-options';

describe('upgrade option presentation', () => {
  it.each(['player', 'enemy'])(
    'omits the legacy Factory toggle for %s without hiding other upgrades',
    (factionId) => {
      const html = renderToStaticMarkup(
        createElement(UpgradeOptions, {
          factionId,
          selected: ['capture-shield'],
          onChange: vi.fn(),
        }),
      );

      expect(html).toContain(`aria-label="${factionId === 'player' ? 'Your' : 'enemy'} upgrades"`);
      expect(html).not.toContain('Factory');
      expect(html).toContain('Industry');
      expect(html).toContain('Capture shield');
      expect(html).toContain('Defensive Network');
      expect(html).toMatch(/aria-pressed="true"[^>]*>Capture shield/);
    },
  );
});
