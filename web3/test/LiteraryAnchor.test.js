const { expect } = require("chai");
const hre = require("hardhat");

describe("LiteraryAnchor", function () {
  const TITLE = "The 2,500 Donkeys";
  const CID = "QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK";
  const SHA = "cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364";

  let anchor;
  let deployer;
  let other;

  beforeEach(async function () {
    [deployer, other] = await hre.ethers.getSigners();
    const LiteraryAnchor = await hre.ethers.getContractFactory("LiteraryAnchor");
    anchor = await LiteraryAnchor.deploy(TITLE, CID, SHA);
    await anchor.waitForDeployment();
  });

  describe("Deployment", function () {
    it("stores author as deployer", async function () {
      expect(await anchor.author()).to.equal(deployer.address);
    });

    it("stores correct title", async function () {
      expect(await anchor.title()).to.equal(TITLE);
    });

    it("creates genesis edition", async function () {
      const genesis = await anchor.genesis();
      expect(genesis.ipfsCID).to.equal(CID);
      expect(genesis.sha256Hash).to.equal(SHA);
      expect(genesis.title).to.equal(TITLE);
      expect(genesis.note).to.equal("Genesis Edition");
    });

    it("starts with edition count of 1", async function () {
      expect(await anchor.editionCount()).to.equal(1n);
    });

    it("emits EditionAnchored on deploy", async function () {
      const LiteraryAnchor = await hre.ethers.getContractFactory("LiteraryAnchor");
      const tx = await LiteraryAnchor.deploy(TITLE, CID, SHA);
      const receipt = await tx.deploymentTransaction().wait();

      const event = receipt.logs[0];
      expect(event).to.not.be.undefined;
    });
  });

  describe("anchorEdition", function () {
    const NEW_CID = "QmNewEditionCID123456789";
    const NEW_SHA = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

    it("allows author to anchor new edition", async function () {
      await anchor.anchorEdition(NEW_CID, NEW_SHA, "Second Edition");
      expect(await anchor.editionCount()).to.equal(2n);

      const latest = await anchor.latest();
      expect(latest.ipfsCID).to.equal(NEW_CID);
      expect(latest.sha256Hash).to.equal(NEW_SHA);
      expect(latest.note).to.equal("Second Edition");
    });

    it("rejects non-author", async function () {
      await expect(
        anchor.connect(other).anchorEdition(NEW_CID, NEW_SHA, "Unauthorized")
      ).to.be.revertedWith("Only the author can anchor editions");
    });

    it("preserves genesis after new edition", async function () {
      await anchor.anchorEdition(NEW_CID, NEW_SHA, "Second Edition");
      const genesis = await anchor.genesis();
      expect(genesis.ipfsCID).to.equal(CID);
      expect(genesis.sha256Hash).to.equal(SHA);
    });
  });

  describe("View functions", function () {
    it("genesis() returns first edition", async function () {
      const genesis = await anchor.genesis();
      expect(genesis.ipfsCID).to.equal(CID);
    });

    it("latest() returns last edition", async function () {
      await anchor.anchorEdition("QmSecond", "sha2", "v2");
      await anchor.anchorEdition("QmThird", "sha3", "v3");

      const latest = await anchor.latest();
      expect(latest.ipfsCID).to.equal("QmThird");
      expect(latest.note).to.equal("v3");
    });

    it("editions(i) returns specific edition", async function () {
      const e = await anchor.editions(0);
      expect(e.ipfsCID).to.equal(CID);
    });
  });
});
