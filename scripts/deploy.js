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
  const [owner, tester] = await hre.ethers.getSigners();
  const SportPrediction = await hre.ethers.getContractFactory("SportPrediction");
  const SportOracle = await hre.ethers.getContractFactory("SportOracle");
  const sportOracle = await SportOracle.deploy();
  const Token = await hre.ethers.getContractFactory("CRP");
  const token = await Token.deploy();
  const sportPrediction = await SportPrediction.deploy(sportOracle.address,token.address,100);
  await sportOracle.deployed();
  await token.deployed();
  await sportPrediction.deployed();

  let txn = await sportOracle.addSportEvent('psg','lyon',1647429340,1647429340);
  txn = await sportOracle.addSportEvent('madrid','lyon',1647429340,1647429340);
  txn = await sportOracle.addSportEvent('psg','barca',1647429340,1647429340);
  txn = await sportOracle.addSportEvent('manu','lyon',1647429340,1647429340);
  await txn.wait();

  let eventId  =  await sportOracle.getAllEvents(0,3);
  let ids = [];
  eventId.forEach(el => {
    ids.push(el[0]);
  });

  await token.connect(owner).approve(sportPrediction.address,1000);
  eventId  =  await sportPrediction.connect(owner).predict(ids[2],2,1);
  await eventId.wait();
  eventId  =  await sportPrediction.connect(owner).predict(ids[1],2,2);
  await eventId.wait();
  eventId  =  await sportPrediction.connect(owner).predict(ids[0],0,1);
  await eventId.wait();
  eventId  =  await sportOracle.declareOutcome(ids[2],2,2,1);
  await eventId.wait();
  eventId  =  await sportOracle.declareOutcome(ids[1],2,0,2);
  eventId  =  await sportOracle.declareOutcome(ids[0],2,0,1);
  eventId  =  await sportPrediction.getUserPredictions("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",[ids[2],ids[1],ids[0]]);
  eventId  =  await sportPrediction.userPredictStatus("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",[ids[2],ids[1],ids[0]]); 
  //txn  =  await sportPrediction.setOracleAddress(sportOracle.address);
  //txn  =  await sportPrediction.predict(eventId[0],10,'2','1');

  //txn  =  await sportPrediction.userPredictStatus('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',eventId[0]);
  //let declare  =  await sportOracle.declareOutcome(eventId[0],2,'2','1');
  //declare  =  await sportPrediction.userPredictStatus('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',eventId[0]);
  console.log('SportOracle Deployed to:', sportOracle.address);
  console.log('Token Deployed to:', token.address);
  console.log('SportPrediction Deployed to:', sportPrediction.address);
  console.log(eventId);
  console.log(await token.balanceOf(sportPrediction.address));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
