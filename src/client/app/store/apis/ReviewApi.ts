import { apiSlice } from "../slices/ApiSlice";

export interface ProductReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userId?: string;
  user?: {
    id?: string;
    name?: string;
    avatar?: string | null;
    email?: string;
  };
}

interface GetReviewsByProductIdResponse {
  success: boolean;
  message: string;
  reviews: ProductReview[];
  total: number;
  totalPages: number;
  currentPage: number;
  resultsPerPage: number;
}

interface CreateReviewResponse {
  success: boolean;
  message: string;
  review: ProductReview;
}

interface DeleteReviewResponse {
  success: boolean;
  message: string;
}

export const reviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReviewsByProductId: builder.query<
      GetReviewsByProductIdResponse,
      { productId: string; page?: number; limit?: number }
    >({
      query: ({ productId, page = 1, limit = 50 }) => ({
        url: `/reviews/${productId}?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { productId }) => [
        { type: "Review", id: productId },
      ],
    }),
    createReview: builder.mutation<
      CreateReviewResponse,
      { productId: string; rating: number; comment?: string }
    >({
      query: (reviewData) => ({
        url: "/reviews",
        method: "POST",
        body: reviewData,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: "Review", id: productId },
      ],
    }),

    deleteReview: builder.mutation<
      DeleteReviewResponse,
      { reviewId: string; productId: string }
    >({
      query: ({ reviewId }) => ({
        url: `/reviews/${reviewId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: "Review", id: productId },
      ],
    }),
  }),
});

export const {
  useGetReviewsByProductIdQuery,
  useCreateReviewMutation,
  useDeleteReviewMutation,
} = reviewApi;
