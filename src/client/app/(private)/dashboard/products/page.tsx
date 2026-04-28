"use client";
import Table from "@/app/components/layout/Table";
import {
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetAllProductsQuery,
  useUpdateProductMutation,
} from "@/app/store/apis/ProductApi";
import { useState } from "react";
import ProductModal from "./ProductModal";
import { Trash2, Edit, Upload, X } from "lucide-react";
import ConfirmModal from "@/app/components/organisms/ConfirmModal";
import useToast from "@/app/hooks/ui/useToast";
import ProductFileUpload from "./ProductFileUpload";
import { usePathname } from "next/navigation";
import { ProductFormData } from "./product.types";
import { withAuth } from "@/app/components/HOC/WithAuth";
import useQueryParams from "@/app/hooks/network/useQueryParams";
import { useMemo } from "react";

const ProductsDashboard = () => {
  const { showToast } = useToast();
  const [createProduct, { isLoading: isCreating, error: createError }] =
    useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating, error: updateError }] =
    useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const pathname = usePathname();
  const shouldFetchProducts = pathname === "/dashboard/products";
  const { query } = useQueryParams();

  const productQueryParams = useMemo(
    () => ({
      page: query.page || "1",
      limit: query.limit || "16",
      sort: query.sort || undefined,
      searchQuery: query.searchQuery || undefined,
    }),
    [query.limit, query.page, query.searchQuery, query.sort]
  );

  const { data, isLoading } = useGetAllProductsQuery(
    productQueryParams,
    { skip: !shouldFetchProducts }
  );
  const products = data?.products || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductFormData | null>(
    null
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);

  const handleCreateProduct = async (data: ProductFormData) => {
    const payload = new FormData();
    payload.append("name", data.name || "");
    payload.append("description", data.description || "");
    payload.append("isNew", data.isNew.toString());
    payload.append("isTrending", data.isTrending.toString());
    payload.append("isBestSeller", data.isBestSeller.toString());
    payload.append("isFeatured", data.isFeatured.toString());
    payload.append("categoryId", data.categoryId || "");

    // Track image indexes for each variant
    let imageIndex = 0;
    data.variants.forEach((variant, index) => {
      payload.append(`variants[${index}][sku]`, variant.sku || "");
      payload.append(`variants[${index}][price]`, variant.price.toString());
      payload.append(`variants[${index}][stock]`, variant.stock.toString());
      payload.append(
        `variants[${index}][lowStockThreshold]`,
        variant.lowStockThreshold?.toString() || "10"
      );
      payload.append(`variants[${index}][barcode]`, variant.barcode || "");
      payload.append(
        `variants[${index}][warehouseLocation]`,
        variant.warehouseLocation || ""
      );
      // Append attributes as JSON
      payload.append(
        `variants[${index}][attributes]`,
        JSON.stringify(variant.attributes || [])
      );
      // Track image indexes for this variant
      if (Array.isArray(variant.images) && variant.images.length > 0) {
        const imageIndexes = variant.images
          .map((file) => {
            if (file instanceof File) {
              payload.append(`images`, file);
              return imageIndex++;
            }
            return null;
          })
          .filter((idx) => idx !== null);
        payload.append(
          `variants[${index}][imageIndexes]`,
          JSON.stringify(imageIndexes)
        );
      } else {
        payload.append(`variants[${index}][imageIndexes]`, JSON.stringify([]));
      }
    });

    // Log the payload for debugging
    console.log("Creating product with payload:");
    for (const [key, value] of payload.entries()) {
      console.log(`${key}:`, value);
    }

    try {
      console.log("Submitting product to API...");
      await createProduct(payload).unwrap();
      setIsModalOpen(false);
      showToast("Product created successfully", "success");
    } catch (err: unknown) {
      const errorObject = err as any;
      const errorMessage = 
        errorObject?.data?.message || 
        errorObject?.message || 
        JSON.stringify(errorObject?.data) ||
        "Unknown error occurred";
      
      // Check if it's a network error
      if (errorObject?.status === "FETCH_ERROR") {
        console.error("❌ NETWORK ERROR - API Server not responding");
        console.error("Is http://localhost:5000/api/v1 running?");
        console.error("Full error:", errorObject?.error);
        showToast("API server not responding. Make sure the backend is running.", "error");
      } else {
        console.error("Failed to create product - Status:", errorObject?.status);
        console.error("Failed to create product - Message:", errorMessage);
        console.error("Failed to create product - Full error:", errorObject);
        showToast(errorMessage || "Failed to create product", "error");
      }
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!editingProduct) return;

    const payload = new FormData();
    payload.append("name", data.name || "");
    payload.append("description", data.description || "");
    payload.append("isNew", data.isNew.toString());
    payload.append("isTrending", data.isTrending.toString());
    payload.append("isBestSeller", data.isBestSeller.toString());
    payload.append("isFeatured", data.isFeatured.toString());
    payload.append("categoryId", data.categoryId || "");

    let imageIndex = 0;
    data.variants.forEach((variant, index) => {
      payload.append(`variants[${index}][id]`, variant.id || "");
      payload.append(`variants[${index}][sku]`, variant.sku || "");
      payload.append(`variants[${index}][price]`, variant.price.toString());
      payload.append(`variants[${index}][stock]`, variant.stock.toString());
      payload.append(
        `variants[${index}][lowStockThreshold]`,
        variant.lowStockThreshold?.toString() || "10"
      );
      payload.append(`variants[${index}][barcode]`, variant.barcode || "");
      payload.append(
        `variants[${index}][warehouseLocation]`,
        variant.warehouseLocation || ""
      );
      payload.append(
        `variants[${index}][attributes]`,
        JSON.stringify(variant.attributes || [])
      );

      const existingImages = variant.images.filter(
        (image): image is string => typeof image === "string"
      );
      payload.append(
        `variants[${index}][images]`,
        JSON.stringify(existingImages)
      );

      const imageIndexes = variant.images
        .map((image) => {
          if (image instanceof File) {
            payload.append("images", image);
            return imageIndex++;
          }

          return null;
        })
        .filter((idx): idx is number => idx !== null);

      payload.append(
        `variants[${index}][imageIndexes]`,
        JSON.stringify(imageIndexes)
      );
    });

    try {
      await updateProduct({
        id: editingProduct.id!,
        data: payload,
      }).unwrap();
      setIsModalOpen(false);
      setEditingProduct(null);
      showToast("Product updated successfully", "success");
    } catch (err: unknown) {
      const errorObject = err as any;
      const errorMessage = 
        errorObject?.data?.message || 
        errorObject?.error ||
        errorObject?.message || 
        JSON.stringify(errorObject?.data) ||
        "Unknown error occurred";
      console.error("Failed to update product - Status:", errorObject?.status);
      console.error("Failed to update product - Message:", errorMessage);
      console.error("Failed to update product - Full error:", errorObject);
      showToast(errorMessage || "Failed to update product", "error");
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete).unwrap();
      setIsConfirmModalOpen(false);
      setProductToDelete(null);
      showToast("Product deleted successfully", "success");
    } catch (err: unknown) {
      const errorObject = err as any;
      const errorMessage = 
        errorObject?.data?.message || 
        errorObject?.message || 
        JSON.stringify(errorObject?.data) ||
        "Unknown error occurred";
      console.error("Failed to delete product - Status:", errorObject?.status);
      console.error("Failed to delete product - Message:", errorMessage);
      console.error("Failed to delete product - Full error:", errorObject);
      showToast(errorMessage || "Failed to delete product", "error");
    }
  };

  const cancelDelete = () => {
    setIsConfirmModalOpen(false);
    setProductToDelete(null);
  };

  const handleFileUploadSuccess = () => {};

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row: any) => (
        <div className="flex items-center space-x-2">
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      key: "variants",
      label: "Variants",
      sortable: false,
      render: (row: any) => (
        <div>
          {row.variants?.length > 0 ? (
            row.variants.map((v: any) => (
              <span
                key={v.id}
                className="inline-block mr-2 bg-gray-100 px-2 py-1 rounded"
              >
                {v.sku}
              </span>
            ))
          ) : (
            <span className="text-gray-500">No variants</span>
          )}
        </div>
      ),
    },
    {
      key: "salesCount",
      label: "Sales Count",
      sortable: true,
      render: (row: any) => row.salesCount,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingProduct({
                id: row.id,
                name: row.name,
                isNew: row.isNew,
                isTrending: row.isTrending,
                isBestSeller: row.isBestSeller,
                isFeatured: row.isFeatured,
                categoryId: row.categoryId,
                description: row.description || "",
                variants: row.variants || [],
              });
              setIsModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={() => handleDeleteProduct(row.id)}
            className="text-red-600 hover:text-red-800 flex items-center gap-1"
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            {isDeleting && productToDelete === row.id
              ? "Deleting..."
              : "Delete"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-semibold">Product List</h1>
          <p className="text-sm text-gray-500">Manage and view your products</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsFileUploadOpen(!isFileUploadOpen)}
            className="px-4 py-2 bg-[#5d8a02] text-white rounded-md flex items-center"
          >
            <Upload className="mr-2 h-4 w-4" />
            Excel Sheet
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Product
          </button>
        </div>
      </div>

      {isFileUploadOpen && (
        <div className="mb-6 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium">Import Products</h2>
            <button
              onClick={() => setIsFileUploadOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <ProductFileUpload onUploadSuccess={handleFileUploadSuccess} />
        </div>
      )}

      <Table
        data={products}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No products available"
        onRefresh={() => console.log("refreshed")}
        totalPages={data?.totalPages}
        totalResults={data?.totalResults}
        resultsPerPage={data?.resultsPerPage}
        currentPage={data?.currentPage}
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        initialData={editingProduct || undefined}
        isLoading={editingProduct ? isUpdating : isCreating}
        error={editingProduct ? updateError : createError}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default withAuth(ProductsDashboard);
