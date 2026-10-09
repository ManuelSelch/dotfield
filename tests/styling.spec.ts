import { expect, test } from '@playwright/test';

test('Mantine components and Tailwind utilities share the intended light theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const title = page.getByRole('heading', { name: 'dotfield', exact: true });
  await expect(title).toHaveClass(/mantine-Title-root/);
  await expect(page.locator('main')).toHaveClass(/flex-col/);
  await expect(page.locator('html')).toHaveAttribute('data-mantine-color-scheme', 'light');
  expect(await title.evaluate((el) => ({
    size: getComputedStyle(el).fontSize,
    color: getComputedStyle(el).color,
  }))).toEqual({ size: '24px', color: 'rgb(37, 60, 51)' });
  const badge = page.getByText('Growth preview', { exact: true });
  await expect(badge).toBeVisible();
  expect(await badge.evaluate((el) => getComputedStyle(el).textTransform)).toBe('none');
  expect(await page.getByRole('img', { name: 'Territory board' })
    .evaluate((el) => getComputedStyle(el).borderRadius)).toBe('20px');
});
