const hre = require("hardhat");

async function main() {
  console.log("Deploying CivicSense smart contract...");

  const CivicSense = await hre.ethers.getContractFactory("CivicSense");
  const civicSense = await CivicSense.deploy();

  await civicSense.waitForDeployment();

  const address = await civicSense.getAddress();

  console.log("CivicSense deployed to:", address);
  console.log(`Network: ${hre.network.name}`);
  console.log(`\nView on Etherscan: https://sepolia.etherscan.io/address/${address}`);
  console.log("\nAdd this address to your .env files:");
  console.log(`CONTRACT_ADDRESS=${address}`);
  console.log(`REACT_APP_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
