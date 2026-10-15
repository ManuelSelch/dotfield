import { test } from '../driver/fixtures';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('mobile Home selections configure the generated match', async ({ app }) => {
  await app.home.open();
  await app.home.enableFieldFeature('Slow Zone');
  await app.home.enablePlayerUpgrade('Industry');
  await app.home.enablePlayerUpgrade('Capture shield');
  await app.home.rerollPreview();
  await app.home.play();

  await app.match.shouldStartWith({
    fieldFeatures: ['Slow Zone'],
    playerUpgrades: ['Industry', 'Capture shield'],
  });
  await app.match.buildRole('Watchtower');
  await app.match.shouldUseCurrentPreview();
});
