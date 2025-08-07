import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  PlusIcon,
  CubeIcon,
  ChartBarIcon,
  QrCodeIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'
import { useWeb3 } from '../../contexts/Web3Context'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const FarmerDashboard = () => {
  const { user } = useAuth()
  const { isConnected, account, connectWallet } = useWeb3()
  const [selectedPeriod, setSelectedPeriod] = useState('30')

  // Fetch farmer's products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['farmer-products'],
    queryFn: async () => {
      const response = await axios.get('/products/my/products')
      return response.data.data.products
    },
  })

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['farmer-stats', selectedPeriod],
    queryFn: async () => {
      const response = await axios.get(`/products/stats/overview?period=${selectedPeriod}`)
      return response.data.data
    },
  })

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'Produced': 'status-produced',
      'InTransit': 'status-in-transit',
      'Distributed': 'status-distributed',
      'Retail': 'status-retail',
      'Sold': 'status-sold',
      'Recalled': 'status-recalled',
    }
    return statusClasses[status] || 'badge-secondary'
  }

  const quickStats = [
    {
      name: 'Total Products',
      value: products?.length || 0,
      icon: CubeIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Active Products',
      value: products?.filter(p => ['Produced', 'InTransit', 'Distributed', 'Retail'].includes(p.supplyChainStage)).length || 0,
      icon: ChartBarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Sold Products',
      value: products?.filter(p => p.supplyChainStage === 'Sold').length || 0,
      icon: CheckCircleIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'In Transit',
      value: products?.filter(p => p.supplyChainStage === 'InTransit').length || 0,
      icon: TruckIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.name}! 🌾
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your agricultural products and track their journey through the supply chain.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <Link to="/add-product" className="btn btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add New Product
              </Link>
            </div>
          </div>
        </div>

        {/* Web3 Connection Status */}
        {!isConnected && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Connect Your Wallet
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Connect your wallet to interact with blockchain features and verify transactions.
                </p>
              </div>
              <button onClick={connectWallet} className="btn btn-sm btn-outline">
                Connect Wallet
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="card">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Products */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="card-title">Your Products</h2>
              <Link to="/my-products" className="text-primary-600 hover:text-primary-500 text-sm font-medium">
                View All
              </Link>
            </div>
          </div>

          {productsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" text="Loading your products..." />
            </div>
          ) : products && products.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.slice(0, 5).map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {product.images && product.images.length > 0 ? (
                              <img
                                className="h-10 w-10 rounded-full object-cover"
                                src={`https://gateway.ipfs.io/ipfs/${product.images[0].hash}`}
                                alt={product.name}
                                onError={(e) => {
                                  e.target.src = '/api/placeholder/40/40'
                                }}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <CubeIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {product.blockchainId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${getStatusBadgeClass(product.supplyChainStage)}`}>
                          {product.supplyChainStage}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link
                          to={`/products/${product.blockchainId}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/products/${product.blockchainId}/qr`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <QrCodeIcon className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CubeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No products yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start by adding your first agricultural product to the supply chain.
              </p>
              <Link to="/add-product" className="btn btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Product
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/add-product" className="block">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
                  <PlusIcon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Add Product
                </h3>
                <p className="text-gray-600">
                  Add a new agricultural product to the blockchain
                </p>
              </div>
            </Link>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/my-products" className="block">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Manage Products
                </h3>
                <p className="text-gray-600">
                  View and manage all your products
                </p>
              </div>
            </Link>
          </div>

          <div className="card hover:shadow-lg transition-shadow cursor-pointer">
            <Link to="/track" className="block">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <QrCodeIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Track Products
                </h3>
                <p className="text-gray-600">
                  Track any product in the supply chain
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Missing icons - let's add them
const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const TruckIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

export default FarmerDashboard