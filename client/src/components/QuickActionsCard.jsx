import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Edit } from "lucide-react";

export default function QuickActionsCard() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/properties/new" className="w-full">
            <Button className="w-full rounded-xl">Add New Property</Button>
          </Link>
          <Link to="/properties" className="w-full">
            <Button variant="secondary" className="w-full rounded-xl">
              Manage Properties
            </Button>
          </Link>
        </div>
        
      </CardContent>
    </Card>
  );
}
