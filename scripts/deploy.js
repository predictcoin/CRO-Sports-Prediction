
const {ethers, upgrades} = require("hardhat");

async function main() {

  const adminAddress = process.env.ADMIN_ADDRESS;
  //const crpToken = process.env.CRP_TOKEN;
  //const BnbToken = process.env.BNB_TOKEN;
  const [signer] = await ethers.getSigners();
  const CRPToken = await ethers.getContractFactory("CRP");
  const BNBTOKEN = await ethers.getContractFactory("BNB");
  const crpToken = await CRPToken.deploy();
  const bnbToken = await BNBTOKEN.deploy();
  const SportOracle = await ethers.getContractFactory("SportOracle");
  const SportPrediction = await ethers.getContractFactory("SportPrediction");
  const sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"});
  const sportPrediction = await upgrades.deployProxy(SportPrediction,
    [ sportOracle.address,
      crpToken.address,
      ethers.utils.parseUnits("100")],
      {kind: "uups"});
  const SportPredictionTreasury = await ethers.getContractFactory("SportPredictionTreasury");
  
  const treasury = await SportPredictionTreasury.deploy(bnbToken.address,10);
  bnbToken.connect(signer).approve(treasury.address, ethers.utils.parseUnits("100000"));
  let txn = await treasury.deposit(ethers.utils.parseUnits("5"));
  txn = await treasury.withdraw(ethers.utils.parseUnits("5"));

  console.log(`
    SportOracle deployed to: ${sportOracle.address},
    SportPrediction: ${sportPrediction.address},
    SportPredictionTreasury: ${treasury.address}`);

  console.log(await bnbToken.balanceOf(treasury.address));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
