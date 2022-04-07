const { ethers, upgrades } = require('hardhat')
const { expect }       = require('chai')
const { DateTime }     = require('luxon')
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

        await sportOracle.connect(deployer).addSportEvent(
            teamA1,
            teamB1,
            startTime1,
            endTime1
        )

        eventId1 = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            [teamA1, teamB1, startTime1, endTime1]
        )

        teamA2  = "Juventus"
        teamB2  = "Liverpool"
        startTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4}).toSeconds()))
        endTime2 = ethers.BigNumber.from(parseInt(DateTime.now().plus({days: 4, hours: 2}).toSeconds()))

        await sportOracle.connect(deployer).addSportEvent(
            teamA2,
            teamB2,
            startTime2,
            endTime2
        )

        eventId2 = ethers.utils.solidityKeccak256(
            ["string", "string", "uint256", "uint256"],
            [teamA2, teamB2, startTime2, endTime2]
        )
    })

    it('Should initialize contract variable', async() => {
        expect(await sportOracle.adminAddress()).to.equal(adminAddress)
    })

    it('Should update admin address', async() => {
        await sportOracle.setAdminAddress(deployer.getAddress())
        expect(await sportOracle.adminAddress()).to.equal(await deployer.getAddress())
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

        const receipt = await tx.wait();

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

    it("Should returns false when there is NO event with this id", async function() {
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

    it("Should returns true when there is an event with this id", async function() {
        expect(await sportOracle.eventExists(eventId1)).to.be.true
    })



    it("Should returns indexed sport events", async function() {
        const tx  = await sportOracle.getIndexedEvents([1,0])
        expect(tx[0].id).to.equal(eventId2)
        expect(tx[0].teamA).to.equal(teamA2)
        expect(tx[0].teamB).to.equal(teamB2)
        expect(tx[0].startTimestamp).to.equal(ethers.BigNumber.from(startTime2))
        expect(tx[0].endTimestamp).to.equal(ethers.BigNumber.from(endTime2))
        expect(tx[0].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[0].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[0].realTeamBScore).to.equal(ethers.BigNumber.from(-1))

        expect(tx[1].id).to.equal(eventId1)
        expect(tx[1].teamA).to.equal(teamA1)
        expect(tx[1].teamB).to.equal(teamB1)
        expect(tx[1].startTimestamp).to.equal(ethers.BigNumber.from(startTime1))
        expect(tx[1].endTimestamp).to.equal(ethers.BigNumber.from(endTime1))
        expect(tx[1].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[1].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[1].realTeamBScore).to.equal(ethers.BigNumber.from(-1))
    })


    it("Should returns specified sport events using id", async function() {
        const tx  = await sportOracle.getEvents([eventId2, eventId1])
        expect(tx[0].id).to.equal(eventId2)
        expect(tx[0].teamA).to.equal(teamA2)
        expect(tx[0].teamB).to.equal(teamB2)
        expect(tx[0].startTimestamp).to.equal(ethers.BigNumber.from(startTime2))
        expect(tx[0].endTimestamp).to.equal(ethers.BigNumber.from(endTime2))
        expect(tx[0].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[0].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[0].realTeamBScore).to.equal(ethers.BigNumber.from(-1))

        expect(tx[1].id).to.equal(eventId1)
        expect(tx[1].teamA).to.equal(teamA1)
        expect(tx[1].teamB).to.equal(teamB1)
        expect(tx[1].startTimestamp).to.equal(ethers.BigNumber.from(startTime1))
        expect(tx[1].endTimestamp).to.equal(ethers.BigNumber.from(endTime1))
        expect(tx[1].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[1].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[1].realTeamBScore).to.equal(ethers.BigNumber.from(-1))
    })


    it("Should returns all the sport events", async function() {
        const tx  = await sportOracle.getAllEvents(0,2)
        expect(tx[0].id).to.equal(eventId1)
        expect(tx[0].teamA).to.equal(teamA1)
        expect(tx[0].teamB).to.equal(teamB1)
        expect(tx[0].startTimestamp).to.equal(ethers.BigNumber.from(startTime1))
        expect(tx[0].endTimestamp).to.equal(ethers.BigNumber.from(endTime1))
        expect(tx[0].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[0].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[0].realTeamBScore).to.equal(ethers.BigNumber.from(-1))

        expect(tx[1].id).to.equal(eventId2)
        expect(tx[1].teamA).to.equal(teamA2)
        expect(tx[1].teamB).to.equal(teamB2)
        expect(tx[1].startTimestamp).to.equal(ethers.BigNumber.from(startTime2))
        expect(tx[1].endTimestamp).to.equal(ethers.BigNumber.from(endTime2))
        expect(tx[1].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[1].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[1].realTeamBScore).to.equal(ethers.BigNumber.from(-1))
    })


    it("Should declare predefined event outcome", async function() {

        const outcome = ethers.BigNumber.from(2)
        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1)
        const tx  = await sportOracle.declareOutcome(
            eventId1,
            outcome,
            realTeamAScore,
            realTeamBScore
        )

        const eventTx  = await sportOracle.getEvents([eventId1])

        expect(eventTx[0].outcome).to.equal(outcome)
        expect(eventTx[0].realTeamAScore).to.equal(realTeamAScore)
        expect(eventTx[0].realTeamBScore).to.equal(realTeamBScore)

    })


    it("Should returns only the pending sport events", async function() {

        const outcome = ethers.BigNumber.from(2)
        const realTeamAScore  = ethers.BigNumber.from(3)
        const realTeamBScore  = ethers.BigNumber.from(1)
        await sportOracle.declareOutcome(
            eventId1,
            outcome,
            realTeamAScore,
            realTeamBScore
        )

        const tx  = await sportOracle.getPendingEvents()
        expect(tx[0].id).to.equal(eventId2)
        expect(tx[0].teamA).to.equal(teamA2)
        expect(tx[0].teamB).to.equal(teamB2)
        expect(tx[0].startTimestamp).to.equal(ethers.BigNumber.from(startTime2))
        expect(tx[0].endTimestamp).to.equal(ethers.BigNumber.from(endTime2))
        expect(tx[0].outcome).to.equal(ethers.BigNumber.from(0))
        expect(tx[0].realTeamAScore).to.equal(ethers.BigNumber.from(-1))
        expect(tx[0].realTeamBScore).to.equal(ethers.BigNumber.from(-1))

        expect(tx[1]).to.be.undefined
    })


})