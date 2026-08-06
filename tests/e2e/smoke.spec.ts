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

  test('suggested fixes repair invalid JSON only when accepted', async ({ page }) => {
    await page.goto('/json-validator');
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type("{ name: 'Ada', }");

    const panel = page.getByLabel('Suggested fixes');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Remove trailing commas');
    await expect(panel).toContainText('Quote unquoted keys');
    await expect(panel).toContainText('Applying these makes the document valid');

    // Nothing is changed until the user accepts.
    await expect(editor).toContainText("name: 'Ada'");

    await panel.getByRole('button', { name: /Apply fixes/ }).click();
    await expect(editor).toContainText('"name": "Ada"');
    await expect(page.getByText('● Valid')).toBeVisible();
    await expect(panel).toBeHidden();
  });

  test('suggested fixes leave string contents alone', async ({ page }) => {
    await page.goto('/json-validator');
    const editor = page.locator('.cm-content');
    await expect(editor).toBeVisible();
    await editor.click();
    // The URL contains // and the note contains a comma — a naive repair would
    // destroy both.
    await page.keyboard.type('{ "url": "https://a.dev", "note": "x, y,", }');

    await page
      .getByLabel('Suggested fixes')
      .getByRole('button', { name: /Apply fix/ })
      .click();
    await expect(editor).toContainText('https://a.dev');
    await expect(editor).toContainText('x, y,');
    await expect(page.getByText('● Valid')).toBeVisible();
  });

  test('pasting the wrong format suggests the right tool', async ({ page }) => {
    await page.goto('/json-formatter');
    const editor = page.locator('.cm-content').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('service: checkout\nreplicas: 3\nregion: eu-west-1');

    const hint = page.getByText(/This looks like/);
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('YAML');
    await expect(page.getByRole('link', { name: /Open the YAML Formatter/ })).toBeVisible();

    // The suggestion can be dismissed and stays out of the way.
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(hint).toBeHidden();
  });

  test('no format suggestion appears for the expected format', async ({ page }) => {
    await page.goto('/json-formatter');
    const editor = page.locator('.cm-content').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('{"service":"checkout","replicas":3}');
    await page.getByRole('button', { name: /^Format/ }).click();
    await expect(page.getByText('● Valid')).toBeVisible();
    await expect(page.getByText(/This looks like/)).toBeHidden();
  });

  test('formatting settings are shareable via the URL', async ({ page }) => {
    // A settings link opens the tool configured as its author intended.
    await page.goto('/json-formatter?indent=4&sort=1');
    const editor = page.locator('.cm-content').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('{"b":2,"a":1}');
    await page.getByRole('button', { name: /^Format/ }).click();

    const output = page.locator('.cm-content').nth(1);
    await expect(output).toContainText('    "a": 1');
    // sort=1 was honoured, so "a" precedes "b".
    await expect(output).toContainText(/"a": 1[\s\S]*"b": 2/);
  });

  test('changing a setting updates the URL, and never carries the document', async ({ page }) => {
    await page.goto('/json-formatter');
    await expect(page.locator('.cm-content').first()).toBeVisible();
    await page.locator('.cm-content').first().click();
    await page.keyboard.type('{"secret":"do-not-share"}');

    await page.getByLabel('Indent').selectOption('tab');
    await expect(page).toHaveURL(/indent=tab/);
    expect(page.url()).not.toContain('secret');
    expect(page.url()).not.toContain('do-not-share');
  });

  test('presets switch formatting settings in one click', async ({ page }) => {
    await page.goto('/json-formatter');
    await expect(page.locator('.cm-content').first()).toBeVisible();

    await page.getByLabel('Preset').selectOption('Four-space');
    await expect(page.getByLabel('Indent')).toHaveValue('four-space');

    await page.getByLabel('Preset').selectOption('Tabs');
    await expect(page.getByLabel('Indent')).toHaveValue('tab');
    await expect(page).toHaveURL(/indent=tab/);
  });

  test('a custom preset can be saved and reselected', async ({ page }) => {
    await page.goto('/json-formatter');
    await expect(page.locator('.cm-content').first()).toBeVisible();

    await page.getByLabel('Indent').selectOption('four-space');
    await page.getByLabel('Line endings').selectOption('crlf');
    await page.getByRole('button', { name: 'Save as…' }).click();
    await page.getByLabel('Preset name').fill('Team style');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByLabel('Preset')).toHaveValue('Team style');

    // Switch away and back again.
    await page.getByLabel('Preset').selectOption('Tabs');
    await expect(page.getByLabel('Indent')).toHaveValue('tab');
    await page.getByLabel('Preset').selectOption('Team style');
    await expect(page.getByLabel('Indent')).toHaveValue('four-space');
    await expect(page.getByLabel('Line endings')).toHaveValue('crlf');
  });

  test('JSON diff compares two documents structurally', async ({ page }) => {
    await page.goto('/json-diff');
    await expect(page.locator('.cm-content').first()).toBeVisible();

    await page.locator('.cm-content').nth(0).click();
    await page.keyboard.type('{"a":1,"b":2}');
    await page.locator('.cm-content').nth(1).click();
    await page.keyboard.type('{"a":9,"c":3}');
    await page.getByRole('button', { name: /^Compare/ }).click();

    const summary = page.getByLabel('Difference summary');
    await expect(summary).toContainText('1 added');
    await expect(summary).toContainText('1 removed');
    await expect(summary).toContainText('1 changed');

    // The generated JSON Patch is available and correct.
    await page.getByRole('button', { name: 'Patch', exact: true }).click();
    const patch = page.locator('.cm-content').nth(2);
    await expect(patch).toContainText('"op": "replace"');
    await expect(patch).toContainText('"path": "/a"');
  });

  test('JSON diff ignores formatting and key order', async ({ page }) => {
    await page.goto('/json-diff');
    await expect(page.locator('.cm-content').first()).toBeVisible();

    await page.locator('.cm-content').nth(0).click();
    await page.keyboard.type('{"a":1,"b":2}');
    await page.locator('.cm-content').nth(1).click();
    await page.keyboard.type('{"b":2,   "a":1}');
    await page.getByRole('button', { name: /^Compare/ }).click();

    await expect(page.getByText('✓ The documents are identical.')).toBeVisible();
  });

  test('YAML diff reports a changed value and offers a patch', async ({ page }) => {
    await page.goto('/yaml-diff');
    await expect(page.locator('.cm-content').first()).toBeVisible();

    await page.getByRole('button', { name: /sample/i }).click();
    await page.getByRole('button', { name: /^Compare/ }).click();

    // The samples differ in version, replicas, limits, region, and owner.
    await expect(page.getByLabel('Difference summary')).toContainText('changed');
    await expect(page.getByRole('tree', { name: /comparison/i })).toContainText('replicas');
  });

  test('diff mobile layout exposes the three panels', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/json-diff');
    await expect(page.getByRole('tab', { name: 'left' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'right' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Differences' })).toBeVisible();
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
