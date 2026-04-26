"use client";
import Footer from "../layout/Footer";
import Navbar from "../layout/Navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen w-full flex-col">
      <Navbar />
      <div className="flex w-full flex-1 min-h-0 flex-col px-4 sm:px-6 lg:px-8 xl:mx-auto xl:max-w-7xl">
        {children}
      </div>
      <Footer />
    </main>
  );
}
