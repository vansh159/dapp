const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting SupplyChain contract deployment...");

  // Get the contract factory
  const SupplyChain = await ethers.getContractFactory("SupplyChain");

  // Deploy the contract
  console.log("📦 Deploying SupplyChain contract...");
  const supplyChain = await SupplyChain.deploy();
  
  await supplyChain.waitForDeployment();
  const contractAddress = await supplyChain.getAddress();

  console.log(`✅ SupplyChain contract deployed to: ${contractAddress}`);

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Save deployment information
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: network.name,
    chainId: network.chainId.toString(),
    deploymentTime: new Date().toISOString(),
    contractABI: JSON.parse(supplyChain.interface.formatJson()),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${deploymentFile}`);

  // Save ABI separately for frontend use
  const abiFile = path.join(deploymentsDir, "SupplyChain-abi.json");
  fs.writeFileSync(abiFile, JSON.stringify(deploymentInfo.contractABI, null, 2));
  console.log(`📋 Contract ABI saved to: ${abiFile}`);

  // Create a summary file for easy reference
  const summaryFile = path.join(deploymentsDir, "deployment-summary.json");
  let summary = {};
  
  if (fs.existsSync(summaryFile)) {
    summary = JSON.parse(fs.readFileSync(summaryFile, "utf8"));
  }
  
  summary[network.name] = {
    contractAddress: contractAddress,
    chainId: network.chainId.toString(),
    deploymentTime: deploymentInfo.deploymentTime,
  };
  
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Update your backend .env file with the contract address");
  console.log("2. Update your frontend configuration");
  console.log("3. Verify the contract on Etherscan (if on testnet/mainnet)");
  
  if (network.chainId !== 31337n) {
    console.log(`\n🔍 Verify command:`);
    console.log(`npx hardhat verify --network ${network.name} ${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });