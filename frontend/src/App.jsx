import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useWeb3 } from './contexts/Web3Context'

// Layout Components
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import LoadingSpinner from './components/ui/LoadingSpinner'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Public Pages
import Home from './pages/Home'
import TrackProduct from './pages/TrackProduct'
import About from './pages/About'
import Contact from './pages/Contact'

// Dashboard Pages
import Dashboard from './pages/dashboard/Dashboard'
import FarmerDashboard from './pages/dashboard/FarmerDashboard'
import DistributorDashboard from './pages/dashboard/DistributorDashboard'
import RetailerDashboard from './pages/dashboard/RetailerDashboard'
import ConsumerDashboard from './pages/dashboard/ConsumerDashboard'

// Product Pages
import Products from './pages/products/Products'
import ProductDetails from './pages/products/ProductDetails'
import AddProduct from './pages/products/AddProduct'
import MyProducts from './pages/products/MyProducts'

// Profile Pages
import Profile from './pages/profile/Profile'
import Settings from './pages/profile/Settings'

// Admin Pages (if admin role exists)
import AdminDashboard from './pages/admin/AdminDashboard'

// 404 Page
import NotFound from './pages/NotFound'

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <LoadingSpinner />
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function App() {
  const { loading } = useAuth()
  const { connecting } = useWeb3()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {connecting && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span className="text-yellow-800 text-sm">Connecting to Web3...</span>
            </div>
          </div>
        </div>
      )}
      
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/track/:productId?" element={<TrackProduct />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          
          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Role-specific Dashboards */}
          <Route path="/farmer" element={
            <ProtectedRoute requiredRoles={['FARMER']}>
              <FarmerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/distributor" element={
            <ProtectedRoute requiredRoles={['DISTRIBUTOR']}>
              <DistributorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/retailer" element={
            <ProtectedRoute requiredRoles={['RETAILER']}>
              <RetailerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/consumer" element={
            <ProtectedRoute requiredRoles={['CONSUMER']}>
              <ConsumerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Product Management Routes */}
          <Route path="/add-product" element={
            <ProtectedRoute requiredRoles={['FARMER']}>
              <AddProduct />
            </ProtectedRoute>
          } />
          <Route path="/my-products" element={
            <ProtectedRoute>
              <MyProducts />
            </ProtectedRoute>
          } />
          
          {/* Profile Routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      
      <Footer />
    </div>
  )
}

export default App