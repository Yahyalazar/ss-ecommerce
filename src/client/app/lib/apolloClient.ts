import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { GRAPHQL_URL } from "./constants/config";

// Validate GraphQL URL is configured
if (!GRAPHQL_URL) {
  console.error("🔴 CRITICAL: GRAPHQL_URL is not defined. Check environment variables.");
}

console.log("📡 Apollo Client Configuration:");
console.log("  GRAPHQL_URL:", GRAPHQL_URL);
console.log("  NODE_ENV:", process.env.NODE_ENV);

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    console.error("🔴 GraphQL Errors:", graphQLErrors);
  }
  if (networkError) {
    console.error("🔴 Network Error:", networkError);
    if ('message' in networkError) {
      console.error("   Message:", networkError.message);
    }
  }
});

export const initializeApollo = (initialState = null) => {
  const httpLink = new HttpLink({
    uri: GRAPHQL_URL,
    credentials: "include",
  });

  // Create or reuse Apollo Client instance
  const client = new ApolloClient({
    link: from([errorLink, httpLink]),
    cache: new InMemoryCache().restore(initialState || {}),
  });

  return client;
};

export default initializeApollo(); // Default export for client-side usage
