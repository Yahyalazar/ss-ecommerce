import { apiSlice } from "../slices/ApiSlice";

export const checkoutApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    initiateCheckout: builder.mutation({
      query: () => ({
        url: "/checkout",
        method: "POST",
        credentials: "include",
      }),
    }),
    confirmCheckout: builder.mutation({
      query: ({ sessionId }) => ({
        url: "/checkout/confirm",
        method: "POST",
        body: { sessionId },
        credentials: "include",
      }),
      invalidatesTags: ["Order", "Cart"],
    }),
  }),
});

export const { useInitiateCheckoutMutation, useConfirmCheckoutMutation } =
  checkoutApi;
