const { ethers, waffle } = require('hardhat')
const { expect}  = require('chai')
const { DateTime } = require('luxon')
const { time } = require('@openzeppelin/test-helpers');
const { it } = require('mocha')


describe('SportPrediction Contract Test', () => {

    let token, treasury, deployer, user, provider, sportPrediction, sportOracle,
    eventId1, eventId2, teamA1, teamB1, startTime1, endTime1, teamA2, teamB2, 
    startTime2, endTime2, league1,league2, season1, season2, round1, round2, 
    timestamp, elapsedTime

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
        sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"})
        const SportPrediction = await ethers.getContractFactory("SportPrediction")
        sportPrediction = await upgrades.deployProxy(SportPrediction,
            [ sportOracle.address,
              treasury.address,
              token.address,
              ethers.utils.parseUnits("100"),
              10,
              50],
              {kind: "uups"})

        timestamp = ethers.BigNumber.from((await provider.getBlock()).timestamp)

        // Add 2 sport events for test purpose
        teamA1  = "PSG"
        teamB1 = "Lyon"
        league1 = "French Cup"
        season1 = 2022
        round1 = "Semi Final"
        startTime1 = timestamp.add(parseInt(time.duration.hours(1)))
        endTime1 = timestamp.add(parseInt(time.duration.hours(2)))

        eventId1 = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16"],
            [teamA1, teamB1, league1, round1, season1]
        )

        teamA2  = "Juventus"
        teamB2  = "Liverpool"
        league2 = "International Champions Cup"
        season2 = 2022
        round2 = "Final"
        startTime2 = timestamp.add(parseInt(time.duration.hours(1)))
        endTime2 = timestamp.add(parseInt(time.duration.hours(2)))

        eventId2 = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16"],
            [teamA2, teamB2, league2, round2, season2]
        )

        await sportOracle.connect(deployer).addSportEvents(
            [teamA1, teamA2],
            [teamB1, teamB2],
            [league1, league2],
            [round1, round2],
            [startTime1, startTime2],
            [endTime1, endTime2],
            [season1, season2]
        )

        elapsedTime = 1*24*60*60

        
    })

    it('Should initialize contract variable', async() => {
        expect(await sportPrediction.sportOracle()).to.equal(sportOracle.address)
        expect(await sportPrediction.treasury()).to.equal(treasury.address)
        expect(await sportPrediction.predictAmount()).to.equal(ethers.utils.parseUnits("100"))
        expect(await sportPrediction.maxPredictions()).to.equal(ethers.BigNumber.from("50"))
    })


    it('Should update sport oracle address', async() => {
        const tx = await sportPrediction.setOracleAddress(sportOracle.address)
        const receipt = await tx.wait()
        expect(receipt.events[0].args[0]).to.equal(sportOracle.address)
    })


    it('Should allow only owner to update oracle address', async() => {
        expect(sportPrediction.connect(user).setOracleAddress(sportOracle.address)).to.be.reverted
    })


    it('Should update treasury address', async() => {
        const tx = await sportPrediction.setTreasuryAddress(treasury.address)
        const receipt = await tx.wait()
        expect(receipt.events[0].args[0]).to.equal(treasury.address)
    })


    it('Should allow only owner to update treasury address', async() => {
        expect(sportPrediction.connect(user).setTreasuryAddress(treasury.address)).to.be.reverted
    })


    it('Should update predict amount', async() => {
        const amount = ethers.utils.parseUnits("50")
        const tx = await sportPrediction.setPredictAmount(amount)
        const receipt = await tx.wait()
        expect(receipt.events[0].args[0]).to.equal(amount)
    })


    it('Should allow only owner to update predict amount', async() => {
        const amount = ethers.utils.parseUnits("50")
        expect(sportPrediction.connect(user).setPredictAmount(amount)).to.be.reverted
    })


    it('Should only update predict amount greater than 0', async() => {
        const amount = ethers.BigNumber.from(0)
        expect(sportPrediction.connect(user).setPredictAmount(amount)).to.be.reverted
    })

    it('Should update reward multiplier', async() => {
        const amount = ethers.BigNumber.from(20)
        const tx = await sportPrediction.setMultiplier(amount)
        const receipt = await tx.wait()
        expect(receipt.events[0].args[0]).to.equal(amount)
    })


    it('Should allow only owner to update reward multiplier', async() => {
        const amount = ethers.BigNumber.from(20)
        expect(sportPrediction.connect(user).setMultiplier(amount)).to.be.reverted
    })


    it('Should only update predict amount greater than 0', async() => {
        const amount = ethers.BigNumber.from(0)
        expect(sportPrediction.connect(user).setMultiplier(amount)).to.be.reverted
    })


    it('Should update maximum predictions count', async() => {
        const count = ethers.BigNumber.from(100)
        const tx = await sportPrediction.setMaxPredictions(count)
        const receipt = await tx.wait()
        expect(receipt.events[0].args[0]).to.equal(count)
    })


    it('Should allow only owner to update maximum predictions count', async() => {
        const count = ethers.BigNumber.from(100)
        expect(sportPrediction.connect(user).setMaxPredictions(count)).to.be.reverted
    })


    it('Should only update maximum prediction count greater than 0', async() => {
        const count = ethers.BigNumber.from(0)
        expect(sportPrediction.connect(user).setMaxPredictions(count)).to.be.reverted
    })


    it("Should returns predictable sport events", async () => {
        const tx  = await sportPrediction.getPredictableEvents()
        expect(tx[0].id).to.equal(eventId2)
        expect(ethers.utils.toUtf8String(tx[0].teamA)).to.equal(teamA2)
        expect(ethers.utils.toUtf8String(tx[0].teamB)).to.equal(teamB2)
        expect(tx[0].startTimestamp).to.equal(ethers.BigNumber.from(startTime2))
        expect(tx[0].endTimestamp).to.equal(ethers.BigNumber.from(endTime2))
        expect(tx[0].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[0].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[0].realTeamBScore).to.equal(ethers.BigNumber.from(-1))

        expect(tx[1].id).to.equal(eventId1)
        expect(ethers.utils.toUtf8String(tx[1].teamA)).to.equal(teamA1)
        expect(ethers.utils.toUtf8String(tx[1].teamB)).to.equal(teamB1)
        expect(tx[1].startTimestamp).to.equal(ethers.BigNumber.from(startTime1))
        expect(tx[1].endTimestamp).to.equal(ethers.BigNumber.from(endTime1))
        expect(tx[1].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[1].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[1].realTeamBScore).to.equal(ethers.BigNumber.from(-1))
    })


    it('Should predict on sport event', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)
        const tx = await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        const receipt = await tx.wait()
        expect(receipt.events[2].args[0]).to.equal(eventId1)
        expect(receipt.events[2].args[1]).to.equal(await deployer.getAddress())
        expect(receipt.events[2].args[2]).to.equal(ethers.BigNumber.from(1))
        expect(receipt.events[2].args[3]).to.equal(ethers.BigNumber.from(3))
        expect(receipt.events[2].args[4]).to.equal(predictAmount)
    })

    it('Should only predict on sport event when user balance exceed predict amount', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.connect(user).approve(sportPrediction.address, predictAmount)
        expect(sportPrediction.connect(user).predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))).to.be.reverted
    })


    it('Should only predict on live sport event', async() => {
        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)
        expect(sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))).to.be.reverted
    })


    it('Should only predict on sport event once', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)

        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(0),
            ethers.BigNumber.from(2))

        expect(sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))).to.be.reverted
    })


    it('Should only predict on valid sport event', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)

        const nonExistentEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            ["Barcelona", 
            "Madrid",
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5}).toSeconds())),
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5, hours: 2}).toSeconds())) 
            ]
        )
        expect(sportPrediction.predict(
            nonExistentEventId,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))).to.be.reverted
    })

    it('Should return user predictions on sport events', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        const multiplier = await sportPrediction.getMultiplier()
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        const tx = await sportPrediction.getUserPredictions(deployer.getAddress(),[eventId1])
        expect(tx[0].user).to.equal(await deployer.getAddress())
        expect(tx[0].eventId).to.equal(eventId1)
        expect(tx[0].amount).to.equal(predictAmount)
        expect(tx[0].reward).to.equal(ethers.BigNumber.from(predictAmount).mul(multiplier));
        expect(tx[0].teamAScore).to.equal(ethers.BigNumber.from(1))
        expect(tx[0].teamBScore).to.equal(ethers.BigNumber.from(3))
        expect(tx[0].predicted).to.be.true
        expect(tx[0].claimed).to.be.false
    })


    it('Should only returns user predictions on valid sport events', async() => {
    
        const nonExistentEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            ["Barcelona", 
            "Madrid",
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5}).toSeconds())),
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5, hours: 2}).toSeconds())) 
            ]
        )
        expect(sportPrediction.getUserPredictions(deployer.getAddress(),[nonExistentEventId])).to.be.reverted
    })

    

    it('Should only returns user predictions status on sport events that are decided', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        expect(sportPrediction.userPredictStatus(deployer.getAddress(),[eventId1])).to.be.reverted
    })


    it('Should only returns user predictions status on valid sport events', async() => {
    
        const nonExistentEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            ["Barcelona", 
            "Madrid",
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5}).toSeconds())),
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5, hours: 2}).toSeconds())) 
            ]
        )
        expect(sportPrediction.userPredictStatus(deployer.getAddress(),[nonExistentEventId])).to.be.reverted
    })


    it('Should returns false if the user predicted wrong score ', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        await sportOracle.declareOutcome(
            eventId1,
            ethers.BigNumber.from(2),
            ethers.BigNumber.from(3)
        )

        const tx = await sportPrediction.userPredictStatus(deployer.getAddress(),[eventId1])
        expect(tx[0]).to.be.false
    })


    it('Should returns true if the user predicted correct score ', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        await sportOracle.declareOutcome(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3)
        )

        const tx = await sportPrediction.userPredictStatus(deployer.getAddress(),[eventId1])
        expect(tx[0]).to.be.true
    })


    it('Should allow only winner to claim reward for a sport event', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        await sportOracle.declareOutcome(
            eventId1,
            ethers.BigNumber.from(2),
            ethers.BigNumber.from(3)
        )

        expect(sportPrediction.claim(eventId1)).to.be.reverted
    })


    it('Should claim reward for a sport event', async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        const multiplier = await sportPrediction.getMultiplier();
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        await sportOracle.declareOutcome(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3)
        )

        const amount = ethers.utils.parseUnits("10000")
        await token.approve(treasury.address, amount)
        await token.transfer(treasury.address, amount)

        await treasury.setSportPredictionAddress(sportPrediction.address)
        // await token.approve(deployer.getAddress(), predictAmount)
        const tx = await sportPrediction.claim([eventId1])
        const receipt  = await tx.wait()
        expect(receipt.events[2].args[0]).to.equal(await deployer.getAddress())
        expect(receipt.events[2].args[1]).to.equal(eventId1)
        expect(receipt.events[2].args[2]).to.equal(
          ethers.BigNumber.from(predictAmount).mul(multiplier)
        );

    })


    it("Should allow only winner that does'nt claim reward to claim for a sport event", async() => {
        const predictAmount = ethers.utils.parseUnits("100")
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        await sportOracle.declareOutcome(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3)
        )

        const amount = ethers.utils.parseUnits("10000")
        await token.approve(treasury.address, amount)
        await token.transfer(treasury.address, amount)

        await treasury.setSportPredictionAddress(sportPrediction.address)
        await token.approve(deployer.getAddress(), predictAmount)
        const tx = await sportPrediction.claim([eventId1])

        expect(sportPrediction.claim([eventId1])).to.be.reverted

    })


    it("Should returns specified prediction using id", async () => {

        const predictAmount = ethers.utils.parseUnits("100")
        const multiplier = await sportPrediction.getMultiplier()
        await token.approve(sportPrediction.address, predictAmount)
        await sportPrediction.predict(
            eventId1,
            ethers.BigNumber.from(1),
            ethers.BigNumber.from(3))

        const tx  = await sportPrediction.getPredictions(eventId1)
        expect(tx[0].user).to.equal(await deployer.getAddress())
        expect(tx[0].eventId).to.equal(eventId1)
        expect(tx[0].amount).to.equal(predictAmount)
        expect(tx[0].reward).to.equal(ethers.BigNumber.from(predictAmount).mul(multiplier));
        expect(tx[0].teamAScore).to.equal(ethers.BigNumber.from(1))
        expect(tx[0].teamBScore).to.equal(ethers.BigNumber.from(3))
        expect(tx[0].predicted).to.be.true
        expect(tx[0].claimed).to.be.false
    })

})