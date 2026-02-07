/**
 * Topological sort (Kahn's algorithm) for items with dependencies.
 * Falls back to createdAt order for items at the same level.
 * Any items involved in cycles are appended at the end.
 */
export function topologicalSort<T extends { id: string; createdAt: string }>(
  items: T[],
  getDependencies: (id: string) => string[]
): T[] {
  const itemIds = new Set(items.map((item) => item.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const item of items) {
    inDegree.set(item.id, 0);
    adjacency.set(item.id, []);
  }

  for (const item of items) {
    const deps = getDependencies(item.id);
    for (const depId of deps) {
      if (itemIds.has(depId)) {
        inDegree.set(item.id, (inDegree.get(item.id) || 0) + 1);
        adjacency.get(depId)?.push(item.id);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  // Stable sort: among items with same in-degree, sort by createdAt
  queue.sort((a, b) => {
    const ia = items.find((item) => item.id === a)!;
    const ib = items.find((item) => item.id === b)!;
    return new Date(ia.createdAt).getTime() - new Date(ib.createdAt).getTime();
  });

  const sorted: T[] = [];
  const itemMap = new Map(items.map((item) => [item.id, item]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(itemMap.get(current)!);
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        // Insert in createdAt order
        const nt = itemMap.get(neighbor)!;
        const insertIdx = queue.findIndex((qId) => {
          const qt = itemMap.get(qId)!;
          return new Date(qt.createdAt).getTime() > new Date(nt.createdAt).getTime();
        });
        if (insertIdx === -1) queue.push(neighbor);
        else queue.splice(insertIdx, 0, neighbor);
      }
    }
  }

  // Add any remaining items (cycles)
  for (const item of items) {
    if (!sorted.find((s) => s.id === item.id)) sorted.push(item);
  }

  return sorted;
}
