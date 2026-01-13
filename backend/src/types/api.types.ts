/**
 * Common API response types
 */

/**
 * Successful API response format
 */
export interface ApiResponse<T> {
  data: T;
  success: true;
}

/**
 * Error API response format
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response format
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ============= DTOs =============

/**
 * User DTO - safe user data to return in responses
 */
export interface UserDTO {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  preferredLanguage: string;
  role: 'user' | 'creator' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creator profile DTO
 */
export interface CreatorProfileDTO {
  id: number;
  userId: number;
  displayName: string;
  bio: string | null;
  patreonUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  websiteUrl: string | null;
  totalDownloads: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category DTO
 */
export interface CategoryDTO {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
}

/**
 * Tag DTO
 */
export interface TagDTO {
  id: number;
  name: string;
  slug: string;
  type: 'general' | 'expansion_pack' | 'game_pack' | 'stuff_pack';
}

/**
 * Mod version DTO
 */
export interface ModVersionDTO {
  id: number;
  modId: number;
  versionNumber: string;
  changelog: string | null;
  filePath: string;
  fileSize: number;
  fileHash: string;
  isRecommended: boolean;
  downloadCount: number;
  createdAt: string;
}

/**
 * Screenshot DTO
 */
export interface ScreenshotDTO {
  id: number;
  modId: number;
  filePath: string;
  caption: string | null;
  displayOrder: number;
  createdAt: string;
}

/**
 * Mod DTO - basic mod info
 */
export interface ModDTO {
  id: number;
  creatorId: number;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published' | 'hidden' | 'removed';
  accessType: 'free' | 'early_access';
  earlyAccessPrice: number | null;
  downloadCount: number;
  viewCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/**
 * Mod detail DTO - full mod info with relationships
 */
export interface ModDetailDTO extends ModDTO {
  creator: CreatorProfileDTO;
  categories: CategoryDTO[];
  tags: TagDTO[];
  versions: ModVersionDTO[];
  screenshots: ScreenshotDTO[];
}

/**
 * Early access purchase DTO
 */
export interface EarlyAccessPurchaseDTO {
  id: number;
  userId: number;
  modId: number;
  amountPaid: number;
  platformCommission: number;
  creatorRevenue: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentProvider: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Report DTO
 */
export interface ReportDTO {
  id: number;
  reporterId: number;
  modId: number;
  reason: 'malware' | 'copyright' | 'inappropriate' | 'broken' | 'other';
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  adminNotes: string | null;
  reviewedBy: number | null;
  createdAt: string;
  resolvedAt: string | null;
}

// ============= Request Bodies =============

/**
 * Register request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Auth response with tokens
 */
export interface AuthResponse {
  user: UserDTO;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * Token pair response
 */
export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Forgot password request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  username?: string;
  preferredLanguage?: string;
  avatarUrl?: string;
}

/**
 * Create creator request
 */
export interface CreateCreatorRequest {
  displayName: string;
  bio?: string;
}

/**
 * Update creator request
 */
export interface UpdateCreatorRequest {
  displayName?: string;
  bio?: string;
  patreonUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  websiteUrl?: string;
}

/**
 * Create mod request (multipart form data)
 */
export interface CreateModRequest {
  title: string;
  description: string;
  categoryIds: number[];
  tagIds?: number[];
  accessType: 'free' | 'early_access';
  earlyAccessPrice?: number;
  versionNumber: string;
  changelog?: string;
  // file: File (handled by multer)
  // screenshots?: File[] (handled by multer)
}

/**
 * Update mod request
 */
export interface UpdateModRequest {
  title?: string;
  description?: string;
  categoryIds?: number[];
  tagIds?: number[];
  accessType?: 'free' | 'early_access';
  earlyAccessPrice?: number;
  status?: 'draft' | 'published';
}

/**
 * Create mod version request
 */
export interface CreateModVersionRequest {
  versionNumber: string;
  changelog: string;
  isRecommended?: boolean;
  // file: File (handled by multer)
}

/**
 * Create report request
 */
export interface CreateReportRequest {
  modId: number;
  reason: 'malware' | 'copyright' | 'inappropriate' | 'broken' | 'other';
  description: string;
}

/**
 * Update report request (admin)
 */
export interface UpdateReportRequest {
  status: 'reviewing' | 'resolved' | 'dismissed';
  adminNotes?: string;
}

/**
 * Hide mod request (admin)
 */
export interface HideModRequest {
  reason: string;
}

/**
 * Suspend user request (admin)
 */
export interface SuspendUserRequest {
  reason: string;
}

/**
 * Payment initiation response
 */
export interface PaymentInitiationResponse {
  sessionId: string;
  paymentUrl: string;
}

/**
 * Creator stats DTO
 */
export interface CreatorStatsDTO {
  totalDownloads: number;
  totalRevenue: number;
  modStats: Array<{
    modId: number;
    title: string;
    downloads: number;
    revenue: number;
    purchases: number;
  }>;
}
