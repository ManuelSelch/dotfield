import { expect, type Locator, type Page } from '@playwright/test';
import { SAVED_GAME_KEY } from '../../src/game/persistence';

export type FieldFeatureName = 'Artillery' | 'Watchtower' | 'Slow Zone' | 'Mountains' | 'River & bridges' | 'Factory';
export type PlayerUpgradeName = 'Industry' | 'Capture shield';

const featurePreferences: Record<FieldFeatureName, string> = {
  Artillery: 'artillery',
  Watchtower: 'watchtower',
  'Slow Zone': 'slowZone',
  Mountains: 'mountains',
  'River & bridges': 'river',
  Factory: 'industry',
};
const featureKinds: Partial<Record<FieldFeatureName, string>> = {
  Artillery: 'artillery',
  Watchtower: 'watchtower',
  'Slow Zone': 'slow-zone',
  Factory: 'factory',
};
const upgradeIds: Record<PlayerUpgradeName, string> = {
  Industry: 'industry',
  'Capture shield': 'capture-shield',
};

interface SavedMatch {
  generated?: { preferences?: { map?: Record<string, unknown>; upgrades?: Record<string, string[]> } };
  territories?: { x: number; y: number; features?: { kind: string }[] }[];
  state?: { rules?: { factions?: Record<string, { unitsPerSecond?: number; captureShieldBatches?: number }> } };
}

interface DriverContext {
  previewCoordinates?: [number, number][];
}

export class HomeDriver {
  constructor(private readonly page: Page, private readonly context: DriverContext) {}

  private async tap(control: Locator, description: string) {
    const bounds = await control.boundingBox();
    if (!bounds) throw new Error(`Cannot touch ${description}: control has no visible bounds`);
    await this.page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  }

  async open() {
    await this.page.goto('/');
    await this.page.getByRole('button', { name: 'Play', exact: true }).waitFor();
  }

  async enableFieldFeature(name: FieldFeatureName) {
    const ariaName = name === 'Factory' ? 'Map Factory' : name;
    const toggle = this.page.getByRole('button', { name: ariaName, exact: true });
    if (await toggle.getAttribute('aria-pressed') !== 'true') await this.tap(toggle, `${name} field setting`);
    await expect(toggle, `${name} field setting`).toHaveAttribute('aria-pressed', 'true');
  }

  async rerollPreview() {
    await this.tap(this.page.getByRole('button', { name: 'Reroll', exact: true }), 'map reroll');
  }

  async enablePlayerUpgrade(name: PlayerUpgradeName) {
    const upgrades = this.page.getByRole('group', { name: 'Your upgrades' });
    if (!await upgrades.isVisible()) {
      await this.tap(this.page.getByText('Your upgrades', { exact: true }), 'Your upgrades section');
    }
    const checkbox = upgrades.getByRole('checkbox', { name, exact: true });
    if (!await checkbox.isChecked()) await this.tap(checkbox, `${name} upgrade`);
    await expect(checkbox, `${name} upgrade`).toBeChecked();
  }

  async play() {
    const preview = this.page.getByRole('img', { name: 'Generated map preview' });
    this.context.previewCoordinates = await preview.locator('g > circle[cx][cy]')
      .evaluateAll(circles => circles.map(circle => [Number(circle.getAttribute('cx')), Number(circle.getAttribute('cy'))] as [number, number]));
    await this.tap(this.page.getByRole('button', { name: 'Play', exact: true }), 'Play');
    await this.page.getByRole('img', { name: 'Territory board' }).waitFor();
  }
}

export class MatchDriver {
  constructor(private readonly page: Page, private readonly context: DriverContext) {}

  async shouldUseCurrentPreview() {
    expect(this.context.previewCoordinates, 'The preview should be captured when Play is selected').toBeDefined();
    const raw = await this.page.evaluate(key => localStorage.getItem(key), SAVED_GAME_KEY);
    expect(raw, 'The started match should be saved').not.toBeNull();
    const match = JSON.parse(raw!) as SavedMatch;
    const matchCoordinates = match.territories?.map(city => [city.x, city.y]);
    expect(matchCoordinates, 'The started match should use the currently previewed map').toEqual(this.context.previewCoordinates);
  }

  async shouldStartWith(expected: { fieldFeatures: FieldFeatureName[]; playerUpgrades: PlayerUpgradeName[] }) {
    const raw = await this.page.evaluate(key => localStorage.getItem(key), SAVED_GAME_KEY);
    expect(raw, 'The started match should be saved').not.toBeNull();
    const match = JSON.parse(raw!) as SavedMatch;
    const preferences = match.generated?.preferences;
    expect(preferences, 'The saved match should retain its Home selections').toBeDefined();

    for (const feature of expected.fieldFeatures) {
      const preference = featurePreferences[feature];
      expect(preferences!.map?.[preference], `Home field setting “${feature}”`).toBe(true);
      const kind = featureKinds[feature];
      if (kind) {
        const count = match.territories?.filter(city => city.features?.some(item => item.kind === kind)).length ?? 0;
        expect(count, `The generated match should contain one ${feature}`).toBe(1);
      }
    }

    const selected = preferences!.upgrades?.player ?? [];
    expect(selected).toEqual(expect.arrayContaining(expected.playerUpgrades.map(name => upgradeIds[name])));
    const playerRules = match.state?.rules?.factions?.player;
    for (const upgrade of expected.playerUpgrades) {
      if (upgrade === 'Industry') expect(playerRules?.unitsPerSecond, 'Industry production rate').toBe(1.25);
      if (upgrade === 'Capture shield') expect(playerRules?.captureShieldBatches, 'Capture shield batch count').toBe(3);
    }
  }
}

export class DotfieldDriver {
  readonly home: HomeDriver;
  readonly match: MatchDriver;

  constructor(page: Page) {
    const context: DriverContext = {};
    this.home = new HomeDriver(page, context);
    this.match = new MatchDriver(page, context);
  }
}
