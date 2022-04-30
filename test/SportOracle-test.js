const { ethers, upgrades, waffle } = require('hardhat')
const { expect } = require('chai')
const { time } = require('@openzeppelin/test-helpers')
const { it } = require('mocha')


describe('SportOracle Contract Test', () => {

    let sportOracle, adminAddress,deployer,user, eventId1, eventId2, teamA1,
    teamB1, startTime1, endTime1, teamA2, teamB2, startTime2, endTime2, league1,
    league2, season1, season2, round1, round2, timestamp, provider, elapsedTime
    beforeEach(async () => {
        [deployer, user] = await ethers.getSigners()
        
        adminAddress = process.env.ADMIN_ADDRESS

        const SportOracle = await ethers.getContractFactory("SportOracle")
        sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"})
        provider = waffle.provider

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
            ["string", "string", "string", "string", "uint16", "uint"],
            [teamA1, teamB1, league1, round1, season1, startTime1]
        )

        teamA2  = "Juventus"
        teamB2  = "Liverpool"
        league2 = "International Champions Cup"
        season2 = 2022
        round2 = "Final"
        startTime2 = timestamp.add(parseInt(time.duration.hours(1)))
        endTime2 = timestamp.add(parseInt(time.duration.hours(2)))

        eventId2 = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16", "uint"],
            [teamA2, teamB2, league2, round2, season2, startTime1]
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
        expect(await sportOracle.adminAddress()).to.equal(adminAddress)
    })

    it('Should update admin address', async() => {
        await sportOracle.setAdminAddress(deployer.getAddress())
        expect(await sportOracle.adminAddress()).to.equal(await deployer.getAddress())
    })

    it('Should allow only owner to update admin address', async() => {
        expect(sportOracle.connect(user).setAdminAddress(deployer.getAddress())).to.be.reverted
    })

    it('Should add a new sport event', async() => {
        const teamA  = "Real Madrid"
        const teamB  = "Chelsea"
        const league = "UEFA Champions League"
        const season = 2022
        const round = "Round of 16"
        const startTime = timestamp.add(parseInt(time.duration.hours(1)))
        const endTime = timestamp.add(parseInt(time.duration.hours(2)))

        const tx = await sportOracle.connect(deployer).addSportEvent(
            teamA,
            teamB,
            league,
            round,
            startTime,
            endTime,
            season
        )

        const receipt = await tx.wait()

        const expectedEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16", "uint"],
            [teamA, teamB, league, round, season, startTime]
        )

        const actualEventId = receipt.events[0].args[0]
        expect(actualEventId).to.equal(expectedEventId)
    })
    

    it('Should only allow admin add a new sport event', async() => {
        const teamA  = "Real Madrid"
        const teamB  = "Chelsea"
        const league = "UEFA Champions League"
        const season = 2022
        const round = "Round of 16"
        const startTime = timestamp.add(parseInt(time.duration.hours(1)))
        const endTime = timestamp.add(parseInt(time.duration.hours(2)))

        expect(sportOracle.connect(user).addSportEvent(
            teamA,
            teamB,
            league,
            round,
            startTime,
            endTime,
            season
        )).to.be.reverted
    })


    it('Should add new sport events', async() => {

        teamA1  = "Real Madrid"
        teamB1 = "PSG"
        league1 = "UEFA Champions League"
        season1 = 2022
        round1 = "Quarter Final"
        startTime1 = timestamp.add(parseInt(time.duration.hours(1)))
        endTime1 = timestamp.add(parseInt(time.duration.hours(2)))

        const expectedEventId1 = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16", "uint"],
            [teamA1, teamB1, league1, round1, season1, startTime1]
        )

        teamA2  = "Chealsea"
        teamB2  = "Dortmund"
        league2 = "UEFA Champions League"
        season2 = 2022
        round2 = "Quarter Final"
        startTime2 = timestamp.add(parseInt(time.duration.hours(1)))
        endTime2 = timestamp.add(parseInt(time.duration.hours(2)))
        
        const expectedEventId2 = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16", "uint"],
            [teamA2, teamB2, league2, round2, season2, startTime1]
        )
        const tx = await sportOracle.connect(deployer).addSportEvents(
            [teamA1, teamA2],
            [teamB1, teamB2],
            [league1, league2],
            [round1, round2],
            [startTime1, startTime2],
            [endTime1, endTime2],
            [season1, season2],
        )

        const receipt = await tx.wait()

        const actualEventId1 = receipt.events[0].args[0]
        const actualEventId2 = receipt.events[1].args[0]

        expect(actualEventId1).to.equal(expectedEventId1)
        expect(actualEventId2).to.equal(expectedEventId2)

    })

    
    it('Should only allow admin add new sport events', async() => {

        teamA1  = "Real Madrid"
        teamB1 = "PSG"
        league1 = "UEFA Champions League"
        season1 = 2022
        round1 = "Quarter Final"
        startTime1 = timestamp.add(parseInt(time.duration.hours(1)))
        endTime1 = timestamp.add(parseInt(time.duration.hours(2)))
        
        teamA2  = "Chealsea"
        teamB2  = "Dortmund"
        league2 = "UEFA Champions League"
        season2 = 2022
        round2 = "Quarter Final"
        startTime2 = timestamp.add(parseInt(time.duration.hours(1)))
        endTime2 = timestamp.add(parseInt(time.duration.hours(2)))

        expect(sportOracle.connect(user).addSportEvents(
            [teamA1, teamA2],
            [teamB1, teamB2],
            [league1, league2],
            [round1, round2],
            [startTime1, startTime2],
            [endTime1, endTime2],
            [season1, season2],
        )).to.be.reverted
    })


    it('Should cancel sport events', async() => {

        const tx = await sportOracle.connect(deployer).cancelSportEvents([eventId1, eventId2])

        const receipt  = await tx.wait()

        expect(receipt.events[0].args[0]).to.be.equal(eventId1)
        expect(receipt.events[1].args[0]).to.be.equal(eventId2)
    })

    
    it('Should only allow admin cancel sport events', async() => {

        expect(sportOracle.connect(user).cancelSportEvents([eventId1, eventId2]
        )).to.be.reverted
    })
    

    it('Should not add an existing sport event', async() => {
        const teamA  = "PSG"
        const teamB  = "Lyon"
        const startTime = timestamp.add(parseInt(time.duration.hours(1)))
        const endTime = timestamp.add(parseInt(time.duration.hours(2)))

        expect(sportOracle.addSportEvent(
            teamA,
            teamB,
            startTime,
            endTime
        )).to.be.reverted
    })


    it("Should returns false when there is NO event with this id", async ()=> {
        const nonExistentEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16"],
            ["Barcelona", 
            "Madrid",
            "Spanish Laliga",
            "Final",
            2022
            ]
        )

        expect(await sportOracle.eventExists(nonExistentEventId))
            .to.be.false
    })

    it("Should returns true when there is an event with this id", async ()=> {
        expect(await sportOracle.eventExists(eventId1)).to.be.true
    })



    it("Should returns indexed sport events", async () => {
        const tx  = await sportOracle.getIndexedEvents([1,0])

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


    it("Should returns specified sport events using id", async () => {
        const tx  = await sportOracle.getEvents([eventId2, eventId1])
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


    it("Should returns all the sport events", async () => {
        const tx  = await sportOracle.getAllEvents(0,2)
        expect(tx[0].id).to.equal(eventId1)
        expect(ethers.utils.toUtf8String(tx[0].teamA)).to.equal(teamA1)
        expect(ethers.utils.toUtf8String(tx[0].teamB)).to.equal(teamB1)
        expect(tx[0].startTimestamp).to.equal(ethers.BigNumber.from(startTime1))
        expect(tx[0].endTimestamp).to.equal(ethers.BigNumber.from(endTime1))
        expect(tx[0].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[0].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[0].realTeamBScore).to.equal(ethers.BigNumber.from(-1))

        expect(tx[1].id).to.equal(eventId2)
        expect(ethers.utils.toUtf8String(tx[1].teamA)).to.equal(teamA2)
        expect(ethers.utils.toUtf8String(tx[1].teamB)).to.equal(teamB2)
        expect(tx[1].startTimestamp).to.equal(ethers.BigNumber.from(startTime2))
        expect(tx[1].endTimestamp).to.equal(ethers.BigNumber.from(endTime2))
        expect(tx[1].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[1].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[1].realTeamBScore).to.equal(ethers.BigNumber.from(-1))
    })

   
    it("Should declare predefined event outcome that ended", async () => {
        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1) 

        await sportOracle.declareOutcome(
            eventId1,
            realTeamAScore,
            realTeamBScore
        )

        const tx  = await sportOracle.getEvents([eventId1])

        expect(tx[0].realTeamAScore).to.equal(realTeamAScore)
        expect(tx[0].realTeamBScore).to.equal(realTeamBScore)

    })


    it("Should only allow admin declare predefined event outcome that ended", async () => {
        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1) 

        expect(sportOracle.connect(user).declareOutcome(
            eventId1,
            realTeamAScore,
            realTeamBScore
        )).to.be.reverted

    })


    it("Should only declare predefined event outcome that ended", async () => {

        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1) 

        expect(sportOracle.declareOutcome(
            eventId1,
            realTeamAScore,
            realTeamBScore
        )).to.be.reverted

    })


    it("Should only declare predefined event outcome that is not live", async () => {

        elapsedTime = 70*60

        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1) 

        expect(sportOracle.declareOutcome(
            eventId1,
            realTeamAScore,
            realTeamBScore
        )).to.be.reverted

    })


    it("Should only declare predefined event outcome that is not declared", async () => {
        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1) 

        await sportOracle.declareOutcome(
            eventId1,
            realTeamAScore,
            realTeamBScore
        )

        expect(sportOracle.declareOutcome(
            eventId1,
            realTeamAScore,
            realTeamBScore
        )).to.be.reverted

    })


    it("Should declare predefined events outcomes that ended", async () => {
        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');

        const realTeamAScore1  = ethers.BigNumber.from(3)
        const realTeamBScore1  = ethers.BigNumber.from(1)
        const realTeamAScore2  = ethers.BigNumber.from(2)
        const realTeamBScore2  = ethers.BigNumber.from(0) 

        await sportOracle.declareOutcomes(
            [eventId1, eventId2],
            [realTeamAScore1, realTeamAScore2],
            [realTeamBScore1, realTeamBScore2]
        )

        const tx  = await sportOracle.getEvents([eventId1,eventId2])

        expect(tx[0].realTeamAScore).to.equal(realTeamAScore1)
        expect(tx[0].realTeamBScore).to.equal(realTeamBScore1)
        expect(tx[1].realTeamAScore).to.equal(realTeamAScore2)
        expect(tx[1].realTeamBScore).to.equal(realTeamBScore2)

    })


    it("Should only declare predefined events outcomes that ended", async () => {

        const realTeamAScore1  = ethers.BigNumber.from(3)
        const realTeamBScore1  = ethers.BigNumber.from(1)
        const realTeamAScore2  = ethers.BigNumber.from(2)
        const realTeamBScore2  = ethers.BigNumber.from(0) 

        expect(sportOracle.declareOutcomes(
            [eventId1, eventId2],
            [realTeamAScore1, realTeamAScore2],
            [realTeamBScore1, realTeamBScore2]
        )).to.be.reverted

    })


    it("Should only declare predefined event outcome that exists", async () => {

        const realTeamAScore = ethers.BigNumber.from(3)
        const realTeamBScore = ethers.BigNumber.from(1)
        const nonExistentEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "string", "string", "uint16"],
            ["Barcelona", 
            "Madrid",
            "Spanish Laliga",
            "Final",
            2022
            ]
        )

        expect(sportOracle.declareOutcome(
            nonExistentEventId,
            realTeamAScore,
            realTeamBScore
        )).to.be.reverted

    })


    it("Should returns only the pending sport events", async () => {

        const tx  = await sportOracle.getPendingEvents()
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


    it("Should returns only the live sport events", async () => {

        elapsedTime = 70*60

        await ethers.provider.send('evm_increaseTime', [elapsedTime]);
        await ethers.provider.send('evm_mine');
        const tx  = await sportOracle.getLiveEvents()
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


    it("Should returns events length", async () => {
        const tx  = await sportOracle.getEventsLength()

        expect(tx).to.equal(ethers.BigNumber.from(2))

    })


})