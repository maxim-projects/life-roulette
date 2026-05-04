import type { ItemId } from '../game/types';
import { createProfile, listProfiles } from '../persistence/profiles';

export interface SelectedProfile {
  profileId: string | null;
  name: string;
  inventory: Record<ItemId, number>;
  currency: number;
}

export interface ProfileSelectProps {
  onSelect?: (profile: SelectedProfile) => void;
  onAllSelected?: (profiles: SelectedProfile[]) => void;
  multi?: number;
  onBack?: () => void;
}

function toSelectedProfile(profile: {
  id: string;
  name: string;
  inventory: Record<ItemId, number>;
  currency: number;
}): SelectedProfile {
  return {
    profileId: profile.id,
    name: profile.name,
    inventory: profile.inventory,
    currency: profile.currency,
  };
}

export function mountProfileSelect(
  parent: HTMLElement,
  props: ProfileSelectProps,
): { unmount: () => void } {
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex:1;justify-content:center;padding:24px;';

  const panel = document.createElement('div');
  panel.style.cssText =
    'width:min(100%,640px);background:rgba(15,20,32,0.92);border:1px solid #31415d;border-radius:24px;padding:28px;';

  const title = document.createElement('h2');
  title.style.cssText = 'font-size:30px;margin-bottom:12px;text-align:center;';

  const hint = document.createElement('p');
  hint.style.cssText = 'color:#c4d0ef;line-height:1.6;text-align:center;margin-bottom:20px;';

  const list = document.createElement('div');
  list.style.cssText = 'display:grid;gap:12px;';

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:20px;';

  root.appendChild(panel);
  panel.append(title, hint, list, footer);
  parent.appendChild(root);

  const total = Math.max(1, props.multi ?? 1);
  const chosen: SelectedProfile[] = [];

  const selectEntry = (entry: SelectedProfile): void => {
    if (total === 1) {
      props.onSelect?.(entry);
      return;
    }

    chosen.push(entry);

    if (chosen.length >= total) {
      props.onAllSelected?.(chosen);
      return;
    }

    render();
  };

  const createGuest = (): SelectedProfile => ({
    profileId: null,
    name: total === 1 ? 'Гость' : `Гость ${chosen.length + 1}`,
    inventory: { chocolate: 0, magnifier: 0 },
    currency: 0,
  });

  const createNewProfile = (): void => {
    const defaultName = total === 1 ? 'Игрок' : `Игрок ${chosen.length + 1}`;
    const name = window.prompt('Имя профиля', defaultName)?.trim();

    if (!name) {
      return;
    }

    const profile = createProfile(name);
    selectEntry(toSelectedProfile(profile));
  };

  const render = (): void => {
    const profiles = listProfiles();
    const usedIds = new Set(
      chosen
        .map((profile) => profile.profileId)
        .filter((profileId): profileId is string => profileId !== null),
    );

    title.textContent =
      total === 1
        ? 'Выбери профиль'
        : `Игрок ${chosen.length + 1} из ${total}`;
    hint.textContent =
      total === 1
        ? 'Можно взять существующий профиль, создать новый или играть гостем.'
        : `Уже выбрано: ${chosen.map((profile) => profile.name).join(', ') || 'никого'}.`;

    list.replaceChildren();
    footer.replaceChildren();

    profiles
      .filter((profile) => !usedIds.has(profile.id))
      .forEach((profile) => {
        const button = document.createElement('button');
        button.textContent = `${profile.name} · ${profile.currency} ₽`;
        button.style.cssText =
          'padding:16px;border:none;border-radius:16px;background:#22314a;color:white;text-align:left;';
        button.onclick = () => selectEntry(toSelectedProfile(profile));
        list.appendChild(button);
      });

    if (profiles.length === 0 || list.childElementCount === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Пока нет доступных профилей.';
      empty.style.cssText = 'color:#9db2df;text-align:center;padding:16px 0;';
      list.appendChild(empty);
    }

    const createButton = document.createElement('button');
    createButton.textContent = 'Создать новый профиль';
    createButton.style.cssText =
      'padding:12px 16px;border:none;border-radius:14px;background:#31415d;color:white;';
    createButton.onclick = createNewProfile;

    const guestButton = document.createElement('button');
    guestButton.textContent = 'Гость';
    guestButton.style.cssText =
      'padding:12px 16px;border:none;border-radius:14px;background:#1b2234;color:#d8e1fa;';
    guestButton.onclick = () => selectEntry(createGuest());

    footer.append(createButton, guestButton);

    if (props.onBack) {
      const back = document.createElement('button');
      back.textContent = 'Назад';
      back.style.cssText =
        'padding:12px 16px;border:none;border-radius:14px;background:#121927;color:#9eb4e0;';
      back.onclick = props.onBack;
      footer.appendChild(back);
    }
  };

  render();

  return { unmount: () => root.remove() };
}
