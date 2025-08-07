import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const Dashboard = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      // Redirect to role-specific dashboard
      const roleRoutes = {
        FARMER: '/farmer',
        DISTRIBUTOR: '/distributor',
        RETAILER: '/retailer',
        CONSUMER: '/consumer',
        ADMIN: '/admin',
      }

      const route = roleRoutes[user.role]
      if (route) {
        navigate(route, { replace: true })
      }
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Redirecting to your dashboard..." />
    </div>
  )
}

export default Dashboard