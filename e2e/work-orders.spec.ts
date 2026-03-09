import { test, expect } from '@playwright/test';

test.describe('Work Orders Timeline', () => {
  test.beforeEach(async ({ page }) => {
    // start clean to avoid localStorage affecting tests
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Delete removes a work order bar', async ({ page }) => {
    // pick a known sample docId from sample data
    const bar = page.getByTestId('wo-bar-wo_1001');
    await expect(bar).toBeVisible();

    // open menu
    await bar.hover();
    await bar.getByTestId('wo-menu-btn').click();
    await bar.getByTestId('wo-menu-delete').click();

    await expect(bar).toHaveCount(0);
  });

  test('Edit opens drawer and saves changes', async ({ page }) => {
    const bar = page.getByTestId('wo-bar-wo_1002');
    await expect(bar).toBeVisible();

    await bar.hover();
    await bar.getByTestId('wo-menu-btn').click();
    await bar.getByTestId('wo-menu-edit').click();

    const drawer = page.getByTestId('drawer');
    await expect(drawer).toBeVisible();

    const name = page.getByTestId('drawer-name');
    await name.fill('Updated WO Name');

    await page.getByTestId('drawer-submit').click();
    await expect(drawer).toHaveCount(0);

    // bar should reflect updated name
    await expect(bar).toContainText('Updated WO Name');
  });

  test('Create: click empty timeline row opens drawer and creates a bar', async ({ page }) => {
    // click empty timeline area for a center
    const row = page.getByTestId('timeline-row-wc_packaging');
    await row.click({ position: { x: 40, y: 10 } });

    await expect(page.getByTestId('drawer')).toBeVisible();

    await page.getByTestId('drawer-name').fill('New Packaging Order');

    // submit create
    await page.getByTestId('drawer-submit').click();
    await expect(page.getByTestId('drawer')).toHaveCount(0);

    // We can't know docId; assert by text content inside any bar
    await expect(page.locator('.wo-bar', { hasText: 'New Packaging Order' })).toBeVisible();
  });

  test('Overlap validation blocks save and shows error', async ({ page }) => {
    // Create in extrusion center overlapping the sample 2025-01-02..2025-01-10
    const row = page.getByTestId('timeline-row-wc_extrusion_a');
    await row.click({ position: { x: 20, y: 10 } }); // opens drawer

    await expect(page.getByTestId('drawer')).toBeVisible();
    await page.getByTestId('drawer-name').fill('Overlapping Order');

    // Set dates via typed text isn't supported because date inputs are readonly.
    // Instead: we intentionally rely on default prefilled date potentially overlapping.
    // To ensure overlap deterministically, edit an existing one instead:
    await page.getByTestId('drawer-cancel').click();

    // Open existing order edit and set same range (should overlap if we move it onto another existing in same center)
    const bar = page.getByTestId('wo-bar-wo_1002');
    await bar.hover();
    await bar.getByTestId('wo-menu-btn').click();
    await bar.getByTestId('wo-menu-edit').click();

    // Change start/end to overlap wo_1001 range (2025-01-02..2025-01-10).
    // We’ll use the datepicker UI:
    // Open start datepicker
    const startInput = page.locator('input[formcontrolname="start"]');
    await startInput.click();

    // Pick Jan 5, 2025 in datepicker (ngb-datepicker renders buttons with text)
    await page.getByRole('button', { name: '5' }).first().click();

    // Open end datepicker
    const endInput = page.locator('input[formcontrolname="end"]');
    await endInput.click();
    await page.getByRole('button', { name: '8' }).first().click();

    await page.getByTestId('drawer-submit').click();

    await expect(page.getByTestId('drawer-submit-error')).toBeVisible();
    await expect(page.getByTestId('drawer-submit-error')).toContainText('cannot overlap');
  });
});
