import { apiSlice } from "../slices/ApiSlice";

export const transactionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllTransactions: builder.query({
      query: () => "/transactions",
      providesTags: ["Transactions"],
    }),
    getTransaction: builder.query({
      query: (id) => `/transactions/${id}`,
      providesTags: (result, error, id) => [{ type: "Transactions", id }],
    }),
    updateTransactionStatus: builder.mutation({
      query: ({ id, status }: { id: string; status: string }) => ({
        url: `/transactions/status/${id}`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Transactions", id },
        "Transactions",
        "Order",
        "User",
      ],
    }),
    deleteTransaction: builder.mutation({
      query: (id) => ({
        url: `/transactions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Transactions", id },
        "Transactions",
      ],
    }),
  }),
});

export const {
  useGetAllTransactionsQuery,
  useGetTransactionQuery,
  useUpdateTransactionStatusMutation,
  useDeleteTransactionMutation,
} = transactionApi;
