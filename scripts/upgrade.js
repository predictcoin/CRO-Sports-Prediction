const { ethers, upgrades }  = require("hardhat");

async function main() {
  // We get the contract to deploy
  const SportPrediction = await ethers.getContractFactory("SportPrediction");
  const sportPrediction = await upgrades.upgradeProxy(
    process.env.SPORT_PREDICTION,
    SportPrediction,
    { kind: "uups" }
  );

  console.log(
    `SportPrediction implementation deployed to:${await ethers.provider.getStorageAt(
      process.env.SPORT_PREDICTION,
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
    )}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
