const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SupplyChain", function () {
  let SupplyChain, supplyChain, owner, farmer, distributor, retailer, consumer;
  let FARMER_ROLE, DISTRIBUTOR_ROLE, RETAILER_ROLE, CONSUMER_ROLE;

  beforeEach(async function () {
    // Get signers
    [owner, farmer, distributor, retailer, consumer] = await ethers.getSigners();

    // Deploy contract
    SupplyChain = await ethers.getContractFactory("SupplyChain");
    supplyChain = await SupplyChain.deploy();
    await supplyChain.waitForDeployment();

    // Get role hashes
    FARMER_ROLE = await supplyChain.FARMER_ROLE();
    DISTRIBUTOR_ROLE = await supplyChain.DISTRIBUTOR_ROLE();
    RETAILER_ROLE = await supplyChain.RETAILER_ROLE();
    CONSUMER_ROLE = await supplyChain.CONSUMER_ROLE();

    // Grant roles
    await supplyChain.grantRole(FARMER_ROLE, farmer.address);
    await supplyChain.grantRole(DISTRIBUTOR_ROLE, distributor.address);
    await supplyChain.grantRole(RETAILER_ROLE, retailer.address);
    await supplyChain.grantRole(CONSUMER_ROLE, consumer.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const DEFAULT_ADMIN_ROLE = await supplyChain.DEFAULT_ADMIN_ROLE();
      expect(await supplyChain.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should initialize with correct roles", async function () {
      expect(await supplyChain.hasRole(FARMER_ROLE, farmer.address)).to.be.true;
      expect(await supplyChain.hasRole(DISTRIBUTOR_ROLE, distributor.address)).to.be.true;
      expect(await supplyChain.hasRole(RETAILER_ROLE, retailer.address)).to.be.true;
      expect(await supplyChain.hasRole(CONSUMER_ROLE, consumer.address)).to.be.true;
    });
  });

  describe("User Registration", function () {
    it("Should register a user", async function () {
      await supplyChain.connect(farmer).registerUser(
        "John Farmer",
        "john@farm.com",
        "Organic Farm",
        "123 Farm Road"
      );

      const userProfile = await supplyChain.getUserProfile(farmer.address);
      expect(userProfile.name).to.equal("John Farmer");
      expect(userProfile.email).to.equal("john@farm.com");
      expect(userProfile.organization).to.equal("Organic Farm");
      expect(userProfile.location).to.equal("123 Farm Road");
      expect(userProfile.isActive).to.be.true;
    });

    it("Should not allow duplicate registration", async function () {
      await supplyChain.connect(farmer).registerUser(
        "John Farmer",
        "john@farm.com",
        "Organic Farm",
        "123 Farm Road"
      );

      await expect(
        supplyChain.connect(farmer).registerUser(
          "John Farmer 2",
          "john2@farm.com",
          "Organic Farm 2",
          "456 Farm Road"
        )
      ).to.be.revertedWith("User already registered");
    });
  });

  describe("Product Management", function () {
    beforeEach(async function () {
      // Register farmer
      await supplyChain.connect(farmer).registerUser(
        "John Farmer",
        "john@farm.com",
        "Organic Farm",
        "123 Farm Road"
      );
    });

    it("Should add a product", async function () {
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      const product = await supplyChain.getProduct(1);
      expect(product.id).to.equal(1);
      expect(product.name).to.equal("Organic Tomatoes");
      expect(product.description).to.equal("Fresh organic tomatoes");
      expect(product.currentOwner).to.equal(farmer.address);
      expect(product.farmer).to.equal(farmer.address);
      expect(product.status).to.equal(0); // Produced
      expect(product.location).to.equal("Farm Location");
      expect(product.imageHash).to.equal("QmImageHash");
      expect(product.certificateHash).to.equal("QmCertHash");
      expect(product.exists).to.be.true;
    });

    it("Should only allow farmers to add products", async function () {
      await expect(
        supplyChain.connect(distributor).addProduct(
          "Organic Tomatoes",
          "Fresh organic tomatoes",
          "Farm Location",
          "QmImageHash",
          "QmCertHash"
        )
      ).to.be.revertedWith("Must have FARMER_ROLE to add products");
    });

    it("Should update product status", async function () {
      // Add product
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      // Transfer to distributor first
      await supplyChain.connect(farmer).transferOwnership(1, distributor.address);

      // Update status by distributor
      await supplyChain.connect(distributor).updateProductStatus(
        1,
        1, // InTransit
        "Warehouse Location"
      );

      const product = await supplyChain.getProduct(1);
      expect(product.status).to.equal(1); // InTransit
      expect(product.location).to.equal("Warehouse Location");
    });

    it("Should only allow current owner to update status", async function () {
      // Add product
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      // Try to update status by non-owner
      await expect(
        supplyChain.connect(distributor).updateProductStatus(
          1,
          1, // InTransit
          "Warehouse Location"
        )
      ).to.be.revertedWith("Only current owner can update status");
    });

    it("Should transfer ownership", async function () {
      // Add product
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      // Transfer ownership
      await supplyChain.connect(farmer).transferOwnership(1, distributor.address);

      const product = await supplyChain.getProduct(1);
      expect(product.currentOwner).to.equal(distributor.address);
    });

    it("Should only allow current owner to transfer ownership", async function () {
      // Add product
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      // Try to transfer ownership by non-owner
      await expect(
        supplyChain.connect(distributor).transferOwnership(1, retailer.address)
      ).to.be.revertedWith("Only current owner can transfer ownership");
    });

    it("Should validate status transitions", async function () {
      // Add product
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      // Try invalid status transition (Produced -> Retail, skipping InTransit and Distributed)
      await expect(
        supplyChain.connect(farmer).updateProductStatus(
          1,
          3, // Retail
          "Store Location"
        )
      ).to.be.revertedWith("Invalid status transition");
    });
  });

  describe("Product History", function () {
    beforeEach(async function () {
      // Register users
      await supplyChain.connect(farmer).registerUser(
        "John Farmer",
        "john@farm.com",
        "Organic Farm",
        "123 Farm Road"
      );
      await supplyChain.connect(distributor).registerUser(
        "Distribution Co",
        "dist@company.com",
        "Distribution Company",
        "456 Warehouse St"
      );
    });

    it("Should track product history", async function () {
      // Add product
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      // Transfer and update status
      await supplyChain.connect(farmer).transferOwnership(1, distributor.address);
      await supplyChain.connect(distributor).updateProductStatus(
        1,
        1, // InTransit
        "Warehouse Location"
      );

      const history = await supplyChain.getProductHistory(1);
      expect(history.length).to.equal(3); // Initial, Transfer, Status Update

      // Check history entries
      expect(history[0].status).to.equal(0); // Produced
      expect(history[0].actor).to.equal(farmer.address);
      expect(history[0].location).to.equal("Farm Location");

      expect(history[1].status).to.equal(0); // Still Produced during transfer
      expect(history[1].actor).to.equal(farmer.address);

      expect(history[2].status).to.equal(1); // InTransit
      expect(history[2].actor).to.equal(distributor.address);
      expect(history[2].location).to.equal("Warehouse Location");
    });
  });

  describe("Pausing", function () {
    it("Should allow admin to pause and unpause", async function () {
      await supplyChain.pause();
      expect(await supplyChain.paused()).to.be.true;

      await supplyChain.unpause();
      expect(await supplyChain.paused()).to.be.false;
    });

    it("Should prevent operations when paused", async function () {
      await supplyChain.pause();

      await expect(
        supplyChain.connect(farmer).addProduct(
          "Organic Tomatoes",
          "Fresh organic tomatoes",
          "Farm Location",
          "QmImageHash",
          "QmCertHash"
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should only allow admin to pause", async function () {
      await expect(
        supplyChain.connect(farmer).pause()
      ).to.be.reverted;
    });
  });

  describe("Statistics", function () {
    beforeEach(async function () {
      // Register farmer
      await supplyChain.connect(farmer).registerUser(
        "John Farmer",
        "john@farm.com",
        "Organic Farm",
        "123 Farm Road"
      );
    });

    it("Should return correct statistics", async function () {
      // Add some products
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash1",
        "QmCertHash1"
      );
      await supplyChain.connect(farmer).addProduct(
        "Organic Carrots",
        "Fresh organic carrots",
        "Farm Location",
        "QmImageHash2",
        "QmCertHash2"
      );

      const stats = await supplyChain.getStats();
      expect(stats.totalProducts).to.equal(2);
      expect(stats.totalUsers).to.equal(1);
      expect(stats.totalTransactions).to.equal(2); // 2 product additions
    });
  });

  describe("Events", function () {
    beforeEach(async function () {
      // Register farmer
      await supplyChain.connect(farmer).registerUser(
        "John Farmer",
        "john@farm.com",
        "Organic Farm",
        "123 Farm Road"
      );
    });

    it("Should emit ProductAdded event", async function () {
      await expect(
        supplyChain.connect(farmer).addProduct(
          "Organic Tomatoes",
          "Fresh organic tomatoes",
          "Farm Location",
          "QmImageHash",
          "QmCertHash"
        )
      ).to.emit(supplyChain, "ProductAdded")
        .withArgs(1, "Organic Tomatoes", farmer.address);
    });

    it("Should emit ProductStatusUpdated event", async function () {
      // Add product first
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      await expect(
        supplyChain.connect(farmer).updateProductStatus(
          1,
          1, // InTransit
          "New Location"
        )
      ).to.emit(supplyChain, "ProductStatusUpdated")
        .withArgs(1, 1, "New Location", farmer.address);
    });

    it("Should emit OwnershipTransferred event", async function () {
      // Add product first
      await supplyChain.connect(farmer).addProduct(
        "Organic Tomatoes",
        "Fresh organic tomatoes",
        "Farm Location",
        "QmImageHash",
        "QmCertHash"
      );

      await expect(
        supplyChain.connect(farmer).transferOwnership(1, distributor.address)
      ).to.emit(supplyChain, "OwnershipTransferred")
        .withArgs(1, farmer.address, distributor.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should revert when getting non-existent product", async function () {
      await expect(
        supplyChain.getProduct(999)
      ).to.be.revertedWith("Product does not exist");
    });

    it("Should revert when getting history of non-existent product", async function () {
      await expect(
        supplyChain.getProductHistory(999)
      ).to.be.revertedWith("Product does not exist");
    });

    it("Should handle empty strings gracefully", async function () {
      // Register farmer
      await supplyChain.connect(farmer).registerUser(
        "John Farmer",
        "john@farm.com",
        "Organic Farm",
        "123 Farm Road"
      );

      await expect(
        supplyChain.connect(farmer).addProduct(
          "", // Empty name
          "Description",
          "Location",
          "ImageHash",
          "CertHash"
        )
      ).to.be.revertedWith("Product name cannot be empty");
    });
  });
});