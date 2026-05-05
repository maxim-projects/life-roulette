# Рулетка Жизни

Семейный проект: пошаговая 3D-игра в стиле "русской рулетки с дробовиком" для веба. До 7 игроков на одном устройстве (hot-seat) или один игрок против бота.

Вдохновлено игрой *Buckshot Roulette* Майка Клубники, с авторскими дополнениями.

## Дизайн

Описание игры и архитектура: [docs/superpowers/specs/2026-04-30-life-roulette-design.md](docs/superpowers/specs/2026-04-30-life-roulette-design.md)

## Авторы

- Идея и геймдизайн: юный разработчик, 9-10 лет
- Помощь и техническая часть: папа
- AI-ассистент: Claude

## Статус

🟢 MVP + Phase 1.5a (классы персонажей) задеплоено.

## URL

https://oxi-717.github.io/life-roulette/

## Конвенции для разработки

### Layout: `.lr-screen` и `.lr-overlay`

`body { overflow: hidden }` блокирует скролл документа, поэтому **каждый top-level экран обязан сам управлять прокруткой**. Используй классы из `src/style.css`:

| Класс | Когда использовать | Пример |
|-------|---------------------|--------|
| `.lr-screen` | Обычный экран в потоке (Menu, Shop, ProfileSelect) | `<div class="lr-screen">…</div>` |
| `.lr-overlay` | Fullscreen overlay поверх игры (ClassSelect, PassDevice) | `<div class="lr-overlay">…</div>` |
| `.lr-screen-content` / `.lr-overlay-content` | Контент-обёртка внутри (max-width + margin auto) | вложенный `<div>` |

**НЕ** использовать `justify-content: center` по вертикали для прокручиваемых экранов — стандартный flexbox-баг, прячет верх контента когда он больше viewport. Вместо этого `flex-start` + `margin: auto` на content-обёртке.

### E2E mobile viewport tests

Новые экраны с переменным контентом обязательно покрываются e2e-тестом на iPhone SE viewport (375×667), который проверяет что все ключевые элементы доступны через `scrollIntoViewIfNeeded()`. Пример: `tests/e2e/shop-scroll-mobile.spec.cjs`.
