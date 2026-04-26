"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import MainLayout from "@/app/components/templates/MainLayout";
import {
  useResendVerificationEmailMutation,
  useVerifyEmailMutation,
} from "@/app/store/apis/AuthApi";

const getErrorMessage = (error: any) =>
  error?.data?.message || "Something went wrong. Please try again.";

const VerifyEmailPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() || "",
    [searchParams]
  );
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [resendVerificationEmail, { isLoading: isResending }] =
    useResendVerificationEmailMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      setErrorMessage("We couldn't find your email address. Please sign up again.");
      setSuccessMessage("");
      return;
    }

    if (code.trim().length !== 6) {
      setErrorMessage("Enter the 6-digit verification code from your email.");
      setSuccessMessage("");
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage("");
      await verifyEmail({
        email,
        emailVerificationToken: code.trim(),
      }).unwrap();
      router.push("/");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSuccessMessage("");
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMessage("Start from sign up so we know where to send the code.");
      setSuccessMessage("");
      return;
    }

    try {
      setErrorMessage("");
      const response = await resendVerificationEmail({ email }).unwrap();
      setSuccessMessage(response.message);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setSuccessMessage("");
    }
  };

  return (
    <MainLayout>
      <div className="flex min-h-screen items-center justify-center py-12">
        <main className="w-full max-w-xl overflow-hidden rounded-[28px] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
          <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-500 px-6 py-8 text-white sm:px-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <MailCheck className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              Verify Your Email
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/90 sm:text-base">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-white">
                {email || "your email address"}
              </span>
              . Enter it below to finish creating your account.
            </p>
          </div>

          <div className="px-6 py-8 sm:px-8">
            {errorMessage && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="verification-code"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Verification code
                </label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-4 text-center text-2xl font-semibold tracking-[0.35em] text-gray-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 ${
                  isLoading ? "cursor-not-allowed bg-indigo-400" : ""
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Verify Email"
                )}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200 px-4 py-3 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-50 ${
                  isResending ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Resend code
              </button>

              <div className="text-sm text-gray-600">
                Wrong email?{" "}
                <Link
                  href="/sign-up"
                  className="font-medium text-indigo-600 hover:underline"
                >
                  Create a new account
                </Link>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              Already verified?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-indigo-600 hover:underline"
              >
                Return to sign in
              </Link>
            </div>
          </div>
        </main>
      </div>
    </MainLayout>
  );
};

export default VerifyEmailPage;
