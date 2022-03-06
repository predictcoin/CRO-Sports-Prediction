// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const SportPrediction = await hre.ethers.getContractFactory("SportPrediction");
  const SportOracle = await hre.ethers.getContractFactory("SportOracle");
  const sportOracle = await SportOracle.deploy();
  const sportPrediction = await SportPrediction.deploy();
  await sportOracle.deployed();
  await sportPrediction.deployed();

  let txn = await sportOracle.addSportEvent('psg','lyon',1647429340);
  await txn.wait();

  let eventId  =  await sportOracle.getPendingEvents();
  txn  =  await sportPrediction.setOracleAddress(sportOracle.address);
  txn  =  await sportPrediction.predict(eventId[0],10,'2','1');

  txn  =  await sportPrediction.userPredictStatus('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',eventId[0]);
  let declare  =  await sportOracle.declareOutcome(eventId[0],2,'2','1');
  declare  =  await sportPrediction.userPredictStatus('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',eventId[0]);

  console.log(txn);
  console.log(declare);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
