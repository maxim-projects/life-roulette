const { expect, test } = require('@playwright/test');

/**
 * Регрессия для бага "класс-секция не виден на телефоне":
 * 1. body { overflow: hidden } блокировал document scroll
 * 2. ShopScreen root не имел overflow handling
 * 3. На мобильном viewport (375x667) виден был только верх — chocolate + magnifier,
 *    а Спецназ/Двойник/Бог обрезались.
 *
 * Этот тест прогоняется на iPhone SE viewport и проверяет что ВСЕ 5 классов
 * можно реально доскроллить в магазине.
 */

test.use({ viewport: { width: 375, height: 667 } });

test.setTimeout(30000);

test('магазин на mobile viewport: все 5 классов доступны через scroll', async ({ page }) => {
  // Профиль с большим балансом, чтобы все классы были видны как "купить"
  await page.addInitScript(() => {
    const now = Date.now();
    localStorage.setItem(
      'life-roulette:profiles',
      JSON.stringify([
        {
          id: 'p-mobile',
          name: 'MobileTester',
          currency: 20000,
          inventory: { chocolate: 0, magnifier: 0, knife: 0 },
          ownedClasses: [],
          createdAt: now,
          lastUsed: now,
        },
      ]),
    );
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Магазин' }).click();

  // Класс-секция должна существовать в DOM
  await expect(page.getByRole('heading', { name: 'Классы (разовая покупка)' })).toBeAttached();

  // Каждый из 5 классов должен быть доступен — либо visible, либо scroll-into-view работает
  const classNames = ['Медик', 'Танк', 'Спецназ', 'Двойник', 'Бог'];

  for (const className of classNames) {
    const card = page.locator('div').filter({ hasText: className }).filter({ hasText: '₽' }).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
  }
});

test('магазин без профиля: класс-секция всё равно показана с подсказкой', async ({ page }) => {
  // Никаких профилей в localStorage
  await page.addInitScript(() => {
    localStorage.removeItem('life-roulette:profiles');
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Магазин' }).click();

  await expect(page.getByRole('heading', { name: 'Классы (разовая покупка)' })).toBeAttached();
  await expect(page.getByText('Создай профиль, чтобы покупать классы')).toBeAttached();

  // Все 5 классов должны быть в DOM (даже если кнопки disabled)
  for (const name of ['Медик', 'Танк', 'Спецназ', 'Двойник', 'Бог']) {
    await expect(page.getByText(name).first()).toBeAttached();
  }
});
