import { test, expect } from '@playwright/test'

/**
 * Phase 0 — Hash Routing Validation
 *
 * This test confirms that the /#/spike route loads correctly and
 * survives a page reload (simulating a hard-refresh on GitHub Pages).
 */

test.describe('Hash routing', () => {
    test('home page loads at /#/', async ({ page }) => {
        await page.goto('/#/')
        await expect(page).toHaveTitle(/AnansiWriter/)
        await expect(page.locator('h1')).toContainText('AnansiWriter')
    })

    test('spike page loads at /#/spike', async ({ page }) => {
        await page.goto('/#/spike')
        await expect(page.locator('h1')).toContainText('Phase 0')
        // Route detection inside the page
        await expect(page.locator('.route-info')).toContainText('/spike')
    })

    test('spike route survives page reload', async ({ page }) => {
        await page.goto('/#/spike')
        await page.waitForLoadState('domcontentloaded')
        // Simulate hard refresh
        await page.reload()
        await expect(page.locator('h1')).toContainText('Phase 0')
        await expect(page.locator('.route-info')).toContainText('/spike')
    })

    test('navigating to deeply nested hash route does not 404', async ({ page }) => {
        // Playwright will report a failed navigation if a 404 is returned.
        // With hash routing the server always serves index.html, so no 404.
        const response = await page.goto('/#/writing/scene/abc-123')
        expect(response?.status()).not.toBe(404)
        // App shell should still render (even if the route isn't matched yet)
        await expect(page.locator('#root')).not.toBeEmpty()
    })
})
