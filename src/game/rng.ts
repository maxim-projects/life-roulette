export interface Rng {
  next(): number;
  intRange(minInclusive: number, maxInclusive: number): number;
  shuffle<T>(items: T[]): T[];
  toState(): number;
  fromState(state: number): void;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const nextValue = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next: () => nextValue(),
    intRange: (minInclusive, maxInclusive) =>
      minInclusive +
      Math.floor(nextValue() * (maxInclusive - minInclusive + 1)),
    shuffle: <T>(items: T[]): T[] => {
      for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(nextValue() * (index + 1));
        const current = items[index]!;
        items[index] = items[swapIndex]!;
        items[swapIndex] = current;
      }

      return items;
    },
    toState: () => state,
    fromState: (nextState) => {
      state = nextState >>> 0;
    },
  };
}
