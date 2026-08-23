import type { Product, ProductRepository } from '@/domain/product';

export class StaticProductRepository implements ProductRepository {
  constructor(private readonly products: Product[]) {}

  findActive(): Promise<Product[]> {
    return Promise.resolve(this.products.filter((product) => product.active && product.editorialStatus === 'approved'));
  }

  findById(id: string): Promise<Product | null> {
    return Promise.resolve(
      this.products.find((product) => product.id === id) ?? null,
    );
  }

  findBySlug(slug: string): Promise<Product | null> {
    return Promise.resolve(
      this.products.find((product) => product.slug === slug) ?? null,
    );
  }
}
