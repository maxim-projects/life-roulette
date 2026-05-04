import { ALL_CLASS_IDS, CLASS_PRICES } from '../game/classes';
import type { ClassId } from '../game/types';
import { CLASS_DESCRIPTIONS, CLASS_ICONS, CLASS_NAMES } from '../i18n';
import { createProfile, getProfile, listProfiles, updateProfile } from '../persistence/profiles';

export interface ShopScreenProps {
  onBack: () => void;
  onBuyClass?: (classId: ClassId) => void;
}

type ShopItemId = 'chocolate' | 'magnifier';

const ITEM_PRICES: Record<ShopItemId, number> = {
  chocolate: 50,
  magnifier: 50,
};

export function mountShopScreen(parent: HTMLElement, props: ShopScreenProps): { unmount: () => void } {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex:1;justify-content:center;padding:24px;';

  const panel = document.createElement('div');
  panel.style.cssText =
    'width:min(100%,720px);background:rgba(15,20,32,0.92);border:1px solid #31415d;border-radius:24px;padding:28px;';

  const title = document.createElement('h2');
  title.textContent = 'Магазин';
  title.style.cssText = 'font-size:30px;margin-bottom:10px;';

  const subtitle = document.createElement('p');
  subtitle.style.cssText = 'color:#c4d0ef;line-height:1.6;margin-bottom:18px;';

  const profileList = document.createElement('div');
  profileList.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;';

  const items = document.createElement('div');
  items.style.cssText = 'display:grid;gap:14px;';

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;';

  root.appendChild(panel);
  panel.append(title, subtitle, profileList, items, footer);
  parent.appendChild(root);

  let selectedProfileId: string | null = listProfiles()[0]?.id ?? null;

  const buy = (itemId: ShopItemId): void => {
    if (!selectedProfileId) {
      return;
    }

    const profile = getProfile(selectedProfileId);

    if (!profile) {
      return;
    }

    const price = ITEM_PRICES[itemId];
    const currentCount = profile.inventory[itemId] ?? 0;

    if (profile.currency < price || currentCount >= 5) {
      return;
    }

    updateProfile(profile.id, {
      currency: profile.currency - price,
      inventory: {
        ...profile.inventory,
        [itemId]: currentCount + 1,
      },
    });

    render();
  };

  const buyClass = (classId: ClassId): void => {
    if (!selectedProfileId) {
      return;
    }

    const profile = getProfile(selectedProfileId);

    if (!profile || profile.ownedClasses.includes(classId)) {
      return;
    }

    const price = CLASS_PRICES[classId];

    if (profile.currency < price) {
      return;
    }

    updateProfile(profile.id, {
      currency: profile.currency - price,
      ownedClasses: [...profile.ownedClasses, classId],
    });
    props.onBuyClass?.(classId);
    render();
  };

  const render = (): void => {
    const profiles = listProfiles();
    const currentProfile =
      (selectedProfileId ? getProfile(selectedProfileId) : null) ?? profiles[0] ?? null;
    selectedProfileId = currentProfile?.id ?? null;

    subtitle.textContent = currentProfile
      ? `${currentProfile.name} · ${currentProfile.currency} ₽`
      : 'Создай профиль, чтобы покупать предметы.';

    profileList.replaceChildren();
    items.replaceChildren();
    footer.replaceChildren();

    profiles.forEach((profile) => {
      const button = document.createElement('button');
      button.textContent = `${profile.name} · ${profile.currency} ₽`;
      button.style.cssText = [
        'padding:10px 14px;border:none;border-radius:14px;color:white;',
        profile.id === selectedProfileId ? 'background:#49658d;' : 'background:#24314b;',
      ].join('');
      button.onclick = () => {
        selectedProfileId = profile.id;
        render();
      };
      profileList.appendChild(button);
    });

    const itemConfigs: Array<{ id: ShopItemId; title: string; icon: string }> = [
      { id: 'chocolate', title: 'Шоколадка', icon: '🍫' },
      { id: 'magnifier', title: 'Лупа', icon: '🔍' },
    ];

    itemConfigs.forEach((item) => {
      const card = document.createElement('div');
      card.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px;border-radius:18px;background:#182236;border:1px solid #2d3b57;';

      const info = document.createElement('div');
      const heading = document.createElement('div');
      heading.textContent = `${item.icon} ${item.title}`;
      heading.style.cssText = 'font-size:18px;font-weight:700;margin-bottom:6px;';

      const details = document.createElement('div');
      const owned = currentProfile?.inventory[item.id] ?? 0;
      details.textContent = `Цена: ${ITEM_PRICES[item.id]} ₽ · В инвентаре: ${owned}/5`;
      details.style.cssText = 'color:#b9c7e7;';
      info.append(heading, details);

      const button = document.createElement('button');
      const disabledByCurrency = !currentProfile || currentProfile.currency < ITEM_PRICES[item.id];
      const disabledByLimit = (currentProfile?.inventory[item.id] ?? 0) >= 5;
      button.disabled = disabledByCurrency || disabledByLimit;
      button.textContent = disabledByLimit ? 'Максимум' : 'Купить';
      button.style.cssText = [
        'padding:12px 16px;border:none;border-radius:12px;color:white;',
        button.disabled ? 'background:#3b4358;opacity:0.6;' : 'background:#d4552d;',
      ].join('');
      button.onclick = () => buy(item.id);

      card.append(info, button);
      items.appendChild(card);
    });

    if (currentProfile) {
      const classSection = document.createElement('div');
      classSection.style.cssText = 'margin-top:24px;';

      const classTitle = document.createElement('h3');
      classTitle.textContent = 'Классы (разовая покупка)';
      classTitle.style.cssText = 'font-size:18px;margin-bottom:12px;';
      classSection.appendChild(classTitle);

      for (const classId of ALL_CLASS_IDS) {
        const owned = currentProfile.ownedClasses.includes(classId);
        const price = CLASS_PRICES[classId];
        const canAfford = currentProfile.currency >= price;

        const row = document.createElement('div');
        row.style.cssText =
          'display:flex;align-items:center;gap:12px;padding:12px;background:#1a1a2e;border-radius:8px;margin-bottom:8px;';

        const icon = document.createElement('span');
        icon.textContent = CLASS_ICONS[classId];
        icon.style.cssText = 'font-size:24px;';

        const text = document.createElement('div');
        text.style.cssText = 'flex:1;';
        const name = document.createElement('div');
        name.textContent = CLASS_NAMES[classId];
        name.style.cssText = 'font-weight:bold;';
        const description = document.createElement('div');
        description.textContent = CLASS_DESCRIPTIONS[classId];
        description.style.cssText = 'font-size:12px;color:#aaa;';
        text.append(name, description);

        const button = document.createElement('button');
        if (owned) {
          button.textContent = '✓ Куплено';
          button.disabled = true;
          button.style.cssText =
            'background:#2ecc71;color:white;border:none;padding:8px 16px;border-radius:6px;';
        } else {
          button.textContent = `${price} ₽`;
          button.disabled = !canAfford;
          button.style.cssText = [
            `background:${canAfford ? '#6c5ce7' : '#444'}`,
            'color:white',
            'border:none',
            'padding:8px 16px',
            'border-radius:6px',
            `cursor:${canAfford ? 'pointer' : 'not-allowed'}`,
          ].join(';');
          button.onclick = () => buyClass(classId);
        }

        row.append(icon, text, button);
        classSection.appendChild(row);
      }

      items.appendChild(classSection);
    }

    const createButton = document.createElement('button');
    createButton.textContent = 'Создать профиль';
    createButton.style.cssText =
      'padding:12px 16px;border:none;border-radius:14px;background:#31415d;color:white;';
    createButton.onclick = () => {
      const name = window.prompt('Имя профиля', 'Игрок')?.trim();
      if (!name) {
        return;
      }

      const profile = createProfile(name);
      selectedProfileId = profile.id;
      render();
    };

    const back = document.createElement('button');
    back.textContent = 'Назад';
    back.style.cssText =
      'padding:12px 16px;border:none;border-radius:14px;background:#121927;color:#a9bde8;';
    back.onclick = props.onBack;

    footer.append(createButton, back);
  };

  render();

  return { unmount: () => root.remove() };
}
