"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Headphones,
  LoaderCircle,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useConfirmCheckoutMutation } from "@/app/store/apis/CheckoutApi";

function getCheckoutErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "We couldn't finalize your order yet.";
  }

  const checkoutError = error as {
    data?: { message?: string };
    error?: string;
  };

  if (typeof checkoutError.data?.message === "string") {
    return checkoutError.data.message;
  }

  if (typeof checkoutError.error === "string") {
    return checkoutError.error;
  }

  return "We couldn't finalize your order yet.";
}

const PaymentSucceeded = () => {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const hasAutoConfirmed = React.useRef(false);
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [confirmationError, setConfirmationError] = React.useState<
    string | null
  >(null);
  const [confirmCheckout, { isLoading }] = useConfirmCheckoutMutation();

  const handleConfirmCheckout = async () => {
    if (!sessionId) {
      setConfirmationError(
        "Missing checkout session. Please check your orders page."
      );
      return;
    }

    try {
      setConfirmationError(null);
      const response = await confirmCheckout({ sessionId }).unwrap();
      setOrderId(response.order?.id || sessionId);
    } catch (error) {
      setConfirmationError(getCheckoutErrorMessage(error));
    }
  };

  React.useEffect(() => {
    if (!sessionId || hasAutoConfirmed.current) {
      return;
    }

    hasAutoConfirmed.current = true;
    void handleConfirmCheckout();
  }, [sessionId]);

  const viewOrderHref = orderId ? `/orders/${orderId}` : "/orders";
  const statusIcon = isLoading ? (
    <LoaderCircle size={80} className="animate-spin" />
  ) : confirmationError ? (
    <AlertCircle size={80} />
  ) : (
    <CheckCircle size={80} />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center min-h-screen bg-green-100 p-4"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`mb-6 ${
          confirmationError ? "text-amber-600" : "text-green-600"
        }`}
      >
        {statusIcon}
      </motion.div>

      {/* Success Message */}
      <h1
        className={`text-center text-3xl font-semibold mb-4 ${
          confirmationError ? "text-amber-700" : "text-green-700"
        }`}
      >
        {isLoading
          ? "Finalizing your order..."
          : confirmationError
            ? "Payment received, but order sync needs attention"
            : "Your payment was successful!"}
      </h1>

      <p className="text-center text-lg text-gray-700 mb-3">
        {isLoading
          ? "Please wait while we create your order and update your account."
          : confirmationError
            ? confirmationError
            : "Thank you for your purchase. Your order has been processed."}
      </p>

      {orderId && (
        <p className="text-sm text-gray-600 mb-6">Order reference: {orderId}</p>
      )}

      {/* Helpful Links */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {confirmationError && (
          <button
            onClick={handleConfirmCheckout}
            disabled={isLoading}
            className="flex items-center space-x-2 text-sm font-medium text-amber-600 hover:text-amber-800 disabled:opacity-60"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            <span>Retry Sync</span>
          </button>
        )}
        <Link
          href={viewOrderHref}
          className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <ShoppingCart size={18} />
          <span>{orderId ? "View Order" : "View Orders"}</span>
        </Link>
        <Link
          href={"/support"}
          className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          <Headphones size={18} />
          <span>Contact Support</span>
        </Link>
      </div>
    </motion.div>
  );
};

export default PaymentSucceeded;
