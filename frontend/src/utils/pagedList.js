/** Parse GET JSON body shaped as { items, total, page, limit } — kèm fallback API cũ / shape lệch. */
export function normalizePagedResponse(data) {
  if (data == null) {
    return { items: [], total: 0, page: 1, limit: 20 };
  }

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      limit: 20,
    };
  }

  if (typeof data !== 'object') {
    return { items: [], total: 0, page: 1, limit: 20 };
  }

  let items = [];
  if (Array.isArray(data.items)) {
    items = data.items;
  } else if (Array.isArray(data.rooms)) {
    items = data.rooms;
  } else if (Array.isArray(data.data)) {
    items = data.data;
  }

  const total = typeof data.total === 'number' && !Number.isNaN(data.total)
    ? data.total
    : items.length;

  const page = typeof data.page === 'number' && data.page >= 1 ? Math.floor(data.page) : 1;

  let limit = typeof data.limit === 'number' && data.limit > 0 ? Math.floor(data.limit) : 20;
  if (limit > 100) {
    limit = 100;
  }

  return {
    items,
    total,
    page,
    limit,
  };
}

export function totalPages(total, limit) {
  if (limit <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / limit));
}
