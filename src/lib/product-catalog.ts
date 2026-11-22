import { readWorkspaceStorage, writeWorkspaceStorage } from './browser-storage';
export type CatalogProduct = { id: string; name: string; price: string };
const key = 'orderclean-products-v1';

export function validProduct(product: CatalogProduct): boolean {
  return Boolean(product.id && product.name.trim() && product.price.trim() && Number.isFinite(Number(product.price)) && Number(product.price) >= 0);
}

export function readProducts(workspace = 'Default'): CatalogProduct[] {
  const data: unknown = JSON.parse(readWorkspaceStorage(key, workspace) || '[]');
  if (!Array.isArray(data)) throw new Error('Invalid catalog');
  return data.filter((item: unknown): item is CatalogProduct => {
    if (typeof item !== 'object' || item === null) return false;
    const p = item as Partial<CatalogProduct>;
    return typeof p.id === 'string' && typeof p.name === 'string' && typeof p.price === 'string' && validProduct({ id: p.id, name: p.name, price: p.price });
  });
}

export function saveProducts(products: CatalogProduct[], workspace = 'Default') {
  if (!products.every(validProduct)) throw new Error('Invalid product');
  writeWorkspaceStorage(key, JSON.stringify(products), workspace);
}

export function matchingProducts(products: CatalogProduct[], query: string): CatalogProduct[] {
  const normalized = query.trim().toLocaleLowerCase();
  return products.filter(product => product.name.toLocaleLowerCase().includes(normalized));
}