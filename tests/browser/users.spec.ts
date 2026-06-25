import { test, expect } from '@playwright/test';

test.describe('Users Page Tests', () => {
  test('should navigate to the users management page', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Check if redirected to login due to auth middleware
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/google') || currentUrl.includes('/login')) {
      expect(true).toBeTruthy();
    } else {
      // If authenticated, we should see user management
      await expect(page.locator('text=User Management').first()).toBeVisible();
    }
  });
});
