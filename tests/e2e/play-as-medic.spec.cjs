const { expect, test } = require('@playwright/test');

test.setTimeout(60000);

test('vs AI as Medic — playthrough', async ({ page }) => {
  await page.addInitScript(() => {
    const now = Date.now();
    const profiles = [
      {
        id: 'p1',
        name: 'Tester',
        currency: 1000,
        inventory: { chocolate: 0, magnifier: 0, knife: 0 },
        ownedClasses: ['medic'],
        createdAt: now,
        lastUsed: now,
      },
    ];

    localStorage.setItem('life-roulette:profiles', JSON.stringify(profiles));
  });

  const winnerHeading = page.getByRole('heading', { name: /Победил/ });

  await page.goto('/');
  await page.getByRole('button', { name: 'Играть' }).click();
  await page.getByRole('button', { name: 'vs компьютер' }).click();
  await page.getByRole('button', { name: /Tester/ }).click();
  await page.locator('div').filter({ hasText: 'Медик' }).first().click();

  await expect(page.getByRole('button', { name: 'Стрелять' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('text=❤').first()).toBeVisible({ timeout: 30000 });

  for (let attempt = 0; attempt < 200; attempt += 1) {
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
        .filter({ hasText: /^(Bot|Tester)$/ })
        .first();

      if ((await targetButton.count()) > 0 && (await targetButton.isVisible())) {
        await targetButton.click();
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
