import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { LeafMark } from "@/components/brand/Logo";

export function ProtectedRoute() {
  const { username, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <LeafMark size={40} className="animate-pulse" />
      </div>
    );
  }

  if (!username) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
