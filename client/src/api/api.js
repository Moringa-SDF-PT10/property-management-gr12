// src/api/api.js

// Use environment variable for API_BASE_URL (Vite specific)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL  || "http://localhost:5000" ;

export { API_BASE_URL }; // Export it for other parts of the app

// --- Token Refresh Mechanism Variables ---
let isRefreshing = false; // Flag to prevent multiple concurrent token refresh requests
let failedQueue = [];     // Queue to hold failed requests while a refresh is in progress

/**
 * Processes the queue of failed requests after a token refresh attempt.
 * If successful, retries requests with the new token. If failed, rejects them.
 * @param {Error|null} error - The error if token refresh failed.
 * @param {string|null} newToken - The new access token if refresh was successful.
 */
const processQueue = (error, newToken = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error); // Reject queued requests if refresh failed
    } else {
      prom.resolve(newToken); // Resolve with new token to retry requests
    }
  });
  failedQueue = []; // Clear the queue
};

/**
 * Attempts to refresh the access token using the stored refresh token.
 * If successful, updates localStorage and returns the new access token.
 * If failed, logs out the user.
 * @returns {Promise<string>} A promise that resolves with the new access token.
 * @throws {Error} If refresh token is missing or refresh API call fails.
 */
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    console.error('No refresh token available. Logging out.');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/auth/login'; // Force redirect to login
    throw new Error('No refresh token available, user logged out.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('Token refresh failed:', errorData.message);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/auth/login'; // Redirect to login on refresh failure
      throw new Error(errorData.message || `Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.access_token);
    // If your backend issues a new refresh token with each refresh, uncomment/update this:
    // localStorage.setItem('refreshToken', data.refresh_token);
    return data.access_token;
  } catch (err) {
    console.error('Exception during access token refresh:', err);
    throw err;
  }
};


/**
 * Generic API utility for making authenticated requests with automatic token refresh.
 * Handles JSON bodies and includes Authorization header.
 * @param {string} endpoint - The API endpoint (e.g., "/leases").
 * @param {object} options - Options for the fetch request.
 * @param {string} options.method - HTTP method (e.g., "GET", "POST"). Defaults to "GET".
 * @param {object} options.body - JavaScript object to be stringified as JSON.
 * @param {object} options.headers - Custom headers to merge.
 * @returns {Promise<any>} A promise that resolves with the JSON response or null for 204.
 * @throws {Error} If the API call fails or authentication fails.
 */
export async function api(endpoint, { method = "GET", body, headers } = {}) {
  let accessToken = localStorage.getItem("accessToken");

  // Default headers for JSON requests
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // Merge default headers with custom ones, adding Authorization if token exists
  const combinedHeaders = {
    ...defaultHeaders,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(headers || {}),
  };

  const config = {
    method,
    headers: combinedHeaders,
    body: body ? JSON.stringify(body) : undefined,
  };

  try {
    let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // --- Handle 401 Unauthorized errors with token refresh ---
    if (response.status === 401 && endpoint !== '/auth/refresh') {
      const originalRequest = { endpoint, options: { method, body, headers } }; // Capture original request

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(refreshedAccessToken => {
          originalRequest.headers = {
            ...originalRequest.headers, // Maintain existing headers
            Authorization: `Bearer ${refreshedAccessToken}`
          };
          return api(originalRequest.endpoint, originalRequest.options);
        }).catch(err => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const newAccessToken = await refreshAccessToken();
        accessToken = newAccessToken; // Update for immediate use

        // Retry the original request with the new access token
        const retryHeaders = {
          ...combinedHeaders, // Use combinedHeaders from before
          Authorization: `Bearer ${newAccessToken}`
        };
        response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers: retryHeaders });
        processQueue(null, newAccessToken);
      } catch (refreshError) {
        processQueue(refreshError, null);
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // --- Standard Error Handling for other HTTP errors ---
    if (!response.ok) {
      const errorText = await response.text(); // Get raw text for robust error reporting
      let errorMessage = errorText;
      try {
        // Attempt to parse as JSON if it looks like JSON
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorText;
      } catch (e) {
        // If not JSON, use the raw text or statusText
        errorMessage = errorText || response.statusText || `API error: ${response.status}`;
      }
      throw new Error(`API ${method} ${endpoint} failed: ${response.status} ${errorMessage}`);
    }

    // --- Successful response handling ---
    // Check Content-Type header to decide if we should parse JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    // For 204 No Content or other non-JSON success responses
    return null;

  } catch (err) {
    console.error(`API call to ${endpoint} failed:`, err);
    throw err;
  }
}

/**
 * API utility specifically for sending form-data (e.g., file uploads).
 * It automatically includes Authorization header.
 * @param {string} endpoint - The API endpoint.
 * @param {object} options - Options for the fetch request.
 * @param {string} options.method - HTTP method (e.g., "POST"). Defaults to "POST".
 * @param {FormData} options.formData - FormData object for the request body.
 * @returns {Promise<any>} A promise that resolves with the JSON response or null for 204.
 * @throws {Error} If the API call fails or authentication fails.
 */
export async function apiFormData(endpoint, { method = "POST", formData } = {}) {
  let accessToken = localStorage.getItem("accessToken");

  // No 'Content-Type' header for FormData, browser sets it automatically
  const headers = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const config = {
    method,
    headers,
    body: formData,
  };

  try {
    console.log("Fetching:", `${API_BASE_URL}${endpoint}`);
    let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // --- Handle 401 Unauthorized errors with token refresh for FormData ---
    if (response.status === 401 && endpoint !== '/auth/refresh') {
      const originalRequest = { endpoint, options: { method, formData } }; // Capture original request

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(refreshedAccessToken => {
          originalRequest.headers = {
            Authorization: `Bearer ${refreshedAccessToken}`
          };
          // Recreate FormData if necessary, as it can only be read once.
          // This is a potential limitation. Ideally, apiFormData would receive
          // a function to recreate formData or the raw data to generate it.
          // For now, assuming formData can be safely reused or recreated for retry.
          return apiFormData(originalRequest.endpoint, originalRequest.options);
        }).catch(err => Promise.reject(err));
      }

      isRefreshing = true;
      try {
        const newAccessToken = await refreshAccessToken();
        accessToken = newAccessToken;

        // Retry the original request with the new access token
        const retryHeaders = { Authorization: `Bearer ${newAccessToken}` };
        response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers: retryHeaders });
        processQueue(null, newAccessToken);
      } catch (refreshError) {
        processQueue(refreshError, null);
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // --- Standard Error Handling for other HTTP errors ---
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorText;
      } catch (e) {
        errorMessage = errorText || response.statusText || `API error: ${response.status}`;
      }
      throw new Error(`API ${method} ${endpoint} failed: ${response.status} ${errorMessage}`);
    }

    // --- Successful response handling ---
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return null;
  } catch (err) {
    console.error(`API FormData call to ${endpoint} failed:`, err);
    throw err;
  }
}


// --- Consolidated functions now use the generic `api` utility ---
// (Note: `PropertyFormPage` will need to use `apiFormData` directly for uploads)

/**
 * Creates a new lease.
 * @param {object} leaseData - The data for the new lease.
 * @returns {Promise<any>} The created lease object.
 */
export async function createLease(leaseData) {
  return api(`/leases`, {
    method: "POST",
    body: leaseData,
  });
}

/**
 * Fetches all leases.
 * @returns {Promise<any[]>} An array of lease objects.
 */
export async function getLeases() {
  return api(`/leases`);
}

/**
 * Submits a vacate notice for a specific lease.
 * @param {string|number} leaseId - The ID of the lease.
 * @param {object} data - The vacate notice data.
 * @returns {Promise<any>} The response from the vacate notice submission.
 */
export async function submitVacate(leaseId, data) {
  return api(`/leases/${leaseId}/vacate`, {
    method: "PUT", // Original was PUT, keep consistent
    body: data,
  });
}