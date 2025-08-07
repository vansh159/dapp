import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { QrCodeIcon, MagnifyingGlassIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ProductTimeline from '../components/products/ProductTimeline'
import ProductMap from '../components/products/ProductMap'

const TrackProduct = () => {
  const { productId: urlProductId } = useParams()
  const [searchParams] = useSearchParams()
  const [productId, setProductId] = useState(urlProductId || searchParams.get('id') || '')
  const [showScanner, setShowScanner] = useState(false)
  const [scannerError, setScannerError] = useState('')

  // Fetch product data
  const { data: productData, isLoading, error, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null
      const response = await axios.get(`/products/${productId}`)
      return response.data.data
    },
    enabled: !!productId,
  })

  // Initialize QR scanner
  useEffect(() => {
    let scanner = null

    if (showScanner) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      )

      scanner.render(
        (decodedText) => {
          try {
            // Try to parse QR code data
            const qrData = JSON.parse(decodedText)
            if (qrData.productId) {
              setProductId(qrData.productId.toString())
              setShowScanner(false)
              scanner.clear()
            } else {
              // If not JSON, assume it's just the product ID
              setProductId(decodedText)
              setShowScanner(false)
              scanner.clear()
            }
          } catch (error) {
            // If parsing fails, treat as plain text product ID
            setProductId(decodedText)
            setShowScanner(false)
            scanner.clear()
          }
        },
        (error) => {
          setScannerError('Failed to scan QR code')
        }
      )
    }

    return () => {
      if (scanner) {
        scanner.clear()
      }
    }
  }, [showScanner])

  const handleSearch = (e) => {
    e.preventDefault()
    if (productId.trim()) {
      refetch()
    }
  }

  const handleStartScanner = () => {
    setScannerError('')
    setShowScanner(true)
  }

  const handleStopScanner = () => {
    setShowScanner(false)
    setScannerError('')
  }

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Track Your Product
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enter a product ID or scan a QR code to view the complete supply chain journey
          </p>
        </div>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="card">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label htmlFor="productId" className="form-label">
                    Product ID
                  </label>
                  <input
                    type="text"
                    id="productId"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Enter product ID (e.g., 12345)"
                    className="form-input"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    disabled={!productId.trim() || isLoading}
                    className="btn btn-primary"
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      <>
                        <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Scanner Toggle */}
              <div className="flex justify-center">
                {!showScanner ? (
                  <button
                    type="button"
                    onClick={handleStartScanner}
                    className="btn btn-outline"
                  >
                    <QrCodeIcon className="h-4 w-4 mr-2" />
                    Scan QR Code
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopScanner}
                    className="btn btn-secondary"
                  >
                    Stop Scanner
                  </button>
                )}
              </div>

              {/* QR Scanner */}
              {showScanner && (
                <div className="qr-scanner-container">
                  <div id="qr-reader"></div>
                  {scannerError && (
                    <div className="mt-4 text-center text-red-600 text-sm">
                      {scannerError}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="card bg-red-50 border-red-200">
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">
                  <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  Product Not Found
                </h3>
                <p className="text-red-600">
                  The product ID "{productId}" could not be found. Please check the ID and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Product Information */}
        {productData && !isLoading && (
          <div className="space-y-8">
            {/* Product Overview */}
            <div className="card">
              <div className="card-header">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="card-title">{productData.product.name}</h2>
                    <p className="card-subtitle">ID: {productData.product.blockchainId}</p>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <span className={`badge ${getStatusBadgeClass(productData.product.supplyChainStage)}`}>
                      {productData.product.supplyChainStage}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Category</h4>
                  <p className="text-gray-600">{productData.product.category}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Farmer</h4>
                  <p className="text-gray-600">{productData.product.farmer?.name || 'Unknown'}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Quantity</h4>
                  <p className="text-gray-600">
                    {productData.product.quantity?.value} {productData.product.quantity?.unit}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Created</h4>
                  <p className="text-gray-600">
                    {new Date(productData.product.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {productData.product.description && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{productData.product.description}</p>
                </div>
              )}
            </div>

            {/* Product Images */}
            {productData.product.images && productData.product.images.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Product Images</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {productData.product.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={`https://gateway.ipfs.io/ipfs/${image.hash}`}
                        alt={image.description || `Product image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/300/200'
                        }}
                      />
                      {image.description && (
                        <p className="mt-2 text-sm text-gray-600">{image.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supply Chain Timeline */}
            {productData.blockchain?.history && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2" />
                    Supply Chain History
                  </h3>
                </div>
                <ProductTimeline history={productData.blockchain.history} />
              </div>
            )}

            {/* Location Map */}
            {productData.product.location?.current && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title flex items-center">
                    <MapPinIcon className="h-5 w-5 mr-2" />
                    Current Location
                  </h3>
                </div>
                <ProductMap 
                  currentLocation={productData.product.location.current}
                  locationHistory={productData.product.location.history || []}
                />
              </div>
            )}

            {/* Certificates and Documents */}
            {productData.product.documents && productData.product.documents.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Certificates & Documents</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productData.product.documents.map((doc, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{doc.type}</h4>
                          {doc.description && (
                            <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={`https://gateway.ipfs.io/ipfs/${doc.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blockchain Verification */}
            {productData.blockchain?.data && (
              <div className="card bg-green-50 border-green-200">
                <div className="card-header">
                  <h3 className="card-title text-green-800">Blockchain Verification</h3>
                </div>
                <div className="text-green-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Verified on Blockchain</span>
                  </div>
                  <p className="text-sm">
                    This product's information has been verified and stored immutably on the blockchain.
                    Last updated: {new Date(productData.blockchain.data.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && productId && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" text="Loading product information..." />
          </div>
        )}

        {/* Empty State */}
        {!productId && !showScanner && (
          <div className="text-center py-12">
            <QrCodeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Track Any Product
            </h3>
            <p className="text-gray-600">
              Enter a product ID or scan a QR code to get started
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackProduct