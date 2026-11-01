// A picker's options when records can be created from inside the form: what
// the API listed when the form opened, plus everything created inline since
// (the list isn't re-fetched mid-form — that would flash a loading state over
// what's been typed), each id exactly once.
export function withCreated<T extends { id: string }>(listed: readonly T[] | null | undefined, created: readonly T[]): T[] {
  const list = listed ?? [];
  const seen = new Set(list.map((record) => record.id));
  const extra = created.filter((record) => {
    if (seen.has(record.id)) return false;
    seen.add(record.id);
    return true;
  });
  return [...list, ...extra];
}
