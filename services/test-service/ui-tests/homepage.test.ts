import { test, expect } from '@playwright/test';
import type { Page } from './types';

test.describe('HomePage', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto('/');
    // Wait for page to load fully
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  });

  test('should display the homepage title', async ({ page }: { page: Page }) => {
    const title = await page.locator('h1:has-text("SuperLive")');
    await expect(title, 'Homepage title should be visible').toBeVisible({ timeout: 5000 });
  });

  test('should render upload area', async ({ page }: { page: Page }) => {
    const uploadSection = await page.locator('section', { hasText: 'Upload Video' });
    await expect(uploadSection, 'Upload section should be visible').toBeVisible({ timeout: 5000 });
    
    const uploadButton = await uploadSection.locator('button:has-text("Select Video")');
    await expect(uploadButton, 'Upload button should be visible').toBeVisible({ timeout: 5000 });
  });

  test('should render videos section', async ({ page }: { page: Page }) => {
    const videosSection = await page.locator('section', { hasText: 'Your Videos' });
    await expect(videosSection, 'Videos section should be visible').toBeVisible({ timeout: 5000 });
  });
}); 