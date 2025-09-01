import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Plus, Edit } from "lucide-react";

import InlineError from "../components/InlineError.jsx";
import { API_BASE_URL } from "../api/api.js";

function FieldError({ children }) {
  return <div className="mt-1 text-xs text-red-600">{children}</div>;
}

export default function PropertyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [initial, setInitial] = useState({
    name: "",
    location: "",
    rent: "",
    status: "vacant",
    pictures: [],
  });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  // Function to get the access token
  const getAccessToken = () => localStorage.getItem("accessToken");

  // Fetch property if editing
  useEffect(() => {
    let mounted = true;
    if (isEdit) {
      (async () => {
        try {
          setLoading(true);
          const token = getAccessToken(); // Get token for fetching
          if (!token) {
            navigate("/auth/login", { state: { message: "Please log in to view properties." } });
            return;
          }

          const res = await fetch(`${API_BASE_URL}/properties/${id}`, {
            headers: {
              "Authorization": `Bearer ${token}`, // Include token for GET request too
            },
          });
          if (res.status === 401) {
            // Handle unauthorized for GET
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            navigate("/auth/login", { state: { message: "Your session expired. Please log in again." } });
            return;
          }
          if (!res.ok) throw new Error("Failed to fetch property");
          const data = await res.json();
          if (mounted) {
            setInitial({
              name: data.name || "",
              location: data.location || "",
              rent: data.rent ?? "",
              status: data.status || "vacant",
              pictures: data.pictures || [],
            });
          }
        } catch (e) {
          setError(e.message);
        } finally {
          if (mounted) setLoading(false);
        }
      })();
    }
    return () => (mounted = false);
  }, [id, isEdit, navigate]); // Added navigate to dependencies

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initial,
    validationSchema: Yup.object({
      name: Yup.string().min(2).max(100).required("Name is required"),
      location: Yup.string().min(2).max(150).required("Location is required"),
      rent: Yup.number().typeError("Rent must be a number").min(0, "Rent cannot be negative").required("Rent is required"),
      status: Yup.string().oneOf(["occupied", "vacant"]).required(),
      pictures: Yup.array().of(Yup.string().url("Must be a valid URL")).nullable(), // list of URLs
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const url = isEdit ? `${API_BASE_URL}/properties/${id}` : `${API_BASE_URL}/properties`;
        const method = isEdit ? "PUT" : "POST";

        const token = getAccessToken(); // Get the access token

        if (!token) {
          alert("You must be logged in to perform this action.");
          navigate("/auth/login", { state: { message: "Please log in." } });
          return;
        }

        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`, // <-- IMPORTANT: Add this header
          },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const errorData = await res.json(); // Try to parse error message from backend
          if (res.status === 401) {
            alert("Unauthorized. Your session might have expired. Please log in again.");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            navigate("/auth/login", { state: { message: "Your session expired. Please log in again." } });
            return;
          }
          throw new Error(errorData.message || `Request failed with status ${res.status}`);
        }

        const data = await res.json();
        alert(data.message || "Property saved successfully!");
        resetForm();
        navigate("/properties"); // Assuming landlords manage properties and navigate here after success
      } catch (e) {
        alert(e.message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto py-8 px-4"> {/* Added mx-auto py-8 px-4 for better centering/padding */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{isEdit ? "Edit Property" : "Add New Property"}</h1>

      {loading ? (
        <div className="h-40 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      ) : error ? (
        <InlineError message={error} />
      ) : (
        <form onSubmit={formik.handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...formik.getFieldProps("name")} placeholder="Apartment A" className="rounded-xl" />
            {formik.touched.name && formik.errors.name ? <FieldError>{formik.errors.name}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...formik.getFieldProps("location")} placeholder="Nairobi, Kilimani" className="rounded-xl" />
            {formik.touched.location && formik.errors.location ? <FieldError>{formik.errors.location}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor="rent">Monthly Rent (KES)</Label>
            <Input id="rent" {...formik.getFieldProps("rent")} placeholder="35000" className="rounded-xl" />
            {formik.touched.rent && formik.errors.rent ? <FieldError>{formik.errors.rent}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formik.values.status} onValueChange={(val) => formik.setFieldValue("status", val)}>
              <SelectTrigger className="rounded-xl" id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
              </SelectContent>
            </Select>
            {formik.touched.status && formik.errors.status ? <FieldError>{formik.errors.status}</FieldError> : null}
          </div>

          {/* New field for Pictures - assuming a single URL input for simplicity, or a comma-separated list */}
          <div>
            <Label htmlFor="pictures">Pictures (Comma-separated URLs)</Label>
            <Input
              id="pictures"
              value={formik.values.pictures.join(', ')} // Display array as comma-separated string
              onChange={(e) => {
                // Convert comma-separated string back to array of URLs
                const urls = e.target.value
                  .split(',')
                  .map(url => url.trim())
                  .filter(url => url !== ''); // Remove empty strings
                formik.setFieldValue("pictures", urls);
              }}
              onBlur={formik.handleBlur} // Important for validation
              placeholder="https://example.com/pic1.jpg, https://example.com/pic2.jpg"
              className="rounded-xl"
            />
            {formik.touched.pictures && formik.errors.pictures ? <FieldError>{formik.errors.pictures}</FieldError> : null}
          </div>


          <div className="pt-2 flex items-center gap-3">
            <Button type="submit" disabled={formik.isSubmitting} className="rounded-xl">
              {isEdit ? <><Edit className="h-4 w-4 mr-2" /> Update</> : <><Plus className="h-4 w-4 mr-2" /> Create</>}
            </Button>
            <Link to="/landlord/dashboard"> {/* Changed to dashboard as a common redirect after property actions */}
              <Button type="button" variant="secondary" className="rounded-xl">Cancel</Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}