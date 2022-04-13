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
              10],
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


    it('Should deposit BNB to treasury contract', async() => {
        const amount = ethers.utils.parseUnits("100")
        const tx = await treasury.deposit({value: amount})
        const receipt  = await tx.wait()
        const treasuryBalance = await provider.getBalance(treasury.address)
        expect(treasuryBalance).to.equal(amount)
        expect(receipt.events[0].args[0]).to.equal(await deployer.getAddress())
        expect(receipt.events[0].args[1]).to.equal(amount)
    })


    it('Should only deposit BNB to treasury contract greater than 0', async() => {
        const amount = ethers.BigNumber.from(0)
        expect(treasury.deposit({value: amount})).to.be.reverted
    })


    it('Should deposit token to treasury contract', async() => {
        const amount = ethers.utils.parseUnits("100")
        await token.approve(treasury.address, amount)
        const tx = await treasury.depositToken(token.address, deployer.getAddress(), amount)
        const receipt  = await tx.wait()
        const treasuryBalance = await token.balanceOf(treasury.address)
        expect(treasuryBalance).to.equal(amount)
        expect(receipt.events[2].args[0]).to.equal(await deployer.getAddress())
        expect(receipt.events[2].args[1]).to.equal(amount)
    })


    it('Should withdraw BNB from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await treasury.deposit({value: amount})

        const tx = await treasury.withdraw(amount)
        const contractBalance = await provider.getBalance(treasury.address)
        const receipt  = await tx.wait()
        expect(contractBalance).to.equal(ethers.BigNumber.from(0))
        expect(receipt.events[0].args[0]).to.equal(await deployer.getAddress())
        expect(receipt.events[0].args[1]).to.equal(amount)
    })


    it('Should only allow deployer withdraw BNB from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await treasury.deposit({value: amount})

        expect(treasury.connect(user).withdraw(amount)).to.be.reverted
    })



    it('Should withdraw token from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await token.approve(treasury.address, amount)
        await treasury.depositToken(token.address, deployer.getAddress(), amount)

        await token.approve(user.getAddress(), amount)
        const tx = await treasury.withdrawToken(token.address, user.getAddress(), amount)
        const userBalance = await token.balanceOf(user.getAddress())
        const receipt  = await tx.wait()
        expect(userBalance).to.equal(amount)
        expect(receipt.events[1].args[0]).to.equal(await user.getAddress())
        expect(receipt.events[1].args[1]).to.equal(amount)
    })


    it('Should allow only authorised account withdraw token from treasury contract', async() => {
        const amount = ethers.utils.parseUnits("50")
        await token.approve(treasury.address, amount)
        await treasury.depositToken(token.address, deployer.getAddress(), amount)

        await token.approve(user.getAddress(), amount)
        expect(treasury.connect(user).withdrawToken(token.address, user.getAddress(), amount)).to.be.reverted
    })


})