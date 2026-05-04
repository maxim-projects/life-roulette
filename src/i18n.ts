import type { ClassId } from './game/types';

export const CLASS_NAMES: Record<ClassId, string> = {
  medic: 'Медик',
  tank: 'Танк',
  specops: 'Спецназ',
  double: 'Двойник',
  god: 'Бог',
};

export const CLASS_ICONS: Record<ClassId, string> = {
  medic: '🩺',
  tank: '🛡',
  specops: '🎯',
  double: '🤺',
  god: '⚡',
};

export const CLASS_DESCRIPTIONS: Record<ClassId, string> = {
  medic: 'Шоколадка восстанавливает +3 жизни',
  tank: 'Один раз за игру блокирует боевой выстрел',
  specops: 'Стартует в броне (3 раунда / 3 хита, урон ÷2)',
  double: 'Старт с 5 жизнями + нож (1× за игру 2× урон)',
  god: 'Молния: 1 урон, 1 раз/раунд, 4 раза за игру',
};

export const CLASS_NONE = 'Без класса';
