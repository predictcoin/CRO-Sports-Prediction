const { ethers, waffle } = require('hardhat')
const { expect}  = require('chai')
const { it } = require('mocha')


describe('SportPrediction Treasury Contract Test', () => {

    let token, treasury, deployer, user, provider, sportPrediction

    beforeEach(async () => {
        [deployer, user] = await ethers.getSigners()
        provider = waffle.provider;
        const adminAddress = process.env.ADMIN_ADDRESS
        const CRPToken = await ethers.getContractFactory("CRP")
        token = await CRPToken.deploy()
        const SportPredictionTreasury = 
        await ethers.getContractFactory("SportPredictionTreasury")
        treasury = await SportPredictionTreasury.deploy()
        const SportOracle = await ethers.getContractFactory("SportOracle");
        const sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"});
        const SportPrediction = await ethers.getContractFactory("SportPrediction")
        sportPrediction = await upgrades.deployProxy(SportPrediction,
            [ sportOracle.address,
              treasury.address,
              token.address,
              ethers.utils.parseUnits("100"),
              10,
              50],
              {kind: "uups"});
    })

    it('Should returns true if account is authorised', async() => {
       expect(await treasury.isAuthorized(deployer.getAddress())).to.be.true
    })

    it('Should returns false if account is not authorised', async() => {
        expect(await treasury.isAuthorized(sportPrediction.address)).to.be.false
    })

    it('Should set SportPrediction address', async() => {
        const tx = await treasury.setSportPredictionAddress(sportPrediction.address)
        const receipt = await tx.wait()
        const actualAddress = receipt.events[0].args[1]
        expect(actualAddress).to.equal(sportPrediction.address)
    })


    it('Should only allow deployer set SportPrediction address', async() => {
        expect(treasury.connect(user).setSportPredictionAddress(sportPrediction.address)).to.be.reverted
    })


    it('Should withdraw BNB from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await deployer.sendTransaction({to: treasury.address, value: amount})

        const tx = await treasury.withdraw(amount)
        const contractBalance = await provider.getBalance(treasury.address)
        expect(contractBalance).to.equal(ethers.BigNumber.from(0))
    })


    it('Should only allow deployer withdraw BNB from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await deployer.sendTransaction({to: treasury.address, value: amount})

        expect(treasury.connect(user).withdraw(amount)).to.be.reverted
    })



    it('Should withdraw token from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await token.approve(treasury.address, amount)
        await token.transfer(treasury.address, amount)

        await token.approve(user.getAddress(), amount)
        const tx = await treasury.withdrawToken(token.address, user.getAddress(), amount)
        const userBalance = await token.balanceOf(user.getAddress())
        expect(userBalance).to.equal(amount)
    })


    it('Should allow only authorised account withdraw token from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await token.approve(treasury.address, amount)
        await token.transfer(treasury.address, amount)

        await token.approve(user.getAddress(), amount)
        expect(treasury.connect(user).withdrawToken(token.address, user.getAddress(), amount)).to.be.reverted
    })


})