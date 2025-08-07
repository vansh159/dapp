// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SupplyChain
 * @dev Smart contract for managing agricultural product supply chain
 * @author Agricultural Supply Chain Team
 */
contract SupplyChain is AccessControl, ReentrancyGuard, Pausable {
    // Role definitions
    bytes32 public constant FARMER_ROLE = keccak256("FARMER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    // Product status enumeration
    enum ProductStatus {
        Produced,      // 0 - Created by farmer
        InTransit,     // 1 - Being transported
        Distributed,   // 2 - Received by distributor
        Retail,        // 3 - Available at retailer
        Sold,          // 4 - Purchased by consumer
        Recalled       // 5 - Product recalled
    }

    // Product structure
    struct Product {
        uint256 id;
        string name;
        string description;
        address currentOwner;
        address farmer;
        ProductStatus status;
        string location;
        uint256 createdAt;
        uint256 updatedAt;
        string imageHash;      // IPFS hash for product image
        string certificateHash; // IPFS hash for certificates
        bool exists;
    }

    // Supply chain history entry
    struct HistoryEntry {
        address actor;
        ProductStatus status;
        string location;
        uint256 timestamp;
        string notes;
    }

    // State variables
    mapping(uint256 => Product) public products;
    mapping(uint256 => HistoryEntry[]) public productHistory;
    mapping(address => string) public userProfiles; // Store user metadata
    
    uint256 public productCounter;
    uint256 public totalProducts;

    // Events
    event ProductAdded(
        uint256 indexed productId,
        string name,
        address indexed farmer,
        string location,
        uint256 timestamp
    );

    event ProductStatusUpdated(
        uint256 indexed productId,
        ProductStatus indexed newStatus,
        address indexed updatedBy,
        string location,
        uint256 timestamp
    );

    event OwnershipTransferred(
        uint256 indexed productId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    event UserRegistered(
        address indexed user,
        string role,
        uint256 timestamp
    );

    // Modifiers
    modifier productExists(uint256 _productId) {
        require(products[_productId].exists, "Product does not exist");
        _;
    }

    modifier onlyProductOwner(uint256 _productId) {
        require(
            products[_productId].currentOwner == msg.sender,
            "Only product owner can perform this action"
        );
        _;
    }

    modifier validStatusTransition(uint256 _productId, ProductStatus _newStatus) {
        ProductStatus currentStatus = products[_productId].status;
        
        // Define valid status transitions
        if (currentStatus == ProductStatus.Produced) {
            require(_newStatus == ProductStatus.InTransit, "Invalid status transition");
        } else if (currentStatus == ProductStatus.InTransit) {
            require(
                _newStatus == ProductStatus.Distributed || _newStatus == ProductStatus.Recalled,
                "Invalid status transition"
            );
        } else if (currentStatus == ProductStatus.Distributed) {
            require(
                _newStatus == ProductStatus.Retail || _newStatus == ProductStatus.Recalled,
                "Invalid status transition"
            );
        } else if (currentStatus == ProductStatus.Retail) {
            require(
                _newStatus == ProductStatus.Sold || _newStatus == ProductStatus.Recalled,
                "Invalid status transition"
            );
        } else {
            revert("Invalid status transition");
        }
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        productCounter = 1;
        totalProducts = 0;
    }

    /**
     * @dev Register a new user with a specific role
     * @param _user Address of the user to register
     * @param _role Role to assign to the user
     * @param _profile IPFS hash containing user profile information
     */
    function registerUser(
        address _user,
        string memory _role,
        string memory _profile
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 roleHash;
        
        if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("FARMER"))) {
            roleHash = FARMER_ROLE;
        } else if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("DISTRIBUTOR"))) {
            roleHash = DISTRIBUTOR_ROLE;
        } else if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("RETAILER"))) {
            roleHash = RETAILER_ROLE;
        } else if (keccak256(abi.encodePacked(_role)) == keccak256(abi.encodePacked("CONSUMER"))) {
            roleHash = CONSUMER_ROLE;
        } else {
            revert("Invalid role");
        }

        _grantRole(roleHash, _user);
        userProfiles[_user] = _profile;

        emit UserRegistered(_user, _role, block.timestamp);
    }

    /**
     * @dev Add a new product to the supply chain (Farmer only)
     * @param _name Product name
     * @param _description Product description
     * @param _location Current location
     * @param _imageHash IPFS hash for product image
     * @param _certificateHash IPFS hash for certificates
     */
    function addProduct(
        string memory _name,
        string memory _description,
        string memory _location,
        string memory _imageHash,
        string memory _certificateHash
    ) external onlyRole(FARMER_ROLE) whenNotPaused nonReentrant returns (uint256) {
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(bytes(_location).length > 0, "Location cannot be empty");

        uint256 productId = productCounter++;
        
        products[productId] = Product({
            id: productId,
            name: _name,
            description: _description,
            currentOwner: msg.sender,
            farmer: msg.sender,
            status: ProductStatus.Produced,
            location: _location,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            imageHash: _imageHash,
            certificateHash: _certificateHash,
            exists: true
        });

        // Add initial history entry
        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            status: ProductStatus.Produced,
            location: _location,
            timestamp: block.timestamp,
            notes: "Product created"
        }));

        totalProducts++;

        emit ProductAdded(productId, _name, msg.sender, _location, block.timestamp);
        
        return productId;
    }

    /**
     * @dev Update product status
     * @param _productId Product ID
     * @param _newStatus New status
     * @param _location New location
     * @param _notes Additional notes
     */
    function updateProductStatus(
        uint256 _productId,
        ProductStatus _newStatus,
        string memory _location,
        string memory _notes
    ) external 
        productExists(_productId)
        validStatusTransition(_productId, _newStatus)
        whenNotPaused
        nonReentrant
    {
        // Check role permissions for status updates
        if (_newStatus == ProductStatus.InTransit) {
            require(
                hasRole(FARMER_ROLE, msg.sender) || hasRole(DISTRIBUTOR_ROLE, msg.sender),
                "Only farmers or distributors can set InTransit status"
            );
        } else if (_newStatus == ProductStatus.Distributed) {
            require(hasRole(DISTRIBUTOR_ROLE, msg.sender), "Only distributors can set Distributed status");
        } else if (_newStatus == ProductStatus.Retail) {
            require(hasRole(RETAILER_ROLE, msg.sender), "Only retailers can set Retail status");
        } else if (_newStatus == ProductStatus.Sold) {
            require(hasRole(RETAILER_ROLE, msg.sender), "Only retailers can set Sold status");
        }

        products[_productId].status = _newStatus;
        products[_productId].location = _location;
        products[_productId].updatedAt = block.timestamp;

        // Add history entry
        productHistory[_productId].push(HistoryEntry({
            actor: msg.sender,
            status: _newStatus,
            location: _location,
            timestamp: block.timestamp,
            notes: _notes
        }));

        emit ProductStatusUpdated(_productId, _newStatus, msg.sender, _location, block.timestamp);
    }

    /**
     * @dev Transfer product ownership
     * @param _productId Product ID
     * @param _newOwner New owner address
     */
    function transferOwnership(
        uint256 _productId,
        address _newOwner
    ) external 
        productExists(_productId)
        onlyProductOwner(_productId)
        whenNotPaused
        nonReentrant
    {
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != products[_productId].currentOwner, "Cannot transfer to same owner");

        address previousOwner = products[_productId].currentOwner;
        products[_productId].currentOwner = _newOwner;
        products[_productId].updatedAt = block.timestamp;

        emit OwnershipTransferred(_productId, previousOwner, _newOwner, block.timestamp);
    }

    /**
     * @dev Get product details
     * @param _productId Product ID
     */
    function getProduct(uint256 _productId) 
        external 
        view 
        productExists(_productId) 
        returns (Product memory) 
    {
        return products[_productId];
    }

    /**
     * @dev Get product history
     * @param _productId Product ID
     */
    function getProductHistory(uint256 _productId) 
        external 
        view 
        productExists(_productId) 
        returns (HistoryEntry[] memory) 
    {
        return productHistory[_productId];
    }

    /**
     * @dev Get products by farmer
     * @param _farmer Farmer address
     */
    function getProductsByFarmer(address _farmer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory result = new uint256[](totalProducts);
        uint256 count = 0;

        for (uint256 i = 1; i < productCounter; i++) {
            if (products[i].exists && products[i].farmer == _farmer) {
                result[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory resizedResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            resizedResult[i] = result[i];
        }

        return resizedResult;
    }

    /**
     * @dev Get products by current owner
     * @param _owner Owner address
     */
    function getProductsByOwner(address _owner) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory result = new uint256[](totalProducts);
        uint256 count = 0;

        for (uint256 i = 1; i < productCounter; i++) {
            if (products[i].exists && products[i].currentOwner == _owner) {
                result[count] = i;
                count++;
            }
        }

        // Resize array to actual count
        uint256[] memory resizedResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            resizedResult[i] = result[i];
        }

        return resizedResult;
    }

    /**
     * @dev Get user profile
     * @param _user User address
     */
    function getUserProfile(address _user) external view returns (string memory) {
        return userProfiles[_user];
    }

    /**
     * @dev Check if user has specific role
     * @param _role Role to check
     * @param _user User address
     */
    function hasUserRole(bytes32 _role, address _user) external view returns (bool) {
        return hasRole(_role, _user);
    }

    /**
     * @dev Emergency pause function
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Emergency unpause function
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalProducts,
        uint256 _producedCount,
        uint256 _inTransitCount,
        uint256 _distributedCount,
        uint256 _retailCount,
        uint256 _soldCount
    ) {
        uint256 producedCount = 0;
        uint256 inTransitCount = 0;
        uint256 distributedCount = 0;
        uint256 retailCount = 0;
        uint256 soldCount = 0;

        for (uint256 i = 1; i < productCounter; i++) {
            if (products[i].exists) {
                if (products[i].status == ProductStatus.Produced) producedCount++;
                else if (products[i].status == ProductStatus.InTransit) inTransitCount++;
                else if (products[i].status == ProductStatus.Distributed) distributedCount++;
                else if (products[i].status == ProductStatus.Retail) retailCount++;
                else if (products[i].status == ProductStatus.Sold) soldCount++;
            }
        }

        return (totalProducts, producedCount, inTransitCount, distributedCount, retailCount, soldCount);
    }
}