const { ethers, upgrades } = require('hardhat')
const { expect } = require('chai')
const { DateTime } = require('luxon')
const { it } = require('mocha')


describe('SportOracle Contract Test', () => {

    let sportOracle, adminAddress,deployer,user, eventId1, eventId2, teamA1,
    teamB1, startTime1, endTime1, teamA2, teamB2, startTime2, endTime2

    beforeEach(async () => {
        [deployer, user] = await ethers.getSigners()
        
        adminAddress = process.env.ADMIN_ADDRESS

        const SportOracle = await ethers.getContractFactory("SportOracle")
        sportOracle = await upgrades.deployProxy(SportOracle,[adminAddress],{kind:"uups"})

        // Add 2 sport events for test purpose
        teamA1  = "PSG"
        teamB1 = "Lyon"
        startTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4}).toSeconds()))
        endTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4, hours: 2}).toSeconds()))

        eventId1 = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            [teamA1, teamB1, startTime1, endTime1]
        )

        teamA2  = "Juventus"
        teamB2  = "Liverpool"
        startTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4}).toSeconds()))
        endTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4, hours: 2}).toSeconds()))

        eventId2 = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            [teamA2, teamB2, startTime2, endTime2]
        )

        await sportOracle.connect(deployer).addSportEvents(
            [teamA1, teamA2],
            [teamB1, teamB2],
            [startTime1, startTime2],
            [endTime1, endTime2]
        )
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
        const startTime = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5}).toSeconds()))
        const endTime = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5, hours: 2}).toSeconds()))

        const tx = await sportOracle.connect(deployer).addSportEvent(
            teamA,
            teamB,
            startTime,
            endTime
        )

        const receipt = await tx.wait()

        const expectedEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            [teamA, teamB, startTime, endTime]
        )

        const actualEventId = receipt.events[0].args[0]
        expect(actualEventId).to.equal(expectedEventId)
    })
    

    it('Should only allow admin add a new sport event', async() => {
        const teamA  = "Real Madrid"
        const teamB  = "Chelsea"
        const startTime = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5}).toSeconds()))
        const endTime = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5, hours: 2}).toSeconds()))

        expect(sportOracle.connect(user).addSportEvent(
            teamA,
            teamB,
            startTime,
            endTime
        )).to.be.reverted
    })


    it('Should add new sport events', async() => {

        teamA1  = "Real Madrid"
        teamB1 = "PSG"
        startTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 5}).toSeconds()))
        endTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 35}).toSeconds()))

        const expectedEventId1 = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            [teamA1, teamB1, startTime1, endTime1]
        )

        teamA2  = "Chealsea"
        teamB2  = "Dortmund"
        startTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 10}).toSeconds()))
        endTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 40}).toSeconds()))

        const expectedEventId2 = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            [teamA2, teamB2, startTime2, endTime2]
        )
        const tx = await sportOracle.connect(deployer).addSportEvents(
            [teamA1, teamA2],
            [teamB1, teamB2],
            [startTime1, startTime2],
            [endTime1, endTime2]
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
        startTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 5}).toSeconds()))
        endTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 35}).toSeconds()))

        teamA2  = "Chealsea"
        teamB2  = "Dortmund"
        startTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 10}).toSeconds()))
        endTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 40}).toSeconds()))

        expect(sportOracle.connect(user).addSportEvents(
            [teamA1, teamA2],
            [teamB1, teamB2],
            [startTime1, startTime2],
            [endTime1, endTime2]
        )).to.be.reverted
    })



    it('Should update sport events', async() => {

        startTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 5}).toSeconds()))
        endTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 35}).toSeconds()))
        startTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 10}).toSeconds()))
        endTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 40}).toSeconds()))

        const tx = await sportOracle.connect(deployer).updateSportEvents(
            [eventId1, eventId2],
            [startTime1, startTime2],
            [endTime1, endTime2]
        )

        const eventTx  = await sportOracle.getEvents([eventId1, eventId2])

        expect(eventTx[0].startTimestamp).to.be.equal(startTime1)
        expect(eventTx[1].startTimestamp).to.be.equal(startTime2)
    })

    
    it('Should only allow admin update sport events', async() => {

        startTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 5}).toSeconds()))
        endTime1 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 35}).toSeconds()))
        startTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 10}).toSeconds()))
        endTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({minutes: 40}).toSeconds()))

        expect(sportOracle.connect(user).updateSportEvents(
            [eventId1, eventId2],
            [startTime1, startTime2],
            [endTime1, endTime2]
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
        const startTime = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4}).toSeconds()))
        const endTime = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4, hours: 2}).toSeconds()))

        expect(sportOracle.addSportEvent(
            teamA,
            teamB,
            startTime,
            endTime
        )).to.be.reverted
    })


    it("Should returns false when there is NO event with this id", async ()=> {
        const nonExistentEventId = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            ["Barcelona", 
            "Madrid",
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5}).toSeconds())),
            ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 5, hours: 2}).toSeconds())) 
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


    it("Should only declare predefined event outcome that ended", async () => {

        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1) 

        expect(sportOracle.declareOutcome(
            eventId1,
            realTeamAScore,
            realTeamBScore
        )).to.be.reverted

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


})