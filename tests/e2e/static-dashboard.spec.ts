import { expect, test } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('renders the sample static dashboard from file URL', async ({ page }) => {
  const fileUrl = pathToFileURL(path.resolve('dist-sample/index.html')).href;

  await page.goto(fileUrl);

  await expect(page.getByRole('heading', { name: 'Local AI Usage Dashboard' })).toBeVisible();
  await expect(page.getByText('Lifetime Tokens').first()).toBeVisible();
  await expect(page.getByText('21.43M').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download Markdown Report' })).toBeVisible();
  await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

  await page.getByRole('button', { name: 'Sources' }).click();
  await expect(page.getByRole('heading', { name: 'Usage By Source' })).toBeVisible();
  await expect(page.getByText('Supported ccusage Sources')).toBeVisible();

  await page.getByRole('button', { name: 'Models' }).click();
  await expect(page.getByRole('heading', { name: 'Top Models' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Model By Source' })).toBeVisible();
});
