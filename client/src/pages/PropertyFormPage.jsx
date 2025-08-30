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
import { API_BASE_URL } from "../api/api.js"; // make sure this is exported

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

  // Fetch property if editing
  useEffect(() => {
    let mounted = true;
    if (isEdit) {
      (async () => {
        try {
          setLoading(true);
          const res = await fetch(`${API_BASE_URL}/properties/${id}`);
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
  }, [id, isEdit]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initial,
    validationSchema: Yup.object({
      name: Yup.string().min(2).max(100).required("Name is required"),
      location: Yup.string().min(2).max(150).required("Location is required"),
      rent: Yup.number().typeError("Rent must be a number").min(0, "Rent cannot be negative").required("Rent is required"),
      status: Yup.string().oneOf(["occupied", "vacant"]).required(),
      pictures: Yup.mixed(), // optional
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("location", values.location);
        formData.append("rent", values.rent);
        formData.append("status", values.status);

        // Append files
        if (values.pictures && values.pictures.length > 0) {
          values.pictures.forEach((file) => formData.append("pictures", file));
        }

        const url = isEdit ? `${API_BASE_URL}/properties/${id}` : `${API_BASE_URL}/properties`;
        const method = isEdit ? "PUT" : "POST";

        const res = await fetch(url, { method, body: formData });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Request failed");
        }

        const data = await res.json();
        alert(data.message || "Property saved successfully!");
        resetForm();
        navigate("/properties");
      } catch (e) {
        alert(e.message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="space-y-4 max-w-2xl">
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
            <Label>Name</Label>
            <Input {...formik.getFieldProps("name")} placeholder="Apartment A" className="rounded-xl" />
            {formik.touched.name && formik.errors.name ? <FieldError>{formik.errors.name}</FieldError> : null}
          </div>

          <div>
            <Label>Location</Label>
            <Input {...formik.getFieldProps("location")} placeholder="Nairobi, Kilimani" className="rounded-xl" />
            {formik.touched.location && formik.errors.location ? <FieldError>{formik.errors.location}</FieldError> : null}
          </div>

          <div>
            <Label>Monthly Rent (KES)</Label>
            <Input {...formik.getFieldProps("rent")} placeholder="35000" className="rounded-xl" />
            {formik.touched.rent && formik.errors.rent ? <FieldError>{formik.errors.rent}</FieldError> : null}
          </div>

          <div>
            <Label>House Pictures</Label>
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.currentTarget.files);
                formik.setFieldValue("pictures", files);
              }}
              className="rounded-xl"
            />
            {formik.touched.pictures && formik.errors.pictures ? <FieldError>{formik.errors.pictures}</FieldError> : null}
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formik.values.status} onValueChange={(val) => formik.setFieldValue("status", val)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="vacant">Vacant</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
              </SelectContent>
            </Select>
            {formik.touched.status && formik.errors.status ? <FieldError>{formik.errors.status}</FieldError> : null}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button type="submit" disabled={formik.isSubmitting} className="rounded-xl">
              {isEdit ? <><Edit className="h-4 w-4 mr-2" /> Update</> : <><Plus className="h-4 w-4 mr-2" /> Create</>}
            </Button>
            <Link to="/properties">
              <Button type="button" variant="secondary" className="rounded-xl">Cancel</Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}