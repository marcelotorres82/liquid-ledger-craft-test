import { useLocation, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Home, TrendingUp, TrendingDown, PiggyBank, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/income", icon: TrendingUp, label: "Receitas" },
  { path: "/expenses", icon: TrendingDown, label: "Despesas" },
  { path: "/savings", icon: PiggyBank, label: "Caixinhas" },
  { path: "/analytics", icon: BarChart3, label: "Análise" },
];

const FloatingTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  // iOS 26 style: shrink and expand based on scroll
  const tabHeight = useTransform(scrollY, [0, 80], [68, 56]);
  const tabPadding = useTransform(scrollY, [0, 80], [6, 4]);
  const tabOpacity = useTransform(scrollY, [0, 50], [1, 0.95]);

  return (
    <div className="floating-tab-wrap fixed left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-lg transition-opacity duration-200 [bottom:calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.28 }}
        style={{ opacity: tabOpacity }}
        className="mx-auto w-full"
      >
        <motion.nav 
          style={{ height: tabHeight, padding: tabPadding }}
          className="liquid-glass w-full grid grid-cols-5 items-center gap-1 overflow-hidden"
        >
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "relative h-full min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 rounded-2xl transition-all duration-300 tap-highlight-none",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-x-1 inset-y-1 bg-white/15 dark:bg-white/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 360, damping: 32 }}
                  />
                )}
                <tab.icon className="w-5 h-5 relative z-10" strokeWidth={isActive ? 2.4 : 2} />
                <span className="w-full truncate text-center text-[10px] font-medium relative z-10 tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.nav>
      </motion.div>
    </div>
  );
};

export default FloatingTabBar;

