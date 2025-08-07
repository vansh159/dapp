import { Link } from 'react-router-dom'
import { 
  CubeIcon, 
  ShieldCheckIcon, 
  QrCodeIcon, 
  ChartBarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

const Home = () => {
  const { isAuthenticated, user } = useAuth()

  const features = [
    {
      icon: CubeIcon,
      title: 'Blockchain Traceability',
      description: 'Every product journey recorded immutably on the blockchain, ensuring complete transparency and trust.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Quality Assurance',
      description: 'Verify product authenticity and quality through certified documents and blockchain verification.',
    },
    {
      icon: QrCodeIcon,
      title: 'QR Code Tracking',
      description: 'Simple QR code scanning provides instant access to complete product history and verification.',
    },
    {
      icon: ChartBarIcon,
      title: 'Real-time Analytics',
      description: 'Monitor supply chain performance with comprehensive analytics and reporting tools.',
    },
  ]

  const benefits = [
    'Complete product traceability from farm to table',
    'Immutable blockchain records ensure data integrity',
    'Role-based access for all supply chain participants',
    'IPFS storage for decentralized document management',
    'Real-time status updates and notifications',
    'Quality certification and verification system',
  ]

  const stats = [
    { label: 'Products Tracked', value: '10,000+' },
    { label: 'Supply Chain Partners', value: '500+' },
    { label: 'Countries Served', value: '25+' },
    { label: 'Blockchain Transactions', value: '50,000+' },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transparent{' '}
              <span className="text-gradient">Agricultural</span>{' '}
              Supply Chain
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionizing food traceability through blockchain technology. 
              Track your agricultural products from farm to table with complete transparency and trust.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary btn-lg">
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    Get Started
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                  <Link to="/track" className="btn btn-outline btn-lg">
                    Track a Product
                    <QrCodeIcon className="ml-2 h-5 w-5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose AgriChain?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our blockchain-based platform provides unmatched transparency and security 
              for agricultural supply chain management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Complete Supply Chain Visibility
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Our platform empowers every participant in the agricultural supply chain 
                with the tools and transparency needed to build trust and ensure quality.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckCircleIcon className="h-6 w-6 text-primary-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/about" className="btn btn-primary">
                  Learn More About Us
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="relative">
              <img
                src="/api/placeholder/600/400"
                alt="Agricultural Supply Chain"
                className="rounded-lg shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-900/20 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-primary-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Supply Chain?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of farmers, distributors, and retailers who trust AgriChain 
            for transparent and secure supply chain management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isAuthenticated && (
              <>
                <Link to="/register" className="btn btn-primary btn-lg">
                  Start Free Trial
                </Link>
                <Link to="/contact" className="btn btn-outline btn-lg">
                  Contact Sales
                </Link>
              </>
            )}
            {isAuthenticated && user?.role === 'FARMER' && (
              <Link to="/add-product" className="btn btn-primary btn-lg">
                Add Your First Product
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home