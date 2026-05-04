import type { ClassState, GameEvent, Player } from './types';

export type DamageSource = 'bullet' | 'lightning';

export interface ResolveDamageResult {
  finalDamage: number;
  updatedClassState: ClassState;
  events: GameEvent[];
}

export function resolveDamage(
  target: Player,
  baseDamage: number,
  source: DamageSource,
): ResolveDamageResult {
  const events: GameEvent[] = [];
  let damage = baseDamage;
  let classState: ClassState = { ...target.classState };

  if (damage <= 0) {
    return {
      finalDamage: 0,
      updatedClassState: classState,
      events,
    };
  }

  if (target.classId === 'tank' && source === 'bullet' && !classState.tankBlockUsed) {
    classState = { ...classState, tankBlockUsed: true };
    events.push({ type: 'tank-block-triggered', playerId: target.id });

    return {
      finalDamage: 0,
      updatedClassState: classState,
      events,
    };
  }

  if (target.classId === 'specops' && classState.armorActive) {
    damage /= 2;
    classState = { ...classState, armorChargesLeft: classState.armorChargesLeft - 1 };

    if (classState.armorChargesLeft <= 0) {
      classState = { ...classState, armorActive: false };
      events.push({ type: 'armor-broke', playerId: target.id });
    }
  }

  return {
    finalDamage: damage,
    updatedClassState: classState,
    events,
  };
}
