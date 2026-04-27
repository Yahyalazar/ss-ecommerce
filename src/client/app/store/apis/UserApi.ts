import { User } from "@/app/types/authTypes";
import { apiSlice } from "../slices/ApiSlice";
import { setUser } from "../slices/AuthSlice";

interface UserResponse {
  success: boolean;
  message: string;
  user: User;
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query({
      query: () => ({
        url: "/users",
      }),
      providesTags: ["User"],
    }),
    getAllAdmins: builder.query({
      query: () => ({
        url: "/users/admins",
      }),
      providesTags: ["User"],
    }),
    getProfile: builder.query({
      query: (id) => ({
        url: `/users/profile/${id}`,
        method: "GET",
      }),
      providesTags: ["User"],
    }),
    updateUser: builder.mutation({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),
    getMe: builder.query<UserResponse, void>({
      query: () => ({
        url: "/users/me",
        method: "GET",
      }),
      providesTags: ["User"],
    }),
    updateCurrentUser: builder.mutation<UserResponse, FormData>({
      query: (data) => ({
        url: "/users/me",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["User"],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser({ user: data.user }));
          dispatch(
            userApi.util.updateQueryData("getMe", undefined, (draft) => {
              draft.user = data.user;
              draft.message = data.message;
            })
          );
        } catch {
          // Let the page handle mutation errors.
        }
      },
    }),
    updateNewsletterPreference: builder.mutation<
      UserResponse,
      { newsletterSubscribed: boolean }
    >({
      query: (data) => ({
        url: "/users/me/newsletter",
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["User"],
      onQueryStarted: async (_, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser({ user: data.user }));
          dispatch(
            userApi.util.updateQueryData("getMe", undefined, (draft) => {
              draft.user = data.user;
              draft.message = data.message;
            })
          );
        } catch {
          // Let the page handle mutation errors.
        }
      },
    }),
    sendNewsletter: builder.mutation<
      {
        success: boolean;
        message: string;
        audienceCount: number;
        sentCount: number;
        failedCount: number;
      },
      { subject: string; message: string }
    >({
      query: (data) => ({
        url: "/users/newsletter",
        method: "POST",
        body: data,
      }),
    }),

    createAdmin: builder.mutation({
      query: (data) => ({
        url: "/users/admin",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetAllAdminsQuery,
  useUpdateUserMutation,
  useCreateAdminMutation,
  useDeleteUserMutation,
  useGetProfileQuery,
  useGetMeQuery,
  useGetAllUsersQuery,
  useLazyGetMeQuery,
  useUpdateCurrentUserMutation,
  useSendNewsletterMutation,
  useUpdateNewsletterPreferenceMutation,
} = userApi;
