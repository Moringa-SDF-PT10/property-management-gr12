import { motion } from "framer-motion";
import OccupancyWidget from "../components/OccupancyWidget.jsx";
import QuickActionsCard from "../components/QuickActionsCard.jsx";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold tracking-tight"
      >
        Landlord Dashboard
      </motion.h1>
      <div className="grid md:grid-cols-2 gap-6">
        <OccupancyWidget />
        <QuickActionsCard />
      </div>
    </div>
  );
}