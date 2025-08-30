// src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Home, MapPin, Star, Users, Shield } from "lucide-react";

const HomePage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("http://localhost:5000/properties");
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, Body: ${errorText}`);
        }
        const data = await response.json();
        setProperties(data);
      } catch (err) {
        console.error("Error fetching properties for Home page:", err);
        setError("Failed to load properties. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);



  const features = [
    {
      icon: <Home className="h-8 w-8 text-blue-600" />,
      title: "Quality Properties",
      description: "Carefully vetted properties from trusted landlords across Nairobi"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-600" />,
      title: "Secure Platform",
      description: "Safe and secure transactions with verified property owners"
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Community Focused",
      description: "Connect with a community of tenants and property managers"
    }
  ];

  const handleImageError = (e) => {
    e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop';
  };

  const getImageUrl = (pictures) => {
    let imageUrl = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop';

    if (pictures && pictures.length > 0) {
      const firstPicture = pictures[0];
      if (firstPicture.startsWith('http')) {
        imageUrl = firstPicture;
      } else {
        imageUrl = `http://localhost:5000${firstPicture}`;
      }
    }
    return imageUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Find Your Perfect Home in Nairobi
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Discover quality rental properties from verified landlords.
            Your dream home is just a click away.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose PropertyHub?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We make finding and managing rental properties simple, secure, and stress-free
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-6 rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Properties Section */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Featured Properties
            </h2>
            <p className="text-gray-600 mt-2">
              {properties.length} available properties
            </p>
          </div>
          <div className="flex items-center text-blue-600">
            <MapPin className="h-5 w-5 mr-2" />
            <span className="font-medium">Nairobi, Kenya</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">Loading amazing properties...</p>
          </div>
        ) : error ? (
          <div className="text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <div className="text-red-600 mb-4">
              <Home className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-8">
            <div className="text-gray-400 mb-4">
              <Home className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-600 font-medium">
              No properties currently available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((prop) => {
              let pictures = [];
              if (typeof prop.pictures === "string") {
                try {
                  pictures = JSON.parse(prop.pictures);
                } catch (e) {
                  console.error("Invalid pictures JSON:", prop.pictures);
                  pictures = [];
                }
              } else if (Array.isArray(prop.pictures)) {
                pictures = prop.pictures;
              }

              const imageUrl = getImageUrl(pictures);

              return (
                <Link
                  to={`/properties/${prop.id}`}
                  key={prop.id}
                  className="block group hover:scale-105 transition-transform duration-200"
                >
                  <div className="bg-white rounded-xl shadow-md overflow-hidden group-hover:shadow-xl transition-shadow duration-200">
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt={prop.name}
                        className="w-full h-48 object-cover"
                        onError={handleImageError}
                      />
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        Available
                      </div>
                      <div className="absolute top-3 left-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        <Star className="inline h-3 w-3 mr-1" />
                        Featured
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {prop.name}
                      </h3>
                      <div className="flex items-center text-gray-600 text-sm mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{prop.location}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-green-600">
                            Ksh {prop.rent?.toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm">/month</span>
                        </div>
                        <div className="text-blue-600 font-medium text-sm group-hover:text-blue-800">
                          View Details →
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied tenants and landlords who trust PropertyHub
            for their rental needs.
          </p>
          <div className="space-x-4">
            <Link
              to="/auth/register"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Sign Up Today
            </Link>
            <Link
              to="/auth/login"
              className="inline-block border border-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Already a Member?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;