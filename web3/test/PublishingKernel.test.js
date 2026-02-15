const { expect } = require("chai");
const hre = require("hardhat");

describe("PublishingKernel", function () {
  const TITLE = "The 2,500 Donkeys";
  const CID = "QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK";
  const SHA = "cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364";
  const GENESIS_ANCHOR = "0x97f456300817eaE3B40E235857b856dfFE8bba90";

  // Sample Merkle roots (32 bytes each)
  const ROOTS = {
    manuscriptRoot: "0xdd95d1216b8e2cb8008c8993dffc54d66b550018a47401dd5df001ff487467d3",
    artifactRoot:   "0x9c653a2e453e895f294375818bb872d47d4c90b15859587ba2c5238024202c56",
    imageRoot:      "0x0e45331c0b80738ff3f491e63b47a5454f162cfe5a1d367e90b709c96c56c638",
    promptRoot:     "0x32bed9e54ed6dc5f4ee8082dce928bd86fb76c36b92d9f949ba12c046674f32c",
    editionRoot:    "0x6719ed7f9e142a39a4a7db533895562bdf5379cf7f9816ed7cbe045ca359594e"
  };

  const SIGNATURE = "0x00"; // Placeholder signature for testing

  let kernel;
  let deployer;
  let other;
  let addr3;

  beforeEach(async function () {
    [deployer, other, addr3] = await hre.ethers.getSigners();
    const PublishingKernel = await hre.ethers.getContractFactory("PublishingKernel");
    kernel = await PublishingKernel.deploy(
      TITLE, CID, SHA,
      [ROOTS.manuscriptRoot, ROOTS.artifactRoot, ROOTS.imageRoot, ROOTS.promptRoot, ROOTS.editionRoot],
      GENESIS_ANCHOR,
      SIGNATURE
    );
    await kernel.waitForDeployment();
  });

  describe("Deployment", function () {
    it("stores author as deployer", async function () {
      expect(await kernel.author()).to.equal(deployer.address);
    });

    it("stores correct title", async function () {
      expect(await kernel.title()).to.equal(TITLE);
    });

    it("stores genesis anchor address", async function () {
      expect(await kernel.genesisAnchor()).to.equal(GENESIS_ANCHOR);
    });

    it("creates genesis edition with Merkle roots", async function () {
      const genesis = await kernel.genesis();
      expect(genesis.ipfsCID).to.equal(CID);
      expect(genesis.sha256Hash).to.equal(SHA);
      expect(genesis.roots.editionRoot).to.equal(ROOTS.editionRoot);
      expect(genesis.roots.manuscriptRoot).to.equal(ROOTS.manuscriptRoot);
      expect(genesis.isCanonical).to.equal(true);
      expect(genesis.isRetracted).to.equal(false);
    });

    it("starts with edition count of 1", async function () {
      expect(await kernel.editionCount()).to.equal(1n);
    });

    it("marks genesis edition root as anchored", async function () {
      expect(await kernel.isAnchored(ROOTS.editionRoot)).to.equal(true);
    });

    it("emits EditionAnchored on deploy", async function () {
      const PublishingKernel = await hre.ethers.getContractFactory("PublishingKernel");
      const tx = await PublishingKernel.deploy(
        TITLE, CID, SHA,
        [ROOTS.manuscriptRoot, ROOTS.artifactRoot, ROOTS.imageRoot, ROOTS.promptRoot, ROOTS.editionRoot],
        GENESIS_ANCHOR,
        SIGNATURE
      );
      const receipt = await tx.deploymentTransaction().wait();
      expect(receipt.logs.length).to.be.greaterThan(0);
    });
  });

  describe("anchorEdition", function () {
    const NEW_CID = "QmNewEditionCID123456789";
    const NEW_SHA = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const NEW_ROOTS = {
      manuscriptRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      artifactRoot:   "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      imageRoot:      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      promptRoot:     "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      editionRoot:    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    };

    it("allows author to anchor new edition", async function () {
      await kernel.anchorEdition(NEW_CID, NEW_SHA, "Edition 2",
        [NEW_ROOTS.manuscriptRoot, NEW_ROOTS.artifactRoot, NEW_ROOTS.imageRoot, NEW_ROOTS.promptRoot, NEW_ROOTS.editionRoot],
        SIGNATURE
      );
      expect(await kernel.editionCount()).to.equal(2n);

      const latest = await kernel.latest();
      expect(latest.ipfsCID).to.equal(NEW_CID);
      expect(latest.roots.editionRoot).to.equal(NEW_ROOTS.editionRoot);
    });

    it("rejects non-author", async function () {
      await expect(
        kernel.connect(other).anchorEdition(NEW_CID, NEW_SHA, "Unauthorized",
          [NEW_ROOTS.manuscriptRoot, NEW_ROOTS.artifactRoot, NEW_ROOTS.imageRoot, NEW_ROOTS.promptRoot, NEW_ROOTS.editionRoot],
          SIGNATURE
        )
      ).to.be.revertedWith("PublishingKernel: caller is not the author");
    });

    it("rejects duplicate edition root", async function () {
      await expect(
        kernel.anchorEdition(NEW_CID, NEW_SHA, "Duplicate",
          [ROOTS.manuscriptRoot, ROOTS.artifactRoot, ROOTS.imageRoot, ROOTS.promptRoot, ROOTS.editionRoot],
          SIGNATURE
        )
      ).to.be.revertedWith("PublishingKernel: edition root already anchored");
    });

    it("preserves genesis after new edition", async function () {
      await kernel.anchorEdition(NEW_CID, NEW_SHA, "Edition 2",
        [NEW_ROOTS.manuscriptRoot, NEW_ROOTS.artifactRoot, NEW_ROOTS.imageRoot, NEW_ROOTS.promptRoot, NEW_ROOTS.editionRoot],
        SIGNATURE
      );
      const genesis = await kernel.genesis();
      expect(genesis.ipfsCID).to.equal(CID);
    });
  });

  describe("anchorEditionWithProvenance", function () {
    const NEW_CID = "QmProvenanceEdition";
    const NEW_SHA = "1111111111111111111111111111111111111111111111111111111111111111";
    const NEW_ROOTS = {
      manuscriptRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
      artifactRoot:   "0x2222222222222222222222222222222222222222222222222222222222222222",
      imageRoot:      "0x3333333333333333333333333333333333333333333333333333333333333333",
      promptRoot:     "0x4444444444444444444444444444444444444444444444444444444444444444",
      editionRoot:    "0x5555555555555555555555555555555555555555555555555555555555555555"
    };
    const AI_MODEL = "stable-diffusion-xl-base-1.0";
    const PROMPT_HASH = "0x6666666666666666666666666666666666666666666666666666666666666666";

    it("stores AI provenance metadata", async function () {
      await kernel.anchorEditionWithProvenance(
        NEW_CID, NEW_SHA, "AI Edition",
        [NEW_ROOTS.manuscriptRoot, NEW_ROOTS.artifactRoot, NEW_ROOTS.imageRoot, NEW_ROOTS.promptRoot, NEW_ROOTS.editionRoot],
        SIGNATURE,
        AI_MODEL,
        PROMPT_HASH
      );

      const edition = await kernel.getEdition(1);
      expect(edition.aiModel).to.equal(AI_MODEL);
      expect(edition.promptSetHash).to.equal(PROMPT_HASH);
    });
  });

  describe("Lineage", function () {
    const NEW_ROOTS = {
      manuscriptRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      artifactRoot:   "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      imageRoot:      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      promptRoot:     "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      editionRoot:    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    };

    beforeEach(async function () {
      await kernel.anchorEdition("QmEdition2", "sha2", "v2",
        [NEW_ROOTS.manuscriptRoot, NEW_ROOTS.artifactRoot, NEW_ROOTS.imageRoot, NEW_ROOTS.promptRoot, NEW_ROOTS.editionRoot],
        SIGNATURE
      );
    });

    it("supersede marks old as non-canonical", async function () {
      await kernel.supersede(0, 1);
      const old = await kernel.getEdition(0);
      expect(old.isCanonical).to.equal(false);
    });

    it("supersede sets supersedesEdition on new", async function () {
      await kernel.supersede(0, 1);
      const newEd = await kernel.getEdition(1);
      expect(newEd.supersedesEdition).to.equal(1n); // 0 + 1 = 1
    });

    it("retract marks edition as retracted", async function () {
      await kernel.retract(0, "Factual error discovered");
      const ed = await kernel.getEdition(0);
      expect(ed.isRetracted).to.equal(true);
      expect(ed.isCanonical).to.equal(false);
      expect(ed.retractionReason).to.equal("Factual error discovered");
    });

    it("retract rejects already retracted", async function () {
      await kernel.retract(0, "First retraction");
      await expect(
        kernel.retract(0, "Second retraction")
      ).to.be.revertedWith("PublishingKernel: already retracted");
    });

    it("setCanonical toggles canonicality", async function () {
      await kernel.setCanonical(1, false);
      const ed = await kernel.getEdition(1);
      expect(ed.isCanonical).to.equal(false);
    });

    it("setCanonical rejects retracted", async function () {
      await kernel.retract(0, "Gone");
      await expect(
        kernel.setCanonical(0, true)
      ).to.be.revertedWith("PublishingKernel: cannot canonicalize retracted edition");
    });

    it("canonicalEdition returns latest non-retracted canonical", async function () {
      const [id, edition] = await kernel.canonicalEdition();
      expect(id).to.equal(1n);
      expect(edition.ipfsCID).to.equal("QmEdition2");
    });
  });

  describe("License Registry", function () {
    it("grants a license", async function () {
      const tx = await kernel.grantLicense(
        0,                              // editionId
        other.address,                  // grantee
        "CC-BY-NC-4.0",                 // templateId
        "GLOBAL",                       // territory
        Math.floor(Date.now() / 1000),  // termStart
        0,                              // termEnd (perpetual)
        "all",                          // fieldsOfUse
        hre.ethers.ZeroAddress          // royaltyRouter
      );
      await tx.wait();

      expect(await kernel.licenseCount()).to.equal(1n);
      const license = await kernel.getLicense(0);
      expect(license.grantee).to.equal(other.address);
      expect(license.templateId).to.equal("CC-BY-NC-4.0");
      expect(license.territory).to.equal("GLOBAL");
      expect(license.revoked).to.equal(false);
    });

    it("rejects non-author license grant", async function () {
      await expect(
        kernel.connect(other).grantLicense(0, addr3.address, "CC-BY-4.0", "US", 0, 0, "print", hre.ethers.ZeroAddress)
      ).to.be.revertedWith("PublishingKernel: caller is not the author");
    });

    it("revokes a license", async function () {
      await kernel.grantLicense(0, other.address, "exclusive-print", "GB", 0, 0, "print", hre.ethers.ZeroAddress);
      await kernel.revokeLicense(0);
      const license = await kernel.getLicense(0);
      expect(license.revoked).to.equal(true);
    });

    it("rejects license on retracted edition", async function () {
      await kernel.retract(0, "Withdrawn");
      await expect(
        kernel.grantLicense(0, other.address, "CC-BY-4.0", "GLOBAL", 0, 0, "all", hre.ethers.ZeroAddress)
      ).to.be.revertedWith("PublishingKernel: cannot license retracted edition");
    });

    it("editionLicenses returns linked license IDs", async function () {
      await kernel.grantLicense(0, other.address, "CC-BY-4.0", "US", 0, 0, "print", hre.ethers.ZeroAddress);
      await kernel.grantLicense(0, addr3.address, "exclusive-digital", "GLOBAL", 0, 0, "digital", hre.ethers.ZeroAddress);
      const ids = await kernel.getEditionLicenses(0);
      expect(ids.length).to.equal(2);
    });
  });

  describe("Views", function () {
    it("getEditionRoots returns Merkle roots", async function () {
      const roots = await kernel.getEditionRoots(0);
      expect(roots.manuscriptRoot).to.equal(ROOTS.manuscriptRoot);
      expect(roots.editionRoot).to.equal(ROOTS.editionRoot);
    });

    it("isAnchored returns false for unknown root", async function () {
      expect(await kernel.isAnchored("0x0000000000000000000000000000000000000000000000000000000000000001")).to.equal(false);
    });

    it("getEdition reverts for invalid id", async function () {
      await expect(kernel.getEdition(99)).to.be.revertedWith("PublishingKernel: edition does not exist");
    });
  });
});
