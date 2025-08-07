import { useState, Fragment } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  QrCodeIcon,
  HomeIcon,
  CubeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useWeb3 } from '../../contexts/Web3Context'
import LoadingSpinner from '../ui/LoadingSpinner'

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const { isConnected, account, connectWallet, disconnectWallet, connecting } = useWeb3()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // Navigation items based on user role
  const getNavigationItems = () => {
    const publicItems = [
      { name: 'Home', href: '/', icon: HomeIcon },
      { name: 'Products', href: '/products', icon: CubeIcon },
      { name: 'Track Product', href: '/track', icon: QrCodeIcon },
    ]

    if (!isAuthenticated) {
      return publicItems
    }

    const dashboardItems = [
      { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon },
    ]

    // Role-specific navigation
    const roleSpecificItems = {
      FARMER: [
        { name: 'My Products', href: '/my-products', icon: CubeIcon },
        { name: 'Add Product', href: '/add-product', icon: CubeIcon },
      ],
      DISTRIBUTOR: [
        { name: 'My Products', href: '/my-products', icon: CubeIcon },
      ],
      RETAILER: [
        { name: 'My Products', href: '/my-products', icon: CubeIcon },
      ],
      CONSUMER: [],
      ADMIN: [
        { name: 'Admin Panel', href: '/admin', icon: CogIcon },
      ],
    }

    return [
      ...publicItems,
      ...dashboardItems,
      ...(roleSpecificItems[user?.role] || []),
    ]
  }

  const navigation = getNavigationItems()

  const isCurrentPage = (href) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Disclosure as="nav" className="bg-white shadow-sm border-b border-gray-200">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                {/* Logo */}
                <div className="flex flex-shrink-0 items-center">
                  <Link to="/" className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <CubeIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gradient">
                      AgriChain
                    </span>
                  </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                          isCurrentPage(item.href)
                            ? 'border-primary-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-1.5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>

              <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                {/* Web3 Connection */}
                {isAuthenticated && (
                  <div className="flex items-center space-x-2">
                    {isConnected ? (
                      <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span>{formatAddress(account)}</span>
                      </div>
                    ) : (
                      <button
                        onClick={connectWallet}
                        disabled={connecting}
                        className="btn btn-sm btn-outline"
                      >
                        {connecting ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span className="ml-1">Connecting...</span>
                          </>
                        ) : (
                          'Connect Wallet'
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* User Menu */}
                {isAuthenticated ? (
                  <Menu as="div" className="relative">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-50">
                          <UserCircleIcon className="h-6 w-6 text-gray-400" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900">
                              {user?.name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {user?.role?.toLowerCase()}
                            </p>
                          </div>
                        </div>
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/profile"
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } flex items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <UserCircleIcon className="h-4 w-4 mr-2" />
                              Profile
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/settings"
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } flex items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <CogIcon className="h-4 w-4 mr-2" />
                              Settings
                            </Link>
                          )}
                        </Menu.Item>
                        {isConnected && (
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={disconnectWallet}
                                className={`${
                                  active ? 'bg-gray-100' : ''
                                } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                              >
                                <div className="h-4 w-4 mr-2 bg-red-500 rounded-full"></div>
                                Disconnect Wallet
                              </button>
                            )}
                          </Menu.Item>
                        )}
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link to="/login" className="btn btn-outline btn-sm">
                      Sign In
                    </Link>
                    <Link to="/register" className="btn btn-primary btn-sm">
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Disclosure.Button
                    key={item.name}
                    as={Link}
                    to={item.href}
                    className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium transition-colors duration-200 ${
                      isCurrentPage(item.href)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="h-5 w-5 mr-2" />
                      {item.name}
                    </div>
                  </Disclosure.Button>
                )
              })}
            </div>

            {/* Mobile User Section */}
            {isAuthenticated && (
              <div className="border-t border-gray-200 pb-3 pt-4">
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user?.name}
                    </div>
                    <div className="text-sm font-medium text-gray-500 capitalize">
                      {user?.role?.toLowerCase()}
                    </div>
                  </div>
                </div>

                {/* Mobile Web3 Connection */}
                <div className="mt-3 px-4">
                  {isConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span>{formatAddress(account)}</span>
                      </div>
                      <button
                        onClick={disconnectWallet}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={connectWallet}
                      disabled={connecting}
                      className="btn btn-sm btn-outline w-full"
                    >
                      {connecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  <Disclosure.Button
                    as={Link}
                    to="/profile"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Profile
                  </Disclosure.Button>
                  <Disclosure.Button
                    as={Link}
                    to="/settings"
                    className="block px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Settings
                  </Disclosure.Button>
                  <Disclosure.Button
                    as="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Sign out
                  </Disclosure.Button>
                </div>
              </div>
            )}

            {/* Mobile Auth Buttons */}
            {!isAuthenticated && (
              <div className="border-t border-gray-200 pb-3 pt-4 px-4 space-y-2">
                <Link to="/login" className="btn btn-outline w-full">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary w-full">
                  Sign Up
                </Link>
              </div>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  )
}

export default Navbar