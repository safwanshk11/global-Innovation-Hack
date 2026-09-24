import { test, expect } from '@playwright/test';
const id = '00000000-0000-4000-8000-000000000001';
const reportId = '00000000-0000-4000-8000-000000000002';
const issue = { id, title: 'Test pothole by gate 10', description: 'A small pothole at the test facility.', category: 'pothole', severity: 'low', status: 'open', corroborationCount: 1, estimatedAffectedPopulation: null, daysOpen: 0, location: { lat: 13.08, lng: 80.27, address: null, source: 'browser' }, reportedLanguages: ['ta', 'hi', 'en'], priorityScore: 11, priorityTier: 'low', priorityVersion: 'phase2-v1', createdAt: '2026-09-24T00:00:00Z', updatedAt: '2026-09-24T00:00:00Z', populationSource: null, matchingPolicyVersion: 'phase2-v1', reportCountMeaning: 'Linked reports count submissions, not verified unique people.', priorityExplanation: { priorityVersion: 'phase2-v1', calculatedAt: '2026-09-24T00:00:00Z', inputs: { severity: 'low', linkedReports: 1, ageDays: 0, population: null }, normalizedComponents: { severity: .2, corroboration: 0, age: 0 }, effectiveWeights: { severity: .45/.85, corroboration: .25/.85, age: .15/.85 }, weightedPoints: { severity: 10.588, corroboration: 0, age: 0 }, severityFloor: 0, severityFloorAdjustment: 0, roundingAdjustment: .412, finalScore: 11, omittedPopulationReason: 'No sourced population estimate is available.', limitations: 'Severity describes reported conditions.' } };
const list = { items: [issue], totalCount: 600, truncated: true, summary: { activeIssueCount: 600, criticalPriorityCount: 12, linkedReportCount: 901, averageDaysOpen: 2.4 }, calculatedAt: '2026-09-24T00:00:00Z' };
const receipt = (state = 'pending') => ({ report_id: reportId, status: 'received', created_at: '2026-09-24T00:00:00Z', processing_status: state, processing_updated_at: '2026-09-24T00:00:00Z', issue_id: state === 'complete' ? id : null, match_outcome: state === 'complete' ? 'created' : null, error_code: null, review_reasons: state === 'needs_review' ? ['approximate_location'] : [] });
test.beforeEach(async ({ page }) => {
  // Test-only transport: never contact Supabase or submit real media.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { detail: 'test default' } }));
  await page.route('**/*.tile.openstreetmap.org/**', route => route.abort());
});
test('queue uses server summary/filter, keeps selected issue and map through refresh, then shows stale data', async ({ page }) => {
  let unavailable = false;
  await page.route('**/api/issues?*', route => unavailable ? route.fulfill({ status: 503 }) : route.fulfill({ json: list }));
  await page.goto('/dashboard');
  await expect(page.getByText('600', { exact: true })).toBeVisible();
  await expect(page.getByText('Showing 1 of 600 issues.', { exact: false })).toBeVisible();
  const select = page.getByRole('button', { name: /Select Test pothole/ });
  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const tile = await page.locator('.leaflet-tile-pane').getAttribute('style');
  await page.getByRole('button', { name: 'Refresh issues' }).click();
  await expect(page.getByRole('button', { name: 'Refresh issues' })).toBeEnabled();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.leaflet-tile-pane').getAttribute('style')).toBe(tile);
  const request = page.waitForRequest(r => r.url().includes('category=water'));
  await page.getByLabel('Category', { exact: true }).selectOption('water');
  await request;
  await expect(select).toBeVisible();
  unavailable = true;
  await page.getByRole('button', { name: 'Refresh issues' }).click();
  await expect(page.getByText(/Showing the last saved view/)).toBeVisible();
  await expect(select).toBeVisible();
});
test('empty and failed initial requests stay distinct from fixtures', async ({ page }) => {
  await page.route('**/api/issues?*', route => route.fulfill({ json: { ...list, items: [], totalCount: 0, truncated: false, summary: { activeIssueCount: 0, criticalPriorityCount: 0, linkedReportCount: 0, averageDaysOpen: null } } }));
  await page.goto('/dashboard'); await expect(page.getByText('No issues found')).toBeVisible();
  await page.unroute('**/api/issues?*'); await page.reload();
  await expect(page.getByText(/Unable to load reported issues/)).toBeVisible();
  await expect(page.getByText('No issues found')).toHaveCount(0);
});
test('receipt polls then stops at complete, copy and refresh stay GET-only', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  let calls = 0, posts = 0, complete = false;
  page.on('request', r => { if (r.method() === 'POST') posts++; });
  await page.route('**/api/reports/*', route => { calls++; return route.fulfill({ json: receipt(complete ? 'complete' : 'pending') }); });
  await page.goto(`/report/success/${reportId}`);
  await expect(page.getByText('Waiting for analysis')).toBeVisible();
  complete = true;
  await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible({ timeout: 8000 });
  const completedCalls = calls;
  await page.waitForTimeout(2500); expect(calls).toBe(completedCalls);
  await page.getByRole('button', { name: 'Copy ID' }).click();
  await expect(page.getByText('Receipt ID copied.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reportId);
  await page.reload(); await expect(page.getByText('Analysis complete', { exact: true })).toBeVisible();
  expect(posts).toBe(0);
});
test('receipt waits at most about 90 seconds without marking saved report failed', async ({ page }) => {
  await page.clock.install();
  await page.route('**/api/reports/*', route => route.fulfill({ json: receipt() }));
  await page.goto(`/report/success/${reportId}`); await expect(page.getByText('Waiting for analysis')).toBeVisible();
  await page.clock.fastForward(91000);
  await expect(page.getByText(/Automatic checking has paused/)).toBeVisible();
  await expect(page.getByText('Waiting for analysis')).toBeVisible();
  await page.getByRole('button', { name: 'Check saved report status' }).click();
  await expect(page.getByText(/Automatic checking has paused/)).toHaveCount(0);
});
for (const [state, title] of [['needs_review', 'Review needed'], ['failed', "Analysis couldn't finish"], ['not_queued', 'Report saved']]) {
  test(`receipt terminal ${state} retains saved ID`, async ({ page }) => {
    let calls = 0;
    await page.route('**/api/reports/*', route => { calls++; return route.fulfill({ json: receipt(state) }); });
    await page.goto(`/report/success/${reportId}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.locator('code')).toHaveText(reportId);
    const count = calls; await page.waitForTimeout(2200); expect(calls).toBe(count);
  });
}
test('detail direct refresh, nullable fields, explanation retention and 404 versus outage', async ({ page }) => {
  let status = 200;
  await page.route('**/api/issues/*', route => route.fulfill({ status, json: status === 200 ? issue : { detail: 'Unavailable' } }));
  await page.goto(`/dashboard/issues/${id}`);
  await expect(page.getByText('Not estimated', { exact: true })).toBeVisible();
  await expect(page.getByText('Tamil, Hindi, English')).toBeVisible();
  await page.locator('summary').click();
  await page.getByRole('button', { name: 'Refresh issue' }).click();
  await expect(page.locator('details')).toHaveAttribute('open', '');
  status = 503; await page.reload(); await expect(page.getByText('Unable to load issue')).toBeVisible();
  status = 404; await page.reload(); await expect(page.getByText('Issue not found', { exact: true })).toBeVisible();
});
test('upload StrictMode sends one POST then opens saved receipt immediately; Back does not resubmit', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/reports', route => { posts++; return route.fulfill({ json: { report_id: reportId, status: 'received' } }); });
  await page.route('**/api/reports/*', route => route.fulfill({ json: receipt() }));
  await page.goto('/report');
  // Inject a test draft into the existing store, without camera/location permissions.
  await page.evaluate(async () => {
    const store = await import('/src/lib/reportDraftStore.ts');
    store.setReportDraft({ submissionId: 'test-stable-submission', audio: { blob: new Blob(['test'], { type: 'audio/webm' }), url: '', source: 'upload' }, photo: { file: new File(['test'], 'test.png', { type: 'image/png' }), url: '' }, location: { lat: 0, lng: 0, source: 'browser' } });
    // Drive the real React router through the form's submit-independent route.
    window.history.pushState({}, '', '/report/processing'); window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(`/report/success/${reportId}`);
  await expect(page.getByText('Report received', { exact: true })).toBeVisible();
  expect(posts).toBe(1); await page.goBack(); expect(posts).toBe(1);
});
for (const size of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`layout has no horizontal overflow at ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.route('**/api/issues?*', route => route.fulfill({ json: list }));
    await page.route('**/api/issues/*', route => route.fulfill({ json: issue }));
    for (const path of ['/dashboard', `/dashboard/issues/${id}`]) {
      await page.goto(path); await expect(page.getByText(issue.title, { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}
test('hidden tabs pause polling and resume with only one loop', async ({ page }) => {
  let calls = 0;
  await page.clock.install();
  await page.route('**/api/reports/*', route => { calls++; return route.fulfill({ json: receipt() }); });
  await page.goto(`/report/success/${reportId}`);
  await expect(page.getByText('Waiting for analysis')).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenCount = calls;
  await page.clock.fastForward(20000); expect(calls).toBe(hiddenCount);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => calls).toBe(hiddenCount + 1);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your voice can move a city.' })).toBeVisible();
  await expect(page.getByText('Waiting for analysis')).toHaveCount(0);
  const leftCount = calls; await page.clock.fastForward(20000); expect(calls).toBe(leftCount);
});
test('receipt outage retains last status and retries without POST', async ({ page }) => {
  let down = false, posts = 0;
  page.on('request', r => { if (r.method() === 'POST') posts++; });
  await page.route('**/api/reports/*', route => down ? route.fulfill({ status: 503 }) : route.fulfill({ json: receipt() }));
  await page.goto(`/report/success/${reportId}`); await expect(page.getByText('Waiting for analysis')).toBeVisible();
  down = true; await page.getByRole('button', { name: 'Check saved report status' }).click();
  await expect(page.getByText(/Connection interrupted/)).toBeVisible();
  await expect(page.getByText('Waiting for analysis')).toBeVisible();
  await expect(page.locator('code')).toHaveText(reportId);
  down = false; await page.getByRole('button', { name: 'Check saved report status' }).click();
  await expect(page.getByText(/Connection interrupted/)).toHaveCount(0); expect(posts).toBe(0);
});
test('capture isolated pending, review and outage layouts', async ({ page }) => {
  test.skip(!process.env.SCREENSHOT_DIR, 'Set SCREENSHOT_DIR to save isolated state screenshots.');
  let status = 'pending', down = false;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/reports/*', route => down ? route.fulfill({ status: 503 }) : route.fulfill({ json: receipt(status) }));
  await page.goto(`/report/success/${reportId}`); await expect(page.getByText('Waiting for analysis')).toBeVisible();
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/test-pending-390.png`, fullPage: true });
  status = 'needs_review'; await page.reload(); await expect(page.getByRole('heading', { name: 'Review needed' })).toBeVisible();
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/test-review-390.png`, fullPage: true });
  down = true; await page.getByRole('button', { name: 'Check saved report status' }).click();
  await expect(page.getByText(/Connection interrupted/)).toBeVisible();
  await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/test-outage-390.png`, fullPage: true });
});
