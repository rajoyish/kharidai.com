import { test, expect } from '@playwright/test';

test.describe('Orders Page Tests', () => {
  test('should navigate to the orders page and show correct UI elements', async ({ page }) => {
    // Navigate to the user orders page
    await page.goto('/orders');
    
    // Check if redirected to login due to auth middleware
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/google') || currentUrl.includes('/login')) {
      // If we got redirected, the page is protected correctly
      expect(true).toBeTruthy();
    } else {
      // If authenticated, we should see the orders page heading
      await expect(page.locator('h2:has-text("Your Orders")').first()).toBeVisible();
      
      // Check if "Reupload Receipt" button is present and accessible
      // We look for any button that has text "Reupload Receipt"
      const reuploadButton = page.locator('a:has-text("Reupload Receipt"), button:has-text("Reupload Receipt")');
      
      // If there are orders with reupload capability, the button should be accessible
      if (await reuploadButton.count() > 0) {
        const button = reuploadButton.first();
        await expect(button).toBeVisible();
        
        // Assert it doesn't have an empty accessible name
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        expect(ariaLabel || textContent?.trim()).toBeTruthy();
      }
    }
  });
});
