import type { ClassId } from '../game/types';
import {
  CLASS_DESCRIPTIONS,
  CLASS_ICONS,
  CLASS_NAMES,
  CLASS_NONE,
} from '../i18n';

export interface ClassSelectScreenProps {
  playerName: string;
  ownedClasses: ClassId[];
  onSelected: (classId: ClassId | null) => void;
}

export function mountClassSelectScreen(
  parent: HTMLElement,
  props: ClassSelectScreenProps,
): { unmount: () => void } {
  const root = document.createElement('div');
  root.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:#0a0a14',
    'color:#e8e8f0',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'padding:20px',
    'z-index:500',
    'overflow-y:auto',
  ].join(';');

  const title = document.createElement('h2');
  title.textContent = `${props.playerName}, выбери класс`;
  title.style.cssText = 'font-size:24px;margin-bottom:24px;text-align:center;';
  root.appendChild(title);

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:12px;width:100%;max-width:400px;';

  const makeCard = (
    classId: ClassId | null,
    label: string,
    icon: string,
    description: string,
  ): HTMLDivElement => {
    const card = document.createElement('div');
    card.style.cssText = [
      'background:#1a1a2e',
      'border:2px solid #444',
      'border-radius:12px',
      'padding:16px',
      'cursor:pointer',
      'display:flex',
      'align-items:center',
      'gap:16px',
      'min-height:80px',
    ].join(';');
    card.onmouseenter = () => {
      card.style.borderColor = '#6c5ce7';
    };
    card.onmouseleave = () => {
      card.style.borderColor = '#444';
    };
    card.onclick = () => {
      props.onSelected(classId);
    };

    const iconElement = document.createElement('div');
    iconElement.textContent = icon;
    iconElement.style.cssText = 'font-size:36px;flex-shrink:0;';

    const textWrap = document.createElement('div');
    const nameElement = document.createElement('div');
    nameElement.textContent = label;
    nameElement.style.cssText = 'font-weight:bold;font-size:18px;margin-bottom:4px;';
    const descriptionElement = document.createElement('div');
    descriptionElement.textContent = description;
    descriptionElement.style.cssText = 'font-size:14px;color:#aaa;';
    textWrap.append(nameElement, descriptionElement);

    card.append(iconElement, textWrap);

    return card;
  };

  list.appendChild(makeCard(null, CLASS_NONE, '⚪', 'Стандартные правила'));

  for (const classId of props.ownedClasses) {
    list.appendChild(
      makeCard(
        classId,
        CLASS_NAMES[classId],
        CLASS_ICONS[classId],
        CLASS_DESCRIPTIONS[classId],
      ),
    );
  }

  root.appendChild(list);
  parent.appendChild(root);

  return {
    unmount: () => root.remove(),
  };
}
