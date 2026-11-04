import { isTokenValid, clearToken } from '../api/client'
import { useState, useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)

  useEffect(() => {
    if (!isTokenValid()) {
      clearToken()
      setValid(false)
    } else {
      setValid(true)
    }
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!valid) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
