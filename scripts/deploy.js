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
  const TestCRP = await hre.ethers.getContractFactory("TestCRP"); 
  const testCRP = await TestCRP.deploy();
  const sportPrediction = await SportPrediction.deploy(testCRP.address);

  await sportPrediction.deployed();

  let txn = await sportPrediction.addSportEvent('psg','lyon',1647429340);
  await txn.wait();

  txn  =  await sportPrediction.eventExists('0xae4eb1856affa86b1ac3b0870b40ce485647885ab20b46f9cf505b63190417e2');


  console.log(txn);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
