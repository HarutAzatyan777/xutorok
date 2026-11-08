import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: (_db: unknown, path: string) => ({
      path,
      withConverter: () => ({ path }),
    }),
    doc: (parent: { path?: string }, id?: string) => {
      const basePath = parent?.path ? `${parent.path}/${id ?? 'auto-id-123'}` : String(id ?? 'doc-path');
      return {
        id: id ?? 'auto-id-123',
        path: basePath,
        withConverter: () => ({ id: id ?? 'auto-id-123', path: basePath }),
      };
    },
    query: (...args: unknown[]) => ({ args }),
    where: (...args: unknown[]) => ({ args }),
    orderBy: (...args: unknown[]) => ({ args }),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
    deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  };
});

import {
  archiveProduct,
  createProduct,
  deleteProduct,
  toggleProductFlag,
  updateProduct,
} from '../productService';
import {
  createCategory,
  deleteCategorySafely,
  updateCategory,
} from '../../../categories/services/categoryService';

describe('Admin Panel Firestore CRUD & Cost-Safe Read Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a product in restaurants/xutorok/products without redundant post-write getDoc reads', async () => {
    const created = await createProduct(
      {
        categoryId: 'cat-04-soups',
        name: { hy: 'Բորշչ', ru: 'Борщ', en: 'Borsch' },
        description: { hy: 'Տաք ապուր', ru: 'Горячий суп', en: 'Hot soup' },
        price: 2600,
        currency: 'AMD',
        variants: [],
        imageUrl: '',
        imagePath: '',
        isAvailable: true,
        isVisible: true,
        isFeatured: true,
        sortOrder: 40,
      },
      'test-prod-1',
      'xutorok'
    );

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(created.id).toBe('test-prod-1');
    expect(created.restaurantId).toBe('xutorok');
    expect(created.price).toBe(2600);
    expect(created.name.hy).toBe('Բորշչ');
  });

  it('updates, toggles availability, archives, and deletes a product in restaurants/xutorok/products', async () => {
    await updateProduct(
      'test-prod-1',
      {
        categoryId: 'cat-04-soups',
        name: { hy: 'Բորշչ', ru: 'Борщ', en: 'Borsch' },
        price: 2800,
        currency: 'AMD',
        isAvailable: true,
        isVisible: true,
        isFeatured: false,
        sortOrder: 40,
      },
      'xutorok'
    );
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

    await toggleProductFlag('test-prod-1', 'isAvailable', false, 'xutorok');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);

    await archiveProduct('test-prod-1', 'xutorok');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(3);

    await deleteProduct(
      {
        id: 'test-prod-1',
        restaurantId: 'xutorok',
        categoryId: 'cat-04-soups',
        name: { hy: 'Բորշչ', ru: 'Борщ', en: 'Borsch' },
        price: 2800,
        currency: 'AMD',
        isAvailable: false,
        isVisible: false,
        isFeatured: false,
        sortOrder: 40,
      },
      'xutorok'
    );
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });

  it('creates, updates, and safely prevents deleting non-empty categories without extra getDoc reads on create', async () => {
    const cat = await createCategory(
      {
        name: { hy: 'Ապուրներ', ru: 'Супы', en: 'Soups' },
        slug: 'soups',
        sortOrder: 10,
        isVisible: true,
      },
      'cat-04-soups',
      'xutorok'
    );

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(mockGetDoc).not.toHaveBeenCalled();
    expect(cat.id).toBe('cat-04-soups');
    expect(cat.restaurantId).toBe('xutorok');

    await updateCategory(
      'cat-04-soups',
      {
        name: { hy: 'Ապուրներ', ru: 'Супы', en: 'Soups' },
        slug: 'soups',
        sortOrder: 20,
        isVisible: true,
      },
      'xutorok'
    );
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

    mockGetDocs.mockResolvedValueOnce({ empty: false, size: 3 });
    await expect(deleteCategorySafely('cat-04-soups', 'xutorok')).rejects.toThrow(
      /Cannot delete category while it still contains 3 product\(s\)/
    );
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });
});
