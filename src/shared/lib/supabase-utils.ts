/**
 * Supabase Utils — Helpers para lidar com limites do PostgREST.
 */

export async function fetchAll<T>(
  query: any,
  batchSize: number = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  let to = batchSize - 1;
  let finished = false;

  while (!finished) {
    const { data, error } = await query.range(from, to);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < batchSize) {
        finished = true;
      } else {
        from += batchSize;
        to += batchSize;
      }
    } else {
      finished = true;
    }
  }

  return allData;
}
