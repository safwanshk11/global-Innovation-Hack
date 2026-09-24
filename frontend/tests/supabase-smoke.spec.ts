import { test, expect } from '@playwright/test';
test('read-only real API smoke and screenshots', async ({ page }) => {
  test.skip(!process.env.LIVE_ISSUE_ID || !process.env.LIVE_REPORT_ID || !process.env.SCREENSHOT_DIR, 'Explicit real test IDs and output directory required.');
  // The isolated Vite server uses another port; relay GET responses only.
  await page.route('**/api/**', async route => {
    if (route.request().method() !== 'GET') throw new Error('Read-only smoke test');
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/dashboard');
  const link = page.locator(`a[href="/dashboard/issues/${process.env.LIVE_ISSUE_ID}"]`).first();
  await expect(link).toBeVisible();
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/live-dashboard-1440.png`, fullPage: true });
  await link.click(); await expect(page.locator('summary')).toBeVisible(); await page.locator('summary').click();
  await expect(page.getByRole('table', { name: 'Priority components' })).toBeVisible();
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/live-detail-1440.png`, fullPage: true });
  await page.reload(); await expect(page.locator('summary')).toBeVisible();
  await page.goto(`/report/success/${process.env.LIVE_REPORT_ID}`);
  await expect(page.getByRole('link', { name: 'View linked issue' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/live-receipt-390.png`, fullPage: true });
});
