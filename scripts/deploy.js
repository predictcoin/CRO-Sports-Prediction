
const {ethers, upgrades} = require("hardhat");

async function main() {

  const adminAddress = process.env.ADMIN_ADDRESS;
  //const crpToken = process.env.CRP_TOKEN;
  //const BnbToken = process.env.BNB_TOKEN;
  let address = await ethers.getSigners();
  const CRPToken = await ethers.getContractFactory("CRP");
  const BNBTOKEN = await ethers.getContractFactory("BNB");
  const crpToken = await CRPToken.deploy();
  const bnbToken = await BNBTOKEN.deploy();
  const SportOracle = await ethers.getContractFactory("SportOracle");
  const SportPrediction = await ethers.getContractFactory("SportPrediction");
  const sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"});
  const SportPredictionTreasury = await ethers.getContractFactory("SportPredictionTreasury");
  const treasury = await SportPredictionTreasury.deploy(bnbToken.address,10);
  const sportPrediction = await upgrades.deployProxy(SportPrediction,
    [ sportOracle.address,
      treasury.address,
      crpToken.address,
      ethers.utils.parseUnits("100")],
      {kind: "uups"});
  let test = await sportOracle.addSportEvent('lyon','psg',1648227766,1648227766);
  test = await sportOracle.addSportEvent('barca','madrid',1648227776,1648227776);
  test = await sportOracle.addSportEvent('arsenal','manu',1648227786,1648227786);
  test = await sportOracle.getPendingEvents();
  let ids = [];
  test.forEach(el => {
    ids.push(el[0]);
  });

  crpToken.connect(address[0]).approve(treasury.address, ethers.utils.parseUnits("1000"));
  test = await sportPrediction.predict(ids[0],0,1);

  console.log(`
    SportOracle deployed to: ${sportOracle.address},
    SportPrediction: ${sportPrediction.address},
    SportPredictionTreasury: ${treasury.address}`);

  console.log(address[0].address);
  console.log(await crpToken.balanceOf("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
