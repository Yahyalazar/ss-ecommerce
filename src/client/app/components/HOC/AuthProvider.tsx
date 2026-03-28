import { useLazyGetMeQuery } from "@/app/store/apis/UserApi";
import { useAppDispatch } from "@/app/store/hooks";
import { logout, setUser } from "@/app/store/slices/AuthSlice";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const [triggerGetMe] = useLazyGetMeQuery();

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      console.log("📡 [AuthProvider] Initializing auth check...");
      try {
        console.log("📡 [AuthProvider] Calling triggerGetMe()...");
        const response = await triggerGetMe().unwrap();
        
        if (!isMounted) return;
        
        console.log("✅ [AuthProvider] Auth check succeeded. User:", response.user ? "present" : "not present");
        
        const user = response.user;
        if (user) {
          console.log("✅ [AuthProvider] User logged in:", user);
          dispatch(setUser({ user }));
        } else {
          console.warn("⚠️ [AuthProvider] No user data in response");
          dispatch(logout());
        }
      } catch (error: any) {
        if (!isMounted) return;

        // If it's a 401, user is unauthenticated — expected
        if (error?.status === 401) {
          console.log(
            "📡 [AuthProvider] No authenticated session found. Continuing as guest."
          );
          dispatch(logout());
        } else {
          console.error("🔴 [AuthProvider] Auth error:");
          console.error("  Error object:", error);
          console.error("  Error status:", error?.status);
          console.error(
            "  Error message:",
            error?.data?.message || error?.error || error?.message
          );
          console.error("❌ [AuthProvider] Unexpected auth error:", error);
          dispatch(logout());
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [triggerGetMe, dispatch]);

  return <>{children}</>;
}
