
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createLease } from "../api/api";  


const LeaseSchema = Yup.object().shape({
  property_id: Yup.number().required("Property is required"),
  start_date: Yup.date().required("Start date is required"),
  end_date: Yup.date().required("End date is required"),
  rent_amount: Yup.number().min(1000, "Rent too low").required("Rent is required"),
});

export default function LeaseFormPage() {
  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4">Lease Booking</h2>

      <Formik
        initialValues={{
          property_id: "",
          start_date: "",
          end_date: "",
          rent_amount: "",
        }}
        validationSchema={LeaseSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          try {
            // Call backend using helper
            const userId = 1; // temp hardcoded, later from auth by chege
            const res = await createLease(values);

            alert("Lease created successfully!");
            resetForm();
            console.log("Lease response:", res);
          } catch (err) {
            alert("Error: " + err.message);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            {/* Property ID */}
            <div>
              <label className="block">Property ID</label>
              <Field
                name="property_id"
                type="number"
                className="w-full border rounded px-3 py-2"
              />
              <ErrorMessage name="property_id" component="div" className="text-red-500 text-sm" />
            </div>

            {/* Start Date */}
            <div>
              <label className="block">Start Date</label>
              <Field
                name="start_date"
                type="date"
                className="w-full border rounded px-3 py-2"
              />
              <ErrorMessage name="start_date" component="div" className="text-red-500 text-sm" />
            </div>

            {/* End Date */}
            <div>
              <label className="block">End Date</label>
              <Field
                name="end_date"
                type="date"
                className="w-full border rounded px-3 py-2"
              />
              <ErrorMessage name="end_date" component="div" className="text-red-500 text-sm" />
            </div>

            {/* Rent Amount */}
            <div>
              <label className="block">Rent Amount</label>
              <Field
                name="rent_amount"
                type="number"
                className="w-full border rounded px-3 py-2"
              />
              <ErrorMessage name="rent_amount" component="div" className="text-red-500 text-sm" />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              {isSubmitting ? "Submitting..." : "Create Lease"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
