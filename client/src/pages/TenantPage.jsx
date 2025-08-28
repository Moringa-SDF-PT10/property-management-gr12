import { Link } from "react-router-dom"; // Assuming you might want to link to lease details
import { Button } from "@/components/ui/button"; // Using existing UI component
import { Badge } from "@/components/ui/badge";

const TenantTable = ({ tenants, type }) => {
  if (!tenants || tenants.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-sm">
        No tenants found {type === 'up_to_date' ? 'up to date' : 'behind on rent'}.
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monthly Rent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Payment
              </th>
              {type === 'behind' && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Behind
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Owed
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((lease) => (
              <tr key={lease.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {lease.tenant?.first_name} {lease.tenant?.last_name}
                  </div>
                  <div className="text-sm text-gray-500">{lease.tenant?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <Link to={`/properties/${lease.property_id}`} className="text-blue-600 hover:underline">
                    {lease.property?.name || `Property #${lease.property_id}`}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  KES {Number(lease.rent_amount).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lease.last_rent_paid_date ? new Date(lease.last_rent_paid_date).toLocaleDateString() : 'Never'}
                </td>
                {type === 'behind' && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-red-100 text-red-800 rounded-full">
                        {lease.days_behind_rent} days
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      KES {Number(lease.outstanding_rent).toLocaleString()}
                    </td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <Link to={`/leases/${lease.id}`} className="text-blue-600 hover:text-blue-900 mr-3">
                    <Button variant="link" className="p-0 h-auto">View Lease</Button>
                  </Link>
                  {type === 'behind' && (
                    <Button variant="link" className="p-0 h-auto text-orange-600 hover:text-orange-900"
                      onClick={() => alert(`Sending reminder to ${lease.tenant?.email}`)} // Placeholder
                    >
                      Send Reminder
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TenantTable;