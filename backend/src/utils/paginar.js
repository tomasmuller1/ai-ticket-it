export function paginar(items, { page, pageSize }) {
  const inicio = (page - 1) * pageSize;
  return { data: items.slice(inicio, inicio + pageSize), page, pageSize, total: items.length };
}
