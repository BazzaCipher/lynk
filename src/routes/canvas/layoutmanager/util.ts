// Generates node id for the canvas
export function createNodeIdGenerator(suffix = 'node') {
  let counter = 1;

  return function getNextNodeIds(n = 1): string[] {
    const ids = Array.from({ length: n }, () => `${counter++}-${suffix}`);
    return ids;
  };
}