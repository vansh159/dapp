import { createContext, useContext, useReducer, useEffect } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'

// Create context
const Web3Context = createContext()

// Contract configuration
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS
const CONTRACT_ABI = [
  // Add essential ABI functions here - in production, import from a separate file
  "function getProduct(uint256 _productId) external view returns (tuple(uint256 id, string name, string description, address currentOwner, address farmer, uint8 status, string location, uint256 createdAt, uint256 updatedAt, string imageHash, string certificateHash, bool exists))",
  "function getProductHistory(uint256 _productId) external view returns (tuple(address actor, uint8 status, string location, uint256 timestamp, string notes)[])",
  "function addProduct(string memory _name, string memory _description, string memory _location, string memory _imageHash, string memory _certificateHash) external returns (uint256)",
  "function updateProductStatus(uint256 _productId, uint8 _newStatus, string memory _location, string memory _notes) external",
  "function transferOwnership(uint256 _productId, address _newOwner) external",
  "function getStats() external view returns (uint256 _totalProducts, uint256 _producedCount, uint256 _inTransitCount, uint256 _distributedCount, uint256 _retailCount, uint256 _soldCount)",
  "event ProductAdded(uint256 indexed productId, string name, address indexed farmer, string location, uint256 timestamp)",
  "event ProductStatusUpdated(uint256 indexed productId, uint8 indexed newStatus, address indexed updatedBy, string location, uint256 timestamp)",
  "event OwnershipTransferred(uint256 indexed productId, address indexed previousOwner, address indexed newOwner, uint256 timestamp)"
]

// Web3 reducer
const web3Reducer = (state, action) => {
  switch (action.type) {
    case 'SET_CONNECTING':
      return { ...state, connecting: action.payload }
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: true,
        connecting: false,
        account: action.payload.account,
        provider: action.payload.provider,
        signer: action.payload.signer,
        contract: action.payload.contract,
        chainId: action.payload.chainId,
      }
    case 'SET_DISCONNECTED':
      return {
        ...state,
        isConnected: false,
        connecting: false,
        account: null,
        provider: null,
        signer: null,
        contract: null,
        chainId: null,
        error: null,
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        connecting: false,
      }
    case 'SET_ACCOUNT':
      return {
        ...state,
        account: action.payload,
      }
    case 'SET_CHAIN_ID':
      return {
        ...state,
        chainId: action.payload,
      }
    default:
      return state
  }
}

// Initial state
const initialState = {
  isConnected: false,
  connecting: false,
  account: null,
  provider: null,
  signer: null,
  contract: null,
  chainId: null,
  error: null,
}

// Supported networks
const SUPPORTED_NETWORKS = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  80001: 'Polygon Mumbai Testnet',
  31337: 'Localhost',
}

// Web3 Provider
export const Web3Provider = ({ children }) => {
  const [state, dispatch] = useReducer(web3Reducer, initialState)

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('Please install MetaMask to connect your wallet')
      return { success: false, message: 'MetaMask not installed' }
    }

    try {
      dispatch({ type: 'SET_CONNECTING', payload: true })

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      // Check if network is supported
      if (!SUPPORTED_NETWORKS[chainId]) {
        toast.error(`Unsupported network. Please switch to a supported network.`)
        dispatch({ type: 'SET_ERROR', payload: 'Unsupported network' })
        return { success: false, message: 'Unsupported network' }
      }

      // Create contract instance
      let contract = null
      if (CONTRACT_ADDRESS) {
        try {
          contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
        } catch (error) {
          console.warn('Contract not available:', error.message)
        }
      }

      dispatch({
        type: 'SET_CONNECTED',
        payload: {
          account: accounts[0],
          provider,
          signer,
          contract,
          chainId,
        },
      })

      toast.success(`Connected to ${SUPPORTED_NETWORKS[chainId]}`)
      return { success: true, account: accounts[0] }
    } catch (error) {
      console.error('Wallet connection error:', error)
      const message = error.message || 'Failed to connect wallet'
      dispatch({ type: 'SET_ERROR', payload: message })
      toast.error(message)
      return { success: false, message }
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    dispatch({ type: 'SET_DISCONNECTED' })
    toast.success('Wallet disconnected')
  }

  // Switch network
  const switchNetwork = async (chainId) => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask not installed')
      return { success: false }
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
      return { success: true }
    } catch (error) {
      console.error('Switch network error:', error)
      toast.error('Failed to switch network')
      return { success: false, error }
    }
  }

  // Get contract with signer
  const getContractWithSigner = () => {
    if (!state.contract || !state.signer) {
      throw new Error('Contract or signer not available')
    }
    return state.contract.connect(state.signer)
  }

  // Contract interaction helpers
  const contractHelpers = {
    // Get product from blockchain
    getProduct: async (productId) => {
      try {
        if (!state.contract) {
          throw new Error('Contract not connected')
        }
        const product = await state.contract.getProduct(productId)
        return {
          success: true,
          data: {
            id: product.id.toString(),
            name: product.name,
            description: product.description,
            currentOwner: product.currentOwner,
            farmer: product.farmer,
            status: getStatusString(product.status),
            location: product.location,
            createdAt: new Date(Number(product.createdAt) * 1000),
            updatedAt: new Date(Number(product.updatedAt) * 1000),
            imageHash: product.imageHash,
            certificateHash: product.certificateHash,
            exists: product.exists,
          },
        }
      } catch (error) {
        console.error('Get product error:', error)
        return { success: false, error: error.message }
      }
    },

    // Get product history from blockchain
    getProductHistory: async (productId) => {
      try {
        if (!state.contract) {
          throw new Error('Contract not connected')
        }
        const history = await state.contract.getProductHistory(productId)
        return {
          success: true,
          data: history.map(entry => ({
            actor: entry.actor,
            status: getStatusString(entry.status),
            location: entry.location,
            timestamp: new Date(Number(entry.timestamp) * 1000),
            notes: entry.notes,
          })),
        }
      } catch (error) {
        console.error('Get product history error:', error)
        return { success: false, error: error.message }
      }
    },

    // Add product to blockchain
    addProduct: async (productData) => {
      try {
        const contract = getContractWithSigner()
        const tx = await contract.addProduct(
          productData.name,
          productData.description || '',
          productData.location,
          productData.imageHash || '',
          productData.certificateHash || ''
        )
        
        const receipt = await tx.wait()
        
        // Extract product ID from events
        const productAddedEvent = receipt.logs.find(
          log => log.topics[0] === ethers.id('ProductAdded(uint256,string,address,string,uint256)')
        )
        
        let productId = null
        if (productAddedEvent) {
          const decodedLog = state.contract.interface.parseLog(productAddedEvent)
          productId = decodedLog.args.productId.toString()
        }

        return {
          success: true,
          data: {
            transactionHash: tx.hash,
            productId,
            blockNumber: receipt.blockNumber,
          },
        }
      } catch (error) {
        console.error('Add product error:', error)
        return { success: false, error: error.message }
      }
    },

    // Update product status
    updateProductStatus: async (productId, status, location, notes = '') => {
      try {
        const contract = getContractWithSigner()
        const statusValue = getStatusValue(status)
        
        const tx = await contract.updateProductStatus(
          productId,
          statusValue,
          location,
          notes
        )
        
        const receipt = await tx.wait()
        
        return {
          success: true,
          data: {
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
          },
        }
      } catch (error) {
        console.error('Update product status error:', error)
        return { success: false, error: error.message }
      }
    },

    // Transfer ownership
    transferOwnership: async (productId, newOwnerAddress) => {
      try {
        const contract = getContractWithSigner()
        const tx = await contract.transferOwnership(productId, newOwnerAddress)
        const receipt = await tx.wait()
        
        return {
          success: true,
          data: {
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
          },
        }
      } catch (error) {
        console.error('Transfer ownership error:', error)
        return { success: false, error: error.message }
      }
    },

    // Get contract statistics
    getStats: async () => {
      try {
        if (!state.contract) {
          throw new Error('Contract not connected')
        }
        const stats = await state.contract.getStats()
        return {
          success: true,
          data: {
            totalProducts: stats._totalProducts.toString(),
            producedCount: stats._producedCount.toString(),
            inTransitCount: stats._inTransitCount.toString(),
            distributedCount: stats._distributedCount.toString(),
            retailCount: stats._retailCount.toString(),
            soldCount: stats._soldCount.toString(),
          },
        }
      } catch (error) {
        console.error('Get stats error:', error)
        return { success: false, error: error.message }
      }
    },
  }

  // Status mapping helpers
  const getStatusString = (statusValue) => {
    const statusMap = {
      0: 'Produced',
      1: 'InTransit',
      2: 'Distributed',
      3: 'Retail',
      4: 'Sold',
      5: 'Recalled'
    }
    return statusMap[statusValue] || 'Unknown'
  }

  const getStatusValue = (statusString) => {
    const statusMap = {
      'Produced': 0,
      'InTransit': 1,
      'Distributed': 2,
      'Retail': 3,
      'Sold': 4,
      'Recalled': 5
    }
    return statusMap[statusString]
  }

  // Listen to account and network changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else if (accounts[0] !== state.account) {
        dispatch({ type: 'SET_ACCOUNT', payload: accounts[0] })
      }
    }

    const handleChainChanged = (chainId) => {
      const numericChainId = parseInt(chainId, 16)
      dispatch({ type: 'SET_CHAIN_ID', payload: numericChainId })
      
      if (!SUPPORTED_NETWORKS[numericChainId]) {
        toast.error(`Switched to unsupported network`)
        dispatch({ type: 'SET_ERROR', payload: 'Unsupported network' })
      } else {
        toast.success(`Switched to ${SUPPORTED_NETWORKS[numericChainId]}`)
      }
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [state.account])

  // Auto-connect if previously connected
  useEffect(() => {
    if (isMetaMaskInstalled() && localStorage.getItem('walletConnected') === 'true') {
      connectWallet()
    }
  }, [])

  // Save connection state
  useEffect(() => {
    if (state.isConnected) {
      localStorage.setItem('walletConnected', 'true')
    } else {
      localStorage.removeItem('walletConnected')
    }
  }, [state.isConnected])

  const value = {
    ...state,
    isMetaMaskInstalled,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    contractHelpers,
    supportedNetworks: SUPPORTED_NETWORKS,
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}

// Custom hook to use Web3 context
export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}

export default Web3Context