
const {ethers, upgrades} = require("hardhat");

async function main() {

  const adminAddress = process.env.ADMIN_ADDRESS;
  const crpToken = process.env.CRP_TOKEN;
  const SportOracle = await ethers.getContractFactory("SportOracle");
  const SportPrediction = await ethers.getContractFactory("SportPrediction");
  const sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"});
  const sportPrediction = await upgrades.deployProxy(SportPrediction,
    [ sportOracle.address,
      crpToken,
      ethers.utils.parseUnits("100")],
      {kind: "uups"});
  
  console.log(`
    SportOracle deployed to: ${sportOracle.address},
    SportPrediction: ${sportPrediction.address}`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
