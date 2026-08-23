export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export interface ProductReview { id: string; productId: string; rating: number; title: string | null; body: string; recommend: boolean; status: ReviewStatus; createdAt: Date; approvedAt: Date | null }
export interface ReviewRepository { create(review: ProductReview): Promise<void>; listApproved(productId: string, limit?: number): Promise<ProductReview[]> }
