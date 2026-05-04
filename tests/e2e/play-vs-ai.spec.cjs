const { expect, test } = require('@playwright/test');

test.setTimeout(60000);

test('happy path: vs AI returns visible winner screen', async ({ page }) => {
  const winnerHeading = page.getByRole('heading', { name: /Победил/ });

  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'vs компьютер' }).click();
  await page.getByRole('button', { name: 'Гость' }).click();
  await page.locator('div').filter({ hasText: 'Без класса' }).first().click();

  await expect(page.getByRole('button', { name: 'Стрелять' })).toBeVisible({
    timeout: 30000,
  });

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await winnerHeading.isVisible().catch(() => false)) {
      break;
    }

    const shootButton = page.getByRole('button', { name: 'Стрелять' }).first();
    if (
      (await shootButton.count()) > 0 &&
      (await shootButton.isVisible())
    ) {
      const clickedShoot = await shootButton
        .click({ timeout: 500 })
        .then(() => true)
        .catch(() => false);

      if (!clickedShoot) {
        await page.waitForTimeout(150);
        continue;
      }

      const targetButton = page
        .locator('button')
        .filter({ hasText: /^(Bot|Гость)$/ })
        .first();

      if ((await targetButton.count()) > 0 && (await targetButton.isVisible())) {
        await targetButton.click();
      }

      if (await winnerHeading.isVisible().catch(() => false)) {
        break;
      }

      const confirmButton = page
        .locator('button:not([disabled])')
        .filter({ hasText: /^Стрелять$/ })
        .last();

      if ((await confirmButton.count()) > 0 && (await confirmButton.isVisible())) {
        await confirmButton.click({ timeout: 1000 }).catch(() => {});
      }
    }

    if (await winnerHeading.isVisible().catch(() => false)) {
      break;
    }

    await page.waitForTimeout(150);
  }

  await expect(winnerHeading).toBeVisible({ timeout: 60000 });
});
