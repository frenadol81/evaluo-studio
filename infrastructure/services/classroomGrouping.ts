export type SupportRole = 'needs-support' | 'can-help' | 'independent';
export type GroupingPupil = { id: string; role?: SupportRole };
export type GroupingDesk = { pupils: string[]; capacity: number; locked?: boolean };

const pairKey = (a: string, b: string) => JSON.stringify(a < b ? [a, b] : [b, a]);
const signature = (tables: string[][]) => JSON.stringify(tables.filter(table => table.length)
  .map(table => JSON.stringify([...table].sort())).sort());

function pairs(pupils: string[]) {
  return pupils.flatMap((first, index) => pupils.slice(index + 1).map(second => [first, second] as const));
}

export function groupingHistory(snapshots: string[][][]) {
  const together = new Map<string, number>();
  const present = new Map<string, number>();
  for (const tables of snapshots) {
    const roster = [...new Set(tables.flat())];
    const classPairs = pairs(roster);
    for (const [a, b] of classPairs) {
      const key = pairKey(a, b);
      present.set(key, (present.get(key) || 0) + 1);
    }
    const used = new Set(tables.flatMap(table => pairs(table).map(([a, b]) => pairKey(a, b))));
    for (const key of used) together.set(key, (together.get(key) || 0) + 1);
  }
  return (a: string, b: string) => {
    const key = pairKey(a, b);
    const count = together.get(key) || 0;
    const opportunities = present.get(key) || 0;
    return { count, opportunities, rate: opportunities ? count / opportunities : 0 };
  };
}

export function groupingPairs(tables: string[][], history: ReturnType<typeof groupingHistory>) {
  return tables.flatMap(table => pairs(table).map(([a, b]) => ({ a, b, ...history(a, b) })));
}

export function proposeGrouping(pupils: GroupingPupil[], desks: GroupingDesk[], snapshots: string[][][], random = Math.random) {
  const roleById = new Map(pupils.map(pupil => [pupil.id, pupil.role]));
  const fixed = new Set<string>();
  const locked = desks.map(desk => desk.locked ? desk.pupils.filter(id => {
    if (!roleById.has(id) || fixed.has(id)) return false;
    fixed.add(id);
    return true;
  }) : []);
  const remaining = pupils.map(pupil => pupil.id).filter(id => !fixed.has(id));
  const seats = desks.flatMap((desk, index) => desk.locked ? [] :
    Array.from({ length: desk.capacity }, (_, position) => ({ index, position, occupancy: (position + 1) / desk.capacity })));
  seats.sort((first, second) => first.occupancy - second.occupancy || first.position - second.position);
  if (remaining.length > seats.length) return null;
  const usedSeats = seats.slice(0, remaining.length);
  const counts = ['needs-support', 'can-help', 'independent'].map(role =>
    pupils.filter(pupil => pupil.role === role).length);
  const history = groupingHistory(snapshots);
  const previous = new Set(snapshots.map(signature));
  const pairCost = new Map(pairs(pupils.map(pupil => pupil.id)).map(([a, b]) => {
    const prior = history(a, b);
    return [pairKey(a, b), prior.count + prior.rate] as const;
  }));
  function score(tables: string[][]) {
    let balance = 0;
    let repeats = 0;
    for (const table of tables) {
      const distribution = [0, 0, 0];
      for (const id of table) {
        const role = roleById.get(id);
        if (role === 'needs-support') distribution[0]++;
        if (role === 'can-help') distribution[1]++;
        if (role === 'independent') distribution[2]++;
      }
      if (distribution[0] && !distribution[1] && counts[1]) balance += 5 * distribution[0];
      for (let i = 0; i < counts.length; i++) {
        const expected = counts[i] * table.length / Math.max(1, pupils.length);
        balance += (distribution[i] - expected) ** 2;
      }
      for (const [a, b] of pairs(table)) repeats += pairCost.get(pairKey(a, b)) || 0;
    }
    return [balance, Number(previous.has(signature(tables))), repeats];
  }
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > 1e-8) return a[i] < b[i];
    }
    return false;
  };
  let best: string[][] = locked;
  let bestScore = [Infinity, Infinity, Infinity];
  for (let attempt = 0; attempt < 24; attempt++) {
    const order = [...remaining];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const tables = locked.map(table => [...table]);
    order.forEach((id, index) => tables[usedSeats[index].index].push(id));
    let current = score(tables);
    const movable = tables.flatMap((table, index) =>
      desks[index].locked ? [] : table.map((_, position) => ({ index, position })));
    for (let step = 0; step < 110 && movable.length > 1; step++) {
      const a = movable[Math.floor(random() * movable.length)];
      const b = movable[Math.floor(random() * movable.length)];
      if (a.index === b.index) continue;
      const left = tables[a.index];
      const right = tables[b.index];
      [left[a.position], right[b.position]] = [right[b.position], left[a.position]];
      const candidate = score(tables);
      if (better(candidate, current)) current = candidate;
      else [left[a.position], right[b.position]] = [right[b.position], left[a.position]];
    }
    if (better(current, bestScore)) {
      best = tables;
      bestScore = current;
    }
  }
  return best;
}
