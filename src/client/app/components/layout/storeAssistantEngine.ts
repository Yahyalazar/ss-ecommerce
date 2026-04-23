export interface AssistantCatalogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface AssistantCatalogProduct {
  id: string;
  slug: string;
  name: string;
  isNew: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  averageRating: number;
  reviewCount: number;
  category?: AssistantCatalogCategory | null;
  variants: Array<{
    id: string;
    price: number;
    stock: number;
  }>;
}

export interface AssistantAction {
  label: string;
  prompt?: string;
  href?: string;
  userMessage?: string;
  feedback?: string;
  intent?:
    | "trending"
    | "new-arrivals"
    | "track-order"
    | "support"
    | "browse-shop";
}

export interface AssistantRecommendation {
  id: string;
  slug: string;
  name: string;
  categoryName?: string | null;
  price: number | null;
  isAvailable: boolean;
  badge?: string;
}

export interface AssistantReply {
  content: string;
  actions?: AssistantAction[];
  products?: AssistantRecommendation[];
}

interface AssistantContext {
  products: AssistantCatalogProduct[];
  categories: AssistantCatalogCategory[];
  isAuthenticated: boolean;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "are",
  "best",
  "buy",
  "can",
  "do",
  "for",
  "from",
  "help",
  "i",
  "in",
  "is",
  "it",
  "looking",
  "me",
  "my",
  "need",
  "of",
  "on",
  "or",
  "please",
  "product",
  "products",
  "recommend",
  "show",
  "something",
  "that",
  "the",
  "to",
  "want",
  "with",
]);

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const escapeSearchParam = (value: string) => encodeURIComponent(value.trim());

const getLowestPrice = (product: AssistantCatalogProduct) => {
  if (!product.variants.length) {
    return null;
  }

  return Math.min(...product.variants.map((variant) => variant.price));
};

const isAvailable = (product: AssistantCatalogProduct) =>
  product.variants.some((variant) => variant.stock > 0);

const getProductBadge = (product: AssistantCatalogProduct) => {
  if (product.isBestSeller) return "Best seller";
  if (product.isTrending) return "Trending";
  if (product.isNew) return "New";
  if (product.isFeatured) return "Featured";
  return undefined;
};

const mapRecommendations = (products: AssistantCatalogProduct[]) =>
  products.slice(0, 3).map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    categoryName: product.category?.name,
    price: getLowestPrice(product),
    isAvailable: isAvailable(product),
    badge: getProductBadge(product),
  }));

const byPriority = (left: AssistantCatalogProduct, right: AssistantCatalogProduct) => {
  const leftAvailable = isAvailable(left) ? 1 : 0;
  const rightAvailable = isAvailable(right) ? 1 : 0;

  if (leftAvailable !== rightAvailable) {
    return rightAvailable - leftAvailable;
  }

  if (left.reviewCount !== right.reviewCount) {
    return right.reviewCount - left.reviewCount;
  }

  return right.averageRating - left.averageRating;
};

const getPriceRange = (message: string) => {
  const underMatch = message.match(
    /\b(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*(\d+(?:\.\d+)?)/i
  );
  const overMatch = message.match(
    /\b(?:over|above|more than|min(?:imum)?|starting at|from)\s*\$?\s*(\d+(?:\.\d+)?)/i
  );

  return {
    max: underMatch ? Number(underMatch[1]) : undefined,
    min: overMatch ? Number(overMatch[1]) : undefined,
  };
};

const matchesPriceRange = (
  product: AssistantCatalogProduct,
  min?: number,
  max?: number
) => {
  const price = getLowestPrice(product);
  if (price === null) return false;
  if (typeof min === "number" && price < min) return false;
  if (typeof max === "number" && price > max) return false;
  return true;
};

const getStarterActions = (isAuthenticated: boolean): AssistantAction[] => [
  {
    label: "Trending now",
    userMessage: "Trending now",
    intent: "trending",
  },
  {
    label: "New arrivals",
    userMessage: "New arrivals",
    intent: "new-arrivals",
  },
  {
    label: "Track my order",
    userMessage: "Track my order",
    intent: "track-order",
  },
  {
    label: isAuthenticated ? "Talk to support" : "Sign in for support",
    userMessage: isAuthenticated ? "Talk to support" : "Sign in for support",
    intent: "support",
  },
];

export const getWelcomeReply = (isAuthenticated: boolean): AssistantReply => ({
  content:
    "Hi, I am your TalaShop assistant. I can help you find products, answer shopping questions, and point you to support when you need a person.",
  actions: getStarterActions(isAuthenticated),
});

const getFallbackReply = (isAuthenticated: boolean): AssistantReply => ({
  content:
    "I can help with product discovery, price-based suggestions, shipping questions, returns, and support. Try asking for trending items, a category, or a budget.",
  actions: getStarterActions(isAuthenticated),
});

const getCategoryMatch = (
  normalizedMessage: string,
  categories: AssistantCatalogCategory[]
) =>
  categories.find((category) => {
    const normalizedName = normalizeText(category.name);
    const normalizedSlug = normalizeText(category.slug.replace(/-/g, " "));
    return (
      normalizedMessage.includes(normalizedName) ||
      normalizedMessage.includes(normalizedSlug)
    );
  });

const searchProducts = (
  normalizedMessage: string,
  products: AssistantCatalogProduct[]
) => {
  const tokens = normalizedMessage
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

  if (!tokens.length) {
    return [];
  }

  return products
    .map((product) => {
      const haystack = normalizeText(
        `${product.name} ${product.category?.name || ""} ${product.slug.replace(/-/g, " ")}`
      );
      const score = tokens.reduce(
        (total, token) => total + (haystack.includes(token) ? 1 : 0),
        0
      );

      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return byPriority(left.product, right.product);
    })
    .map((entry) => entry.product);
};

const getHumanSupportReply = (isAuthenticated: boolean): AssistantReply => ({
  content: isAuthenticated
    ? "A support conversation is the best next step for billing issues, account problems, or anything that needs a person to review directly."
    : "For account-specific help, the support area opens after sign-in so our team can see your order history safely.",
  actions: [
    {
      label: isAuthenticated ? "Open support" : "Sign in",
      href: isAuthenticated ? "/support" : "/sign-in",
      userMessage: isAuthenticated ? "Open support" : "Sign in",
      feedback: isAuthenticated
        ? "Opening support so you can continue with a real person."
        : "Opening sign in so you can access account-specific support securely.",
    },
    {
      label: "Browse shop",
      href: "/shop",
      userMessage: "Browse shop",
      feedback: "Opening the shop so you can keep browsing while we stay here to help.",
    },
  ],
});

const getOrdersReply = (isAuthenticated: boolean): AssistantReply => ({
  content: isAuthenticated
    ? "I cannot open private order details from this widget, but you can track statuses, shipping updates, and past purchases from your orders page."
    : "Order tracking is available after sign-in so we can protect your private order details.",
  actions: [
    {
      label: isAuthenticated ? "Open orders" : "Sign in",
      href: isAuthenticated ? "/orders" : "/sign-in",
      userMessage: isAuthenticated ? "Open orders" : "Sign in",
      feedback: isAuthenticated
        ? "Opening your orders so you can check shipping updates and past purchases."
        : "Opening sign in so you can securely access your order history.",
    },
    {
      label: isAuthenticated ? "Talk to support" : "Support after sign in",
      userMessage: isAuthenticated
        ? "Talk to support"
        : "Support after sign in",
      intent: "support",
    },
  ],
});

const getReturnsReply = (isAuthenticated: boolean): AssistantReply => ({
  content:
    "For returns or refunds, the fastest path is to review the order first and then contact support if you need manual help with an item.",
  actions: [
    {
      label: isAuthenticated ? "Open orders" : "Sign in",
      href: isAuthenticated ? "/orders" : "/sign-in",
      userMessage: isAuthenticated ? "Open orders" : "Sign in",
      feedback: isAuthenticated
        ? "Opening your orders so you can review the item before starting a return."
        : "Opening sign in so you can securely review the order tied to the return.",
    },
    {
      label: isAuthenticated ? "Contact support" : "Support after sign in",
      userMessage: isAuthenticated
        ? "Contact support"
        : "Support after sign in",
      intent: "support",
    },
  ],
});

const getCheckoutReply = (): AssistantReply => ({
  content:
    "You can review items in your cart, adjust quantities, and complete checkout from there. If you want, I can also suggest products before you check out.",
  actions: [
    {
      label: "Open cart",
      href: "/cart",
      userMessage: "Open cart",
      feedback: "Opening your cart so you can review items and continue to checkout.",
    },
    {
      label: "Recommend something under $100",
      userMessage: "Recommend something under $100",
      prompt: "Show me products under $100",
    },
  ],
});

export const buildAssistantReply = ({
  message,
  products,
  categories,
  isAuthenticated,
}: AssistantContext & { message: string }): AssistantReply => {
  const normalizedMessage = normalizeText(message);

  if (!normalizedMessage) {
    return getFallbackReply(isAuthenticated);
  }

  if (
    /\b(hello|hey|hi|good morning|good afternoon|good evening|help)\b/.test(
      normalizedMessage
    ) &&
    normalizedMessage.split(" ").length <= 6
  ) {
    return getWelcomeReply(isAuthenticated);
  }

  if (
    /\b(human|agent|support|representative|customer service|someone)\b/.test(
      normalizedMessage
    )
  ) {
    return getHumanSupportReply(isAuthenticated);
  }

  if (
    /\b(order|track|tracking|shipment|shipping|delivery|where is my order)\b/.test(
      normalizedMessage
    )
  ) {
    return getOrdersReply(isAuthenticated);
  }

  if (/\b(return|refund|exchange|cancel)\b/.test(normalizedMessage)) {
    return getReturnsReply(isAuthenticated);
  }

  if (/\b(cart|checkout|payment|pay)\b/.test(normalizedMessage)) {
    return getCheckoutReply();
  }

  const priceRange = getPriceRange(normalizedMessage);
  const categoryMatch = getCategoryMatch(normalizedMessage, categories);

  let filteredProducts = [...products];
  let contextLabel = "matching products";

  if (categoryMatch) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category?.id === categoryMatch.id
    );
    contextLabel = `${categoryMatch.name} picks`;
  }

  if (/\b(new|new arrivals|latest)\b/.test(normalizedMessage)) {
    filteredProducts = filteredProducts.filter((product) => product.isNew);
    contextLabel = "new arrivals";
  } else if (/\b(trending|popular|hot right now)\b/.test(normalizedMessage)) {
    filteredProducts = filteredProducts.filter((product) => product.isTrending);
    contextLabel = "trending products";
  } else if (/\b(best seller|best sellers|bestseller)\b/.test(normalizedMessage)) {
    filteredProducts = filteredProducts.filter(
      (product) => product.isBestSeller
    );
    contextLabel = "best sellers";
  } else if (/\b(featured|top picks|recommended)\b/.test(normalizedMessage)) {
    filteredProducts = filteredProducts.filter((product) => product.isFeatured);
    contextLabel = "featured products";
  }

  if (
    typeof priceRange.min === "number" ||
    typeof priceRange.max === "number"
  ) {
    filteredProducts = filteredProducts.filter((product) =>
      matchesPriceRange(product, priceRange.min, priceRange.max)
    );
    const labelParts: string[] = [];

    if (typeof priceRange.min === "number") {
      labelParts.push(`from $${priceRange.min}`);
    }

    if (typeof priceRange.max === "number") {
      labelParts.push(`under $${priceRange.max}`);
    }

    contextLabel =
      labelParts.length > 0
        ? `${contextLabel} ${labelParts.join(" ")}`
        : contextLabel;
  }

  if (!categoryMatch && filteredProducts.length === products.length) {
    filteredProducts = searchProducts(normalizedMessage, filteredProducts);
  } else if (categoryMatch && filteredProducts.length === 0) {
    filteredProducts = searchProducts(normalizedMessage, products).filter(
      (product) => product.category?.id === categoryMatch.id
    );
  }

  filteredProducts = filteredProducts.sort(byPriority);

  if (filteredProducts.length > 0) {
    const topMatch = filteredProducts[0];
    const viewMoreHref = categoryMatch
      ? `/shop?categoryId=${categoryMatch.id}`
      : `/shop?search=${escapeSearchParam(message)}`;

    return {
      content:
        filteredProducts.length === 1
          ? `I found a strong match for you: ${topMatch.name}.`
          : `Here are a few ${contextLabel} that look like a good fit.`,
      products: mapRecommendations(filteredProducts),
      actions: [
        {
          label: "See more results",
          href: viewMoreHref,
          userMessage: "See more results",
          feedback: "Opening more results based on what you asked for.",
        },
        {
          label: isAuthenticated ? "Talk to support" : "Sign in for support",
          userMessage: isAuthenticated
            ? "Talk to support"
            : "Sign in for support",
          intent: "support",
        },
      ],
    };
  }

  if (categoryMatch) {
    return {
      content: `I did not find a strong ${categoryMatch.name} match in the current catalog snapshot, but you can still browse the category directly.`,
      actions: [
        {
          label: `Browse ${categoryMatch.name}`,
          href: `/shop?categoryId=${categoryMatch.id}`,
          userMessage: `Browse ${categoryMatch.name}`,
          feedback: `Opening ${categoryMatch.name} so you can explore the full category.`,
        },
        {
          label: "Try trending products",
          userMessage: "Try trending products",
          intent: "trending",
        },
      ],
    };
  }

  return getFallbackReply(isAuthenticated);
};

export const buildAssistantActionReply = ({
  intent,
  products,
  categories,
  isAuthenticated,
}: AssistantContext & {
  intent: NonNullable<AssistantAction["intent"]>;
}): AssistantReply => {
  switch (intent) {
    case "support":
      return getHumanSupportReply(isAuthenticated);
    case "track-order":
      return getOrdersReply(isAuthenticated);
    case "browse-shop":
      return {
        content:
          "You can browse the full catalog from the shop. If you want, I can also narrow it down by category, budget, or popularity.",
        actions: [
          {
            label: "Open shop",
            href: "/shop",
            userMessage: "Open shop",
            feedback: "Opening the shop so you can explore the full catalog.",
          },
          {
            label: "Trending now",
            userMessage: "Trending now",
            intent: "trending",
          },
        ],
      };
    case "trending": {
      const trendingProducts = products
        .filter((product) => product.isTrending)
        .sort(byPriority);

      if (trendingProducts.length > 0) {
        return {
          content: "Here are a few trending products customers are checking out right now.",
          products: mapRecommendations(trendingProducts),
          actions: [
            {
              label: "See more results",
              href: "/shop?isTrending=true",
              userMessage: "See more results",
              feedback: "Opening more trending products for you.",
            },
            {
              label: isAuthenticated ? "Talk to support" : "Sign in for support",
              userMessage: isAuthenticated
                ? "Talk to support"
                : "Sign in for support",
              intent: "support",
            },
          ],
        };
      }

      return {
        content:
          "I could not find products currently marked as trending, but I can still help you browse the latest arrivals or open the full shop.",
        actions: [
          {
            label: "New arrivals",
            userMessage: "New arrivals",
            intent: "new-arrivals",
          },
          {
            label: "Browse shop",
            href: "/shop",
            userMessage: "Browse shop",
            feedback: "Opening the shop so you can browse everything currently available.",
          },
        ],
      };
    }
    case "new-arrivals": {
      const newProducts = products.filter((product) => product.isNew).sort(byPriority);

      if (newProducts.length > 0) {
        return {
          content: "Here are some of the newest arrivals in the catalog.",
          products: mapRecommendations(newProducts),
          actions: [
            {
              label: "See more results",
              href: "/shop?isNew=true",
              userMessage: "See more results",
              feedback: "Opening more new arrivals for you.",
            },
            {
              label: "Trending now",
              userMessage: "Trending now",
              intent: "trending",
            },
          ],
        };
      }

      return {
        content:
          "I do not see products currently marked as new arrivals, but I can show trending items or open the shop so you can browse everything.",
        actions: [
          {
            label: "Trending now",
            userMessage: "Trending now",
            intent: "trending",
          },
          {
            label: "Browse shop",
            href: "/shop",
            userMessage: "Browse shop",
            feedback: "Opening the shop so you can browse the full catalog.",
          },
        ],
      };
    }
  }

  return buildAssistantReply({
    message: categories[0]?.name || "shop",
    products,
    categories,
    isAuthenticated,
  });
};
