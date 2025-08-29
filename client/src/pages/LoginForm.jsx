import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle } from 'lucide-react';

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Get message from signup redirect
  const successMessage = location.state?.message;
  const prefillEmail = location.state?.email || '';

  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Invalid email format')
      .required('Email is required'),
    password: Yup.string()
      .required('Password is required')
  });

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    setIsLoading(true);
    setApiError('');

    try {
      const response = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: values.email,
          password: values.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data and token
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect based on role
        const userRole = data.user.role;
        switch (userRole) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'landlord':
            navigate('/landlord/dashboard');
            break;
          case 'tenant':
            navigate('/tenant/dashboard');
            break;
          default:
            navigate('/dashboard');
        }
      } else {
        if (data.message.includes('email')) {
          setFieldError('email', data.message);
        } else if (data.message.includes('password')) {
          setFieldError('password', data.message);
        } else {
          setApiError(data.message);
        }
      }
    } catch (error) {
      setApiError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
      setSubmitting(false);
    }
  };

  // Clear location state after showing message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-700 text-sm">{successMessage}</span>
          </div>
        )}

        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{apiError}</span>
          </div>
        )}

        <Formik
          initialValues={{
            email: prefillEmail,
            password: ''
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form className="space-y-6">
              <div>
                <Field
                  name="email"
                  type="email"
                  placeholder="Email Address"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.email && touched.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              <div className="relative">
                <Field
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.password && touched.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1" />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/auth/register')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;