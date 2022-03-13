
const {ethers, upgrades} = require("hardhat");

async function main() {

  const SportOracle = await ethers.getContractFactory("SportOracle");
  const SportPrediction = await ethers.getContractFactory("SportPrediction");
  const testToken = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const sportOracle = await upgrades.deployProxy(SportOracle,{kind:"uups"});
  const sportPrediction = await upgrades.deployProxy(SportPrediction,
    [ sportOracle.address,
      testToken,
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
