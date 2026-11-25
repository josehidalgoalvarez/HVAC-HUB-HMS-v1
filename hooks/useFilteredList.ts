import { useState, useMemo } from 'react';

export interface UseFilteredListOptions<T> {
  getSearchText: (item: T) => string[];
  filter?: (item: T, query?: string) => boolean;
  sort?: (a: T, b: T) => number;
  trimQuery?: boolean;
}

export function filterItems<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string[],
  filter?: (item: T, query?: string) => boolean,
  sort?: (a: T, b: T) => number,
  trimQuery = true
): T[] {
  const normalizedQuery = !query.trim()
    ? ''
    : (trimQuery ? query.trim().toLowerCase() : query.toLowerCase());

  let result = items.filter((item) => {
    const matchesQuery =
      normalizedQuery === '' ||
      getSearchText(item).some((text) => text.toLowerCase().includes(normalizedQuery));
    if (!matchesQuery) return false;
    return filter ? filter(item, query) : true;
  });

  if (sort) {
    result = [...result].sort(sort);
  }

  return result;
}

export function useFilteredList<T>(
  items: T[],
  options: UseFilteredListOptions<T>
): {
  query: string;
  setQuery: (q: string) => void;
  filtered: T[];
} {
  const [query, setQuery] = useState('');
  const { getSearchText, filter, sort, trimQuery = true } = options;

  const filtered = useMemo(
    () => filterItems(items, query, getSearchText, filter, sort, trimQuery),
    [items, query, getSearchText, filter, sort, trimQuery]
  );

  return { query, setQuery, filtered };
}
