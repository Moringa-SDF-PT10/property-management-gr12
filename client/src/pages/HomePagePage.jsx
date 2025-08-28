import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Plus, User } from "lucide-react";
import OccupancyWidget from "../components/OccupancyWidget.jsx";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-5 gap-6 items-start">
        <div className="md:col-span-3">
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-extrabold tracking-tight"
          >
            Welcome back, {User.name}
          </motion.h1>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/properties">
              <Button className="rounded-xl">
                <Building2 className="h-4 w-4 mr-2" /> Manage Properties
              </Button>
            </Link>
            <Link to="/properties/new">
              <Button variant="secondary" className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Add Property
              </Button>
            </Link>
          </div>
        </div>
        <div className="md:col-span-2">
          <OccupancyWidget />
        </div>
      </div>
    </div>
  );
}
