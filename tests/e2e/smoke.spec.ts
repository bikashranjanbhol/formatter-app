import { test, expect } from '@playwright/test';

test.describe('JSON & YAML Workbench smoke tests', () => {
  test('home page renders and links to tools', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/JSON/i);
    await expect(page.getByRole('link', { name: /Format JSON/i }).first()).toBeVisible();
  });

  test('JSON formatter formats a document locally', async ({ page }) => {
    await page.goto('/json-formatter');
    // The privacy indicator is always present.
    await expect(page.getByRole('link', { name: /Processed locally/i })).toBeVisible();
    // Wait for the lazy editor to mount and hydrate before typing.
    const editor = page.locator('.cm-content').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('{"b":2,"a":1}');
    await page.getByRole('button', { name: /^Format/ }).click();
    // The status bar should report a valid document (● Valid badge).
    await expect(page.getByText('● Valid')).toBeVisible();
    // The formatted output should appear in the read-only output editor.
    await expect(page.locator('.cm-content').nth(1)).toContainText('"b": 2');
  });

  test('JSON validator reports an error location', async ({ page }) => {
    await page.goto('/json-validator');
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('{ "a": 1, }');
    await page.getByRole('button', { name: /Validate/ }).click();
    await expect(page.getByText(/error/i).first()).toBeVisible();
  });

  test('YAML to JSON conversion warns about lossy features', async ({ page }) => {
    await page.goto('/yaml-to-json');
    await page.getByRole('button', { name: /sample/i }).click();
    await page.getByRole('button', { name: /Convert to JSON/ }).click();
    // The sample uses anchors/aliases and comments, so warnings should show.
    await expect(page.getByText(/warning/i).first()).toBeVisible();
  });

  test('mobile layout exposes input/output tabs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/json-formatter');
    await expect(page.getByRole('tab', { name: 'Input' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Output/ })).toBeVisible();
  });

  test('theme can be switched to dark', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /dark theme/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('JSON viewer renders an interactive tree with working toggles', async ({ page }) => {
    await page.goto('/json-viewer');
    // Wait for the lazy editor to mount and hydrate before interacting.
    await expect(page.locator('.cm-content').first()).toBeVisible();
    await page.getByRole('button', { name: /load sample/i }).click();
    // Wait for the sample to reach the editor before building.
    await expect(page.locator('.cm-content').first()).toContainText('maxFileMb');
    await page.getByRole('button', { name: /build tree/i }).click();
    // Scope assertions to the interactive tree (the input editor also has text).
    const tree = page.getByRole('tree', { name: 'Document tree' });
    await expect(tree.getByText('product', { exact: true })).toBeVisible();
    await expect(tree.getByText('maxFileMb', { exact: true })).toBeVisible();
    // Collapse all hides nested children.
    await page.getByRole('button', { name: /collapse all/i }).click();
    await expect(tree.getByText('maxFileMb', { exact: true })).toHaveCount(0);
    // Expanding the "limits" branch brings it back.
    await page.getByRole('button', { name: /expand limits/i }).click();
    await expect(tree.getByText('maxFileMb', { exact: true })).toBeVisible();
  });

  test('JSON anonymizer masks values locally', async ({ page }) => {
    await page.goto('/json-anonymizer');
    const editor = page.locator('.cm-content').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('{"email":"real@company.com","age":41}');
    await page.getByRole('button', { name: /^Anonymize/ }).click();
    // Output should no longer contain the real email, and status goes valid.
    const output = page.locator('.cm-content').nth(1);
    await expect(output).toContainText('example.com');
    await expect(output).not.toContainText('real@company.com');
    await expect(page.getByText('● Valid')).toBeVisible();
  });

  test('landing page shows the demo and trust bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /messy in, clean out/i })).toBeVisible();
    await expect(page.getByText('bytes uploaded to a server')).toBeVisible();
  });

  test('open graph image is generated as a PNG', async ({ page, request }) => {
    await page.goto('/json-formatter');
    // Next serves the OG image at a hashed path referenced in the meta tag.
    const ogUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogUrl).toBeTruthy();
    // The meta URL uses the configured site origin; fetch just the path+query
    // so it resolves against the test server's baseURL.
    const { pathname, search } = new URL(ogUrl!);
    const res = await request.get(`${pathname}${search}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('health endpoint responds ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
