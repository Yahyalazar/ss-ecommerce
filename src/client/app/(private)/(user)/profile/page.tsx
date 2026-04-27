"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle,
  Edit3,
  Gift,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { withAuth } from "@/app/components/HOC/WithAuth";
import MainLayout from "@/app/components/templates/MainLayout";
import {
  useGetMeQuery,
  useUpdateCurrentUserMutation,
  useUpdateNewsletterPreferenceMutation,
} from "@/app/store/apis/UserApi";
import { useResendVerificationEmailMutation } from "@/app/store/apis/AuthApi";
import useToast from "@/app/hooks/ui/useToast";

const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const UserProfile = () => {
  const { data, isLoading, error } = useGetMeQuery(undefined);
  const [updateCurrentUser, { isLoading: isSavingProfile }] =
    useUpdateCurrentUserMutation();
  const [updateNewsletterPreference, { isLoading: isSavingNewsletter }] =
    useUpdateNewsletterPreferenceMutation();
  const [resendVerificationEmail, { isLoading: isResendingVerification }] =
    useResendVerificationEmailMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({ name: "", email: "" });
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!data?.user || isEditing) {
      return;
    }

    setFormValues({
      name: data.user.name || "",
      email: data.user.email || "",
    });
  }, [data?.user, isEditing]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const clearSelectedAvatar = () => {
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl((currentPreview) => {
      if (currentPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startEditing = () => {
    if (!data?.user) {
      return;
    }

    clearSelectedAvatar();
    setFormValues({
      name: data.user.name || "",
      email: data.user.email || "",
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (data?.user) {
      setFormValues({
        name: data.user.name || "",
        email: data.user.email || "",
      });
    }

    clearSelectedAvatar();
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-3 py-4 sm:px-4 sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/90 shadow-xl backdrop-blur-sm">
              <div className="animate-pulse">
                <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 sm:h-40">
                  <div className="absolute -bottom-8 left-4 sm:-bottom-12 sm:left-8">
                    <div className="h-16 w-16 rounded-full border-4 border-white bg-gray-300 sm:h-24 sm:w-24"></div>
                  </div>
                </div>

                <div className="p-4 pt-12 sm:p-8 sm:pt-16">
                  <div className="space-y-4">
                    <div className="h-6 w-48 rounded bg-gray-300"></div>
                    <div className="h-4 w-32 rounded bg-gray-300"></div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {[...Array(4)].map((_, index) => (
                        <div
                          key={index}
                          className="h-20 rounded-xl bg-gray-200"
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !data?.user) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-3 py-4 sm:px-4 sm:py-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border border-red-100 bg-white/90 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-800 sm:text-xl">
                  Profile Error
                </h3>
                <p className="text-sm text-red-600 sm:text-base">
                  Unable to fetch your profile. Please try again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { user } = data;
  const avatarSrc = avatarPreviewUrl || user.avatar;
  const trimmedName = formValues.name.trim();
  const normalizedEmail = formValues.email.trim().toLowerCase();
  const hasProfileChanges =
    !!selectedAvatarFile ||
    trimmedName !== (user.name || "").trim() ||
    normalizedEmail !== user.email;

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRole = (role: string) => {
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  const getRoleColor = (role: string) => {
    const colors = {
      USER: "bg-blue-100 text-blue-800 border-blue-200",
      ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
      SUPERADMIN: "bg-red-100 text-red-800 border-red-200",
    };

    return colors[role as keyof typeof colors] || colors.USER;
  };

  const formatDate = (value?: string) => {
    if (!value) return "Recently";

    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleNewsletterToggle = async () => {
    try {
      await updateNewsletterPreference({
        newsletterSubscribed: !user.newsletterSubscribed,
      }).unwrap();

      showToast(
        !user.newsletterSubscribed
          ? "Newsletter subscription enabled"
          : "Newsletter subscription disabled",
        "success"
      );
    } catch (updateError: any) {
      showToast(
        updateError?.data?.message || "Failed to update newsletter preference",
        "error"
      );
    }
  };

  const handleAvatarButtonClick = () => {
    if (!isEditing) {
      startEditing();
    }

    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      showToast("Please choose a JPG, PNG, GIF, or WebP image.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      showToast("Profile image must be 10MB or smaller.", "error");
      event.target.value = "";
      return;
    }

    clearSelectedAvatar();
    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (trimmedName.length < 2) {
      showToast("Name must be at least 2 characters long.", "error");
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!isValidEmail) {
      showToast("Enter a valid email address.", "error");
      return;
    }

    if (!hasProfileChanges) {
      showToast("No changes to save.", "info");
      return;
    }

    const payload = new FormData();

    if (trimmedName !== (user.name || "").trim()) {
      payload.append("name", trimmedName);
    }

    if (normalizedEmail !== user.email) {
      payload.append("email", normalizedEmail);
    }

    if (selectedAvatarFile) {
      payload.append("avatar", selectedAvatarFile);
    }

    try {
      const previousEmail = user.email;
      const response = await updateCurrentUser(payload).unwrap();

      clearSelectedAvatar();
      setFormValues({
        name: response.user.name || "",
        email: response.user.email || "",
      });
      setIsEditing(false);

      showToast(
        response.user.email !== previousEmail
          ? "Profile updated. Please verify your new email address."
          : "Profile updated successfully.",
        "success"
      );
    } catch (updateError: any) {
      showToast(
        updateError?.data?.message || "Failed to update your profile.",
        "error"
      );
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await resendVerificationEmail({
        email: user.email,
      }).unwrap();

      showToast(response.message, "success");
    } catch (resendError: any) {
      showToast(
        resendError?.data?.message || "Failed to resend verification code.",
        "error"
      );
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-3 py-4 sm:px-4 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={handleAvatarChange}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl border border-white/20 bg-white/90 shadow-xl backdrop-blur-sm"
          >
            <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 sm:h-40">
              <div className="absolute inset-0 bg-black/10"></div>

              <div className="absolute -bottom-8 left-4 sm:-bottom-12 sm:left-8">
                <div className="group relative">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      width={96}
                      height={96}
                      alt="Profile"
                      className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-xl sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl sm:h-24 sm:w-24">
                      <span className="text-lg font-bold text-white sm:text-xl">
                        {getInitials(user.name || user.id)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAvatarButtonClick}
                    className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg transition-opacity duration-200 sm:h-8 sm:w-8 ${
                      isEditing
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Camera className="h-3 w-3 text-gray-600 sm:h-4 sm:w-4" />
                  </button>

                  <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-green-500 sm:h-6 sm:w-6"></div>
                </div>
              </div>

              <div className="absolute right-4 top-4 flex space-x-2">
                <button
                  type="button"
                  className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/30"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/30"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 pt-12 sm:p-8 sm:pt-16">
              <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="mb-1 text-2xl font-bold text-gray-800 sm:text-3xl">
                    {user.name || "User Profile"}
                  </h1>
                  <p className="text-sm text-gray-600 sm:text-base">
                    Manage your account information and preferences
                  </p>
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:px-5 sm:py-3"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      type="submit"
                      form="profile-form"
                      disabled={isSavingProfile}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl sm:px-5 sm:py-3 ${
                        isSavingProfile
                          ? "cursor-not-allowed opacity-70"
                          : ""
                      }`}
                    >
                      {isSavingProfile ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl sm:px-6 sm:py-3"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <motion.form
                  id="profile-form"
                  onSubmit={handleProfileSave}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-5 sm:mb-8 sm:p-6"
                >
                  <div className="mb-5">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Edit Your Details
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Update your name, email address, and profile image.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="profile-name"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Full name
                      </label>
                      <input
                        id="profile-name"
                        type="text"
                        value={formValues.name}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="profile-email"
                        className="mb-2 block text-sm font-medium text-slate-700"
                      >
                        Email address
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        value={formValues.email}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="Enter your email address"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Changing your email sends a new verification code to the
                        updated address.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-indigo-200 bg-white/70 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          Profile image
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedAvatarFile
                            ? selectedAvatarFile.name
                            : "Upload JPG, PNG, GIF, or WebP up to 10MB."}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                        >
                          <Camera className="h-4 w-4" />
                          <span>
                            {selectedAvatarFile ? "Change Image" : "Choose Image"}
                          </span>
                        </button>

                        {selectedAvatarFile ? (
                          <button
                            type="button"
                            onClick={clearSelectedAvatar}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            <X className="h-4 w-4" />
                            <span>Remove Selection</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.form>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6"
                >
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                        Basic Info
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs text-gray-500">Full Name</p>
                      <p className="font-medium text-gray-800">
                        {user.name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-gray-500">User ID</p>
                      <p className="break-all font-mono text-xs text-gray-600">
                        {user.id}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-6"
                >
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                        Contact
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs text-gray-500">
                        Email Address
                      </p>
                      <p className="break-all font-medium text-gray-800">
                        {user.email || "Not provided"}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {user.emailVerified ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-medium text-green-600">
                            Email verified
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-medium text-amber-600">
                            Email not verified
                          </span>
                        </>
                      )}
                    </div>

                    {!user.emailVerified ? (
                      <div className="flex flex-col gap-2 pt-1">
                        <Link
                          href={`/verify-email?email=${encodeURIComponent(
                            user.email
                          )}`}
                          className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100"
                        >
                          Enter verification code
                        </Link>

                        <button
                          type="button"
                          onClick={handleResendVerification}
                          disabled={isResendingVerification}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 ${
                            isResendingVerification
                              ? "cursor-not-allowed opacity-70"
                              : ""
                          }`}
                        >
                          {isResendingVerification ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          <span>Resend code</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl border border-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6"
                >
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <Shield className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                        Role & Status
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 text-xs text-gray-500">Account Role</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getRoleColor(
                          user.role
                        )}`}
                      >
                        {formatRole(user.role)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs font-medium text-green-600">
                        Active
                      </span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl border border-amber-200/50 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 sm:p-6"
                >
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                      <Gift className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                        Loyalty Points
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs text-gray-500">
                        Current Balance
                      </p>
                      <p className="text-3xl font-bold text-amber-700">
                        {user.loyaltyPointsBalance}
                      </p>
                    </div>
                    <p className="text-xs text-amber-700">
                      Points are added when your delivered orders are completed.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-xl border border-orange-200/50 bg-gradient-to-br from-orange-50 to-amber-50 p-4 sm:col-span-2 sm:p-6 lg:col-span-1"
                >
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                        Account Info
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs text-gray-500">Member Since</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-gray-500">Last Updated</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(user.updatedAt)}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="rounded-xl border border-cyan-200/50 bg-gradient-to-br from-cyan-50 to-sky-50 p-4 sm:col-span-2 sm:p-6 lg:col-span-2"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="mb-3 flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
                          <Mail className="h-5 w-5 text-cyan-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                            Email News
                          </h3>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700">
                        {user.newsletterSubscribed
                          ? "You are subscribed to product news, offers, and loyalty updates."
                          : "Subscribe to receive product news, offers, and loyalty updates by email."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleNewsletterToggle}
                      disabled={isSavingNewsletter}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        user.newsletterSubscribed
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : "bg-cyan-600 text-white hover:bg-cyan-700"
                      } ${isSavingNewsletter ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                      {isSavingNewsletter ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      <span>
                        {user.newsletterSubscribed
                          ? "Unsubscribe"
                          : "Subscribe"}
                      </span>
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="rounded-xl border border-gray-200/50 bg-gradient-to-br from-gray-50 to-slate-50 p-4 sm:col-span-2 sm:p-6 lg:col-span-2"
                >
                  <div className="mb-4 flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <Settings className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                        Quick Actions
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={startEditing}
                      className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                        <Edit3 className="h-4 w-4 text-indigo-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        Edit Profile
                      </span>
                    </button>

                    <button
                      type="button"
                      className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-green-300 hover:bg-green-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                        <Shield className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        Security
                      </span>
                    </button>

                    <button
                      type="button"
                      className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-purple-300 hover:bg-purple-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                        <Mail className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        Notifications
                      </span>
                    </button>

                    <button
                      type="button"
                      className="flex flex-col items-center space-y-2 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200 hover:border-red-300 hover:bg-red-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                        <LogOut className="h-4 w-4 text-red-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-700">
                        Sign Out
                      </span>
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
};

export default withAuth(UserProfile);
