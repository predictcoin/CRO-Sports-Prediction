
const {ethers, upgrades} = require("hardhat");

async function main() {

  const adminAddress = process.env.ADMIN_ADDRESS;
  const crpToken = process.env.CRP_TOKEN;
  const bnbToken = process.env.BNB_TOKEN;
  let address = await ethers.getSigners();
  const SportOracle = await ethers.getContractFactory("SportOracle");
  const SportPrediction = await ethers.getContractFactory("SportPrediction");
  const sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"});
  const SportPredictionTreasury = await ethers.getContractFactory("SportPredictionTreasury");
  const treasury = await SportPredictionTreasury.deploy();
  const sportPrediction = await upgrades.deployProxy(SportPrediction,
    [ sportOracle.address,
      treasury.address,
      crpToken,
      ethers.utils.parseUnits("100"),
      10],
      {kind: "uups"});
  let test = await sportOracle.addSportEvent('lyon','psg',1648715136,1648715136);
  test = await sportOracle.addSportEvent('barca','madrid',1648715136,1648715136);
  test = await sportOracle.addSportEvent('arsenal','manu',1648715136,1648715136);
  test = await sportOracle.getPendingEvents();
  let ids = [];
  test.forEach(el => {
    ids.push(el[0]);
  });

  test = await sportPrediction.predict(ids[0],0,1);
  test = await sportPrediction.predict(ids[1],2,1);
  test = await sportPrediction.predict(ids[2],2,3);
  test = await sportOracle.declareOutcome(ids[0],2,0,1);
  test = await sportOracle.declareOutcome(ids[1],2,1,0);
  test = await sportOracle.declareOutcome(ids[2],2,2,3);
  test = await sportPrediction.userPredictStatus(address[0].address,[ids[2],ids[1],ids[0]]);
  test = await sportPrediction.claim(ids[2]);
  test = await sportPrediction.getUserPredictions(address[0].address,[ids[2]]);
  

  console.log(`
    SportOracle deployed to: ${sportOracle.address},
    SportPrediction: ${sportPrediction.address},
    SportPredictionTreasury: ${treasury.address}`);

  console.log(test);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
