import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom"; // For navigation and propertyId from URL
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";

import { Button } from "@/components/ui/button";
import InlineError from "../components/InlineError"; // For error display

const RepairRequestFormPage = () => {
  const navigate = useNavigate();
  const { propertyId } = useParams(); // If property ID is passed in the URL

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'normal'
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);


  const categories = [
    { value: 'general', label: 'General' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'appliances', label: 'Appliances' },
    { value: 'structural', label: 'Structural' },
    { value: 'pest_control', label: 'Pest Control' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!propertyId) {
      setErrorMessage("Property ID is required to submit a repair request.");
      setSubmitting(false);
      return;
    }
    if (!formData.title || !formData.description) {
      setErrorMessage("Title and Description are required fields.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/repairs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          property_id: propertyId
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSuccessMessage("Repair request submitted successfully!");
        setFormData({ title: '', description: '', category: 'general', priority: 'normal' }); // Clear form
        // Optionally navigate away after a short delay
        setTimeout(() => navigate(`/properties/${propertyId}`), 2000);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to submit repair request');
      }
    } catch (error) {
      console.error('Error submitting repair request:', error);
      setErrorMessage('Failed to submit repair request due to a network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <Card className="rounded-2xl shadow-sm max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Submit Repair Request</CardTitle>
        {propertyId && <p className="text-slate-600">For Property ID: {propertyId}</p>}
      </CardHeader>
      <CardContent>
        {errorMessage && <InlineError message={errorMessage} className="mb-4" />}
        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm mb-4">
            {successMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-lg"
              placeholder="Brief description of the issue"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 h-10" // Added h-10 for consistency with Input
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 h-10"
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="mt-1 block w-full rounded-lg"
              placeholder="Detailed description of the repair needed, including any observed symptoms or when it started."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={handleCancel}
              variant="outline"
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className={`rounded-xl ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RepairRequestFormPage