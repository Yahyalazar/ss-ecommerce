"use client";

import { useLazyQuery } from "@apollo/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Loader2,
  MessageCircleMore,
  SendHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GET_CATEGORIES, GET_PRODUCTS } from "@/app/gql/Product";
import { useAuth } from "@/app/hooks/useAuth";
import useFormatPrice from "@/app/hooks/ui/useFormatPrice";
import {
  AssistantAction,
  AssistantCatalogCategory,
  AssistantCatalogProduct,
  AssistantRecommendation,
  buildAssistantReply,
  getWelcomeReply,
} from "./storeAssistantEngine";

interface ProductsQueryResult {
  products: {
    products: AssistantCatalogProduct[];
  };
}

interface CategoriesQueryResult {
  categories: AssistantCatalogCategory[];
}

interface ConversationMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  actions?: AssistantAction[];
  products?: AssistantRecommendation[];
}

const HIDDEN_ROUTE_PREFIXES = [
  "/dashboard",
  "/support",
  "/sign-in",
  "/sign-up",
  "/password-reset",
];

const createMessageId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const createAssistantMessage = (
  reply: ReturnType<typeof getWelcomeReply> | {
    content: string;
    actions?: AssistantAction[];
    products?: AssistantRecommendation[];
  },
  id = createMessageId()
): ConversationMessage => ({
  id,
  role: "assistant",
  content: reply.content,
  actions: reply.actions,
  products: reply.products,
});

const shouldHideAssistantOnRoute = (href: string) =>
  HIDDEN_ROUTE_PREFIXES.some((prefix) => href.startsWith(prefix));

const getActionFeedback = (action: AssistantAction) => {
  if (action.feedback) {
    return action.feedback;
  }

  if (!action.href) {
    return "Working on that now.";
  }

  if (action.href.startsWith("/support")) {
    return "Opening support so you can continue with a real person.";
  }

  if (action.href.startsWith("/sign-in")) {
    return "Opening sign in so you can continue securely.";
  }

  if (action.href.startsWith("/orders")) {
    return "Opening your orders so you can review the latest updates.";
  }

  if (action.href.startsWith("/cart")) {
    return "Opening your cart so you can review items and checkout.";
  }

  if (action.href.startsWith("/shop")) {
    return "Opening the shop so you can keep browsing.";
  }

  return `Opening ${action.label.toLowerCase()} now.`;
};

const StoreAssistant = () => {
  const router = useRouter();
  const pathname = usePathname();
  const formatPrice = useFormatPrice();
  const { isAuthenticated } = useAuth();
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    createAssistantMessage(getWelcomeReply(false), "welcome"),
  ]);

  const [loadProducts, productsResult] = useLazyQuery<ProductsQueryResult>(
    GET_PRODUCTS,
    {
      fetchPolicy: "cache-first",
    }
  );
  const [loadCategories, categoriesResult] =
    useLazyQuery<CategoriesQueryResult>(GET_CATEGORIES, {
      fetchPolicy: "cache-first",
    });

  const shouldHideAssistant = HIDDEN_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const catalogLoading = productsResult.loading || categoriesResult.loading;

  const catalogReady =
    Boolean(productsResult.data?.products?.products?.length) &&
    Boolean(categoriesResult.data?.categories?.length);

  useEffect(() => {
    setMessages((currentMessages) => {
      if (
        currentMessages.length !== 1 ||
        currentMessages[0]?.id !== "welcome" ||
        currentMessages[0]?.role !== "assistant"
      ) {
        return currentMessages;
      }

      return [createAssistantMessage(getWelcomeReply(isAuthenticated), "welcome")];
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (shouldHideAssistant && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, shouldHideAssistant]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [isOpen, isTyping, messages]);

  useEffect(() => {
    if (!isOpen || catalogReady) {
      return;
    }

    const preloadCatalog = async () => {
      try {
        await Promise.all([
          loadProducts({
            variables: {
              first: 36,
              skip: 0,
              filters: {},
            },
          }),
          loadCategories(),
        ]);
      } catch (error) {
        console.error("Assistant catalog preload failed:", error);
      }
    };

    void preloadCatalog();
  }, [catalogReady, isOpen, loadCategories, loadProducts]);

  const ensureCatalogLoaded = async () => {
    const productsPromise = productsResult.data?.products?.products
      ? Promise.resolve(productsResult.data.products.products)
      : loadProducts({
          variables: {
            first: 36,
            skip: 0,
            filters: {},
          },
        }).then((result) => result.data?.products?.products || []);

    const categoriesPromise = categoriesResult.data?.categories
      ? Promise.resolve(categoriesResult.data.categories)
      : loadCategories().then((result) => result.data?.categories || []);

    const [products, categories] = await Promise.all([
      productsPromise,
      categoriesPromise,
    ]);

    return { products, categories };
  };

  const appendUserMessage = (content: string) => {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: "user",
        content,
      },
    ]);
  };

  const handleAction = async (action: AssistantAction) => {
    if (action.prompt) {
      await handleSubmitPrompt({
        prompt: action.prompt,
        userMessage: action.userMessage || action.label,
      });
      return;
    }

    if (action.href) {
      if (isTyping) {
        return;
      }

      appendUserMessage(action.userMessage || action.label);
      setDraft("");
      setIsTyping(true);

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        setMessages((currentMessages) => [
          ...currentMessages,
          createAssistantMessage({
            content: getActionFeedback(action),
          }),
        ]);
      } finally {
        setIsTyping(false);
      }

      await new Promise((resolve) => window.setTimeout(resolve, 250));

      if (shouldHideAssistantOnRoute(action.href)) {
        setIsOpen(false);
      }

      router.push(action.href);
    }
  };

  const handleSubmitPrompt = async ({
    prompt,
    userMessage,
  }: {
    prompt: string;
    userMessage?: string;
  }) => {
    const trimmedPrompt = prompt.trim();
    const trimmedUserMessage = (userMessage || prompt).trim();

    if (!trimmedPrompt || isTyping) {
      return;
    }

    appendUserMessage(trimmedUserMessage);
    setDraft("");
    setIsTyping(true);

    try {
      const { products, categories } = await ensureCatalogLoaded();
      await new Promise((resolve) => window.setTimeout(resolve, 350));

      const reply = buildAssistantReply({
        message: trimmedPrompt,
        products,
        categories,
        isAuthenticated,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        createAssistantMessage(reply),
      ]);
    } catch (error) {
      console.error("Assistant reply failed:", error);
      setMessages((currentMessages) => [
        ...currentMessages,
        createAssistantMessage({
          content:
            "I hit a temporary problem loading the catalog, but you can still browse the shop or open support.",
          actions: [
            { label: "Browse shop", href: "/shop" },
            {
              label: isAuthenticated ? "Open support" : "Sign in",
              href: isAuthenticated ? "/support" : "/sign-in",
            },
          ],
        }),
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSubmitPrompt({ prompt: draft });
  };

  const resetConversation = () => {
    setMessages([createAssistantMessage(getWelcomeReply(isAuthenticated), "welcome")]);
    setDraft("");
    setIsTyping(false);
  };

  if (shouldHideAssistant) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[80] flex justify-end md:inset-x-auto md:right-6 md:bottom-6">
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.section
            key="assistant-panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex h-[min(78vh,640px)] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-indigo-100 bg-white shadow-[0_24px_80px_rgba(79,70,229,0.18)]"
          >
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-slate-900 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-100">
                    <Sparkles size={15} />
                    Assistant
                  </div>
                  <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold">
                    <Bot size={18} />
                    TalaShop Concierge
                  </h2>
                  <p className="mt-1 text-sm text-indigo-100/90">
                    Product guidance, shopping answers, and support routing in one place.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
                    aria-label="Close assistant"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-indigo-50">
                {catalogLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Loading live catalog...
                  </>
                ) : catalogReady ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                    Live recommendations ready
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-indigo-200" />
                    Ask anything to get started
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.09),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-4 py-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-3xl px-4 py-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                          <Bot size={13} />
                          TalaShop Assistant
                        </div>
                      )}

                      <p className="text-sm leading-6">{message.content}</p>

                      {message.products?.length ? (
                        <div className="mt-4 space-y-3">
                          {message.products.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                router.push(`/product/${product.slug}`);
                              }}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-white"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {product.name}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {product.categoryName || "Store pick"}
                                  </div>
                                </div>

                                {product.badge && (
                                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                                    {product.badge}
                                  </span>
                                )}
                              </div>

                              <div className="mt-3 flex items-center justify-between text-sm">
                                <span className="font-semibold text-slate-900">
                                  {typeof product.price === "number"
                                    ? formatPrice(product.price)
                                    : "Price unavailable"}
                                </span>
                                <span
                                  className={`font-medium ${
                                    product.isAvailable
                                      ? "text-emerald-600"
                                      : "text-rose-500"
                                  }`}
                                >
                                  {product.isAvailable ? "In stock" : "Out of stock"}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {message.actions?.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {message.actions.map((action) => (
                            <button
                              key={`${message.id}-${action.label}`}
                              type="button"
                              onClick={() => {
                                void handleAction(action);
                              }}
                              disabled={isTyping}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                        <Bot size={13} />
                        TalaShop Assistant
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 size={14} className="animate-spin" />
                        Thinking through the best answer...
                      </div>
                    </div>
                  </div>
                )}

                <div ref={endOfMessagesRef} />
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="border-t border-slate-200 bg-white p-3">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="assistant-input" className="sr-only">
                    Ask the shopping assistant a question
                  </label>
                  <input
                    id="assistant-input"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask about products, orders, returns, or support"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!draft.trim() || isTyping}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  aria-label="Send message"
                >
                  <SendHorizontal size={18} />
                </button>
              </div>
            </form>
          </motion.section>
        ) : (
          <motion.button
            key="assistant-button"
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-3 rounded-full bg-slate-950 px-4 py-3 text-white shadow-[0_20px_45px_rgba(15,23,42,0.22)] transition hover:bg-indigo-600"
            aria-label="Open TalaShop assistant"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12">
              <MessageCircleMore size={20} />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs uppercase tracking-[0.22em] text-indigo-200">
                Need help?
              </span>
              <span className="block text-sm font-semibold">Ask TalaShop Assistant</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreAssistant;
