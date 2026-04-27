"use client";
import { useQuery } from "@apollo/client";
import { GET_PRODUCTS_SUMMARY } from "./gql/Product";
import { useMemo } from "react";
import groupProductsByFlag from "./utils/groupProductsByFlag";
import SkeletonLoader from "./components/feedback/SkeletonLoader";
import HeroSection from "./(public)/(home)/HeroSection";
import CategoryBar from "./(public)/(home)/CategoryBar";
import ProductSection from "./(public)/product/ProductSection";
import MainLayout from "./components/templates/MainLayout";

const Home = () => {
  const { data, loading, error } = useQuery(GET_PRODUCTS_SUMMARY, {
    variables: { first: 100 },
    fetchPolicy: "no-cache",
  });

  const { featured, trending, newArrivals, bestSellers } = useMemo(() => {
    if (!data?.products?.products)
      return { featured: [], trending: [], newArrivals: [], bestSellers: [] };
    return groupProductsByFlag(data.products.products);
  }, [data]);

  if (loading) {
    return (
      <MainLayout>
        <HeroSection />
        <SkeletonLoader />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <HeroSection />
      <CategoryBar />
      <ProductSection
        title="Featured"
        products={featured}
        loading={false}
        error={error}
        showTitle={true}
      />
      <ProductSection
        title="Trending"
        products={trending}
        loading={false}
        error={error}
        showTitle={true}
      />
      <ProductSection
        title="New Arrivals"
        products={newArrivals}
        loading={false}
        error={error}
        showTitle={true}
      />
      <ProductSection
        title="Best Sellers"
        products={bestSellers}
        loading={false}
        error={error}
        showTitle={true}
      />
    </MainLayout>
  );
};

export default Home;
