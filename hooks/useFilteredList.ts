import { useState, useMemo } from 'react';

export interface UseFilteredListOptions<T> {
  getSearchText: (item: T) => string[];
  filter?: (item: T) => boolean;
  sort?: (a: T, b: T) => number;
}

export function filterItems<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string[],
  filter?: (item: T) => boolean,
  sort?: (a: T, b: T) => number
): T[] {
  const normalizedQuery = query.trim().toLowerCase();

  let result = items.filter((item) => {
    const matchesQuery =
      normalizedQuery === '' ||
      getSearchText(item).some((text) => text.toLowerCase().includes(normalizedQuery));
    if (!matchesQuery) return false;
    return filter ? filter(item) : true;
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
  const { getSearchText, filter, sort } = options;

  const filtered = useMemo(
    () => filterItems(items, query, getSearchText, filter, sort),
    [items, query, getSearchText, filter, sort]
  );

  return { query, setQuery, filtered };
}
