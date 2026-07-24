import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mx-auto max-w-7xl p-6 lg:p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
