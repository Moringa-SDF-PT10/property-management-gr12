import React from 'react'

const NoPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] bg-slate-50 text-slate-700">
      <h1 className="text-6xl font-extrabold text-slate-800 mb-4">404</h1>
      <p className="text-xl md:text-2xl font-medium mb-8">Page Not Found</p>
      <p className="text-center max-w-md">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <a href="/" className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-colors">
        Go to Homepage
      </a>
    </div>
  )
}

export default NoPage