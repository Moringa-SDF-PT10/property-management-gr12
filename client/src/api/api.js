const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

// For JSON requests
export async function api(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token"); 
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 
      "Content-Type": "application/json",
       ...(token ? { Authorization: `Bearer ${token}` } : {}),
       ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
  }

  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return null;
}

// For form-data (file uploads)
export async function apiFormData(path, { method = "POST", formData }) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
  }

  const ct = res.headers.get("content-type");
  if (ct && ct.includes("application/json")) return res.json();
  return null;
}

// Create lease for a user
export async function createLease(leaseData) {
  return api(`/leases`, {
    method: "POST",
    body: leaseData,
  });
}


export { API_BASE_URL };
