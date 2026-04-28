import AppError from "@/shared/errors/AppError";
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

export interface Context {
  prisma: PrismaClient;
  req: Request;
  res: Response;
}

export const productResolvers = {
  Query: {
    products: async (
      _: any,
      {
        first = 10,
        skip = 0,
        filters = {},
      }: {
        first?: number;
        skip?: number;
        filters?: {
          search?: string;
          isNew?: boolean;
          isFeatured?: boolean;
          isTrending?: boolean;
          isBestSeller?: boolean;
          minPrice?: number;
          maxPrice?: number;
          categoryId?: string;
          color?: string;
          gender?: string;
          flags?: string[];
        };
      },
      context: Context
    ) => {
      const where: any = {};
      const variantFilters: any = {};
      const attributeConditions: any[] = [];

      const normalizedColor = filters.color?.trim().toLowerCase();
      const normalizedGender = filters.gender?.trim().toLowerCase();

      // Search filter
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      // Flag filters
      if (filters.isNew !== undefined) where.isNew = filters.isNew;
      if (filters.isFeatured !== undefined)
        where.isFeatured = filters.isFeatured;
      if (filters.isTrending !== undefined)
        where.isTrending = filters.isTrending;
      if (filters.isBestSeller !== undefined)
        where.isBestSeller = filters.isBestSeller;

      // ✅ OR logic for multiple flags
      if (filters.flags && filters.flags.length > 0) {
        const flagConditions = filters.flags.map((flag) => ({ [flag]: true }));
        if (!where.OR) where.OR = [];
        where.OR = [...where.OR, ...flagConditions];
      }

      // Category filter
      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      // Price filter (based on variants)
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        variantFilters.price = {
          ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
          ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
        };
      }

      if (normalizedColor) {
        attributeConditions.push({
          attributes: {
            some: {
              attribute: {
                slug: "color",
              },
              value: {
                slug: normalizedColor,
              },
            },
          },
        });
      }

      if (normalizedGender) {
        attributeConditions.push({
          attributes: {
            some: {
              attribute: {
                slug: "gender",
              },
              value: {
                slug: normalizedGender,
              },
            },
          },
        });
      }

      if (attributeConditions.length === 1) {
        Object.assign(variantFilters, attributeConditions[0]);
      } else if (attributeConditions.length > 1) {
        variantFilters.AND = attributeConditions;
      }

      if (Object.keys(variantFilters).length > 0) {
        where.variants = {
          some: variantFilters,
        };
      }

      const totalCount = await context.prisma.product.count({ where });
      const products = await context.prisma.product.findMany({
        where,
        take: first,
        skip,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: true,
          variants: true,
          reviews: true,
        },
      });

      return {
        products,
        hasMore: skip + products.length < totalCount,
        totalCount,
      };
    },
    product: async (_: any, { slug }: { slug: string }, context: Context) => {
      const product = await context.prisma.product.findUnique({
        where: { slug },
        include: {
          category: true,
          variants: {
            include: {
              attributes: {
                include: {
                  attribute: true,
                  value: true,
                },
              },
            },
          },
          reviews: true,
        },
      });
      if (!product) {
        throw new AppError(404, "Product not found");
      }
      return product;
    },
    newProducts: async (
      _: any,
      { first = 10, skip = 0 }: { first?: number; skip?: number },
      context: Context
    ) => {
      const totalCount = await context.prisma.product.count({
        where: { isNew: true },
      });
      const products = await context.prisma.product.findMany({
        where: { isNew: true },
        take: first,
        skip,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: true,
          variants: true,
          reviews: true,
        },
      });
      return {
        products,
        hasMore: skip + products.length < totalCount,
        totalCount,
      };
    },
    featuredProducts: async (
      _: any,
      { first = 10, skip = 0 }: { first?: number; skip?: number },
      context: Context
    ) => {
      const totalCount = await context.prisma.product.count({
        where: { isFeatured: true },
      });
      const products = await context.prisma.product.findMany({
        where: { isFeatured: true },
        take: first,
        skip,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: true,
          variants: true,
          reviews: true,
        },
      });
      return {
        products,
        hasMore: skip + products.length < totalCount,
        totalCount,
      };
    },
    trendingProducts: async (
      _: any,
      { first = 10, skip = 0 }: { first?: number; skip?: number },
      context: Context
    ) => {
      const totalCount = await context.prisma.product.count({
        where: { isTrending: true },
      });
      const products = await context.prisma.product.findMany({
        where: { isTrending: true },
        take: first,
        skip,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: true,
          variants: true,
          reviews: true,
        },
      });
      return {
        products,
        hasMore: skip + products.length < totalCount,
        totalCount,
      };
    },
    bestSellerProducts: async (
      _: any,
      { first = 10, skip = 0 }: { first?: number; skip?: number },
      context: Context
    ) => {
      const totalCount = await context.prisma.product.count({
        where: { isBestSeller: true },
      });
      const products = await context.prisma.product.findMany({
        where: { isBestSeller: true },
        take: first,
        skip,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          category: true,
          variants: true,
          reviews: true,
        },
      });
      return {
        products,
        hasMore: skip + products.length < totalCount,
        totalCount,
      };
    },
    categories: async (_: any, __: any, context: Context) => {
      return context.prisma.category.findMany({
        include: {
          products: {
            include: {
              variants: true,
            },
          },
        },
      });
    },
    shopFilterOptions: async (_: any, __: any, context: Context) => {
      const variantAttributes = await context.prisma.productVariantAttribute.findMany(
        {
          where: {
            attribute: {
              slug: {
                in: ["color", "gender"],
              },
            },
          },
          include: {
            attribute: true,
            value: true,
          },
        }
      );

      const grouped = {
        colors: [] as Array<{ id: string; value: string; slug: string }>,
        genders: [] as Array<{ id: string; value: string; slug: string }>,
      };

      const seen = {
        colors: new Set<string>(),
        genders: new Set<string>(),
      };

      for (const item of variantAttributes) {
        const targetKey =
          item.attribute.slug === "color"
            ? "colors"
            : item.attribute.slug === "gender"
            ? "genders"
            : null;

        if (!targetKey || seen[targetKey].has(item.value.id)) continue;

        seen[targetKey].add(item.value.id);
        grouped[targetKey].push({
          id: item.value.id,
          value: item.value.value,
          slug: item.value.slug,
        });
      }

      grouped.colors.sort((a, b) => a.value.localeCompare(b.value));
      grouped.genders.sort((a, b) => a.value.localeCompare(b.value));

      return grouped;
    },
  },

  Product: {
    reviews: (parent: any, _: any, context: Context) => {
      return context.prisma.review.findMany({
        where: { productId: parent.id },
        include: {
          user: true,
        },
      });
    },
  },
};
