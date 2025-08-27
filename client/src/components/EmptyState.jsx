import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

export default function EmptyState() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-12 text-center text-slate-500">
        <Building2 className="h-8 w-8 mx-auto mb-3 text-slate-400" />
        <p className="mb-4">No properties match your filters.</p>
        <Link to="/properties/new">
          <Button className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Add your first property
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
