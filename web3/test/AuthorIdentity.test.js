const { expect } = require("chai");
const hre = require("hardhat");

describe("AuthorIdentity", function () {
  const REAL_NAME = "Kevan Burns";
  const NICKNAME = "Burnzy";
  const PSEUDONYM = "Kidd James";
  const ORGANIZATION = "FTH Trading";
  const DOMAIN = "unykorn.org";
  const AMAZON_URL = "https://www.amazon.com/stores/author/B0DQ5FN1GP";

  let identity;
  let deployer;
  let other;

  beforeEach(async function () {
    [deployer, other] = await hre.ethers.getSigners();
    const AuthorIdentity = await hre.ethers.getContractFactory("AuthorIdentity");
    identity = await AuthorIdentity.deploy(
      REAL_NAME, NICKNAME, PSEUDONYM, ORGANIZATION, DOMAIN, AMAZON_URL
    );
    await identity.waitForDeployment();
  });

  // ════════════════════════════════════════════════════════════════════
  //  DEPLOYMENT
  // ════════════════════════════════════════════════════════════════════

  describe("Deployment", function () {
    it("sets author as deployer", async function () {
      expect(await identity.author()).to.equal(deployer.address);
    });

    it("stores full identity", async function () {
      const id = await identity.getIdentity();
      expect(id.realName).to.equal(REAL_NAME);
      expect(id.nickname).to.equal(NICKNAME);
      expect(id.pseudonym).to.equal(PSEUDONYM);
      expect(id.organization).to.equal(ORGANIZATION);
      expect(id.domain).to.equal(DOMAIN);
      expect(id.amazonAuthorUrl).to.equal(AMAZON_URL);
    });

    it("emits IdentityDeclared on deploy", async function () {
      const AuthorIdentity = await hre.ethers.getContractFactory("AuthorIdentity");
      const tx = await AuthorIdentity.deploy(
        REAL_NAME, NICKNAME, PSEUDONYM, ORGANIZATION, DOMAIN, AMAZON_URL
      );
      await expect(tx.deploymentTransaction())
        .to.emit(tx, "IdentityDeclared")
        .withArgs(deployer.address, REAL_NAME, PSEUDONYM, DOMAIN);
    });

    it("starts with empty bibliography", async function () {
      expect(await identity.getBibliographyCount()).to.equal(0);
    });

    it("starts with no linked contracts", async function () {
      expect(await identity.getLinkedContractCount()).to.equal(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  BIBLIOGRAPHY
  // ════════════════════════════════════════════════════════════════════

  describe("Bibliography", function () {
    it("registers a single work", async function () {
      await expect(
        identity.registerWork(
          "The 2,500 Donkeys",
          "on-chain",
          "0xca9F6604A9b498DB31d113836E2957c0a9aAE037"
        )
      ).to.emit(identity, "WorkRegistered")
        .withArgs(0, "The 2,500 Donkeys", "on-chain");

      expect(await identity.getBibliographyCount()).to.equal(1);

      const work = await identity.getWork(0);
      expect(work.title).to.equal("The 2,500 Donkeys");
      expect(work.platform).to.equal("on-chain");
      expect(work.identifier).to.equal("0xca9F6604A9b498DB31d113836E2957c0a9aAE037");
      expect(work.registeredAt).to.be.gt(0);
    });

    it("batch-registers multiple works", async function () {
      const titles = [
        "The Ultimate Codex of the Great Shift",
        "Money, Madness, and Markets",
        "The Symphony of Resonance"
      ];
      const platforms = ["amazon", "amazon", "amazon"];
      const identifiers = ["B0DQ5FN1GP", "B0DQ5FN1GP", "B0DQ5FN1GP"];

      const tx = await identity.registerWorksBatch(titles, platforms, identifiers);
      const receipt = await tx.wait();

      expect(await identity.getBibliographyCount()).to.equal(3);

      // Verify each work
      for (let i = 0; i < titles.length; i++) {
        const work = await identity.getWork(i);
        expect(work.title).to.equal(titles[i]);
      }
    });

    it("rejects batch with mismatched arrays", async function () {
      await expect(
        identity.registerWorksBatch(
          ["Title1", "Title2"],
          ["amazon"],
          ["ID1", "ID2"]
        )
      ).to.be.revertedWith("Array length mismatch");
    });

    it("reverts on out-of-bounds work index", async function () {
      await expect(identity.getWork(0))
        .to.be.revertedWith("Index out of bounds");
    });

    it("only author can register works", async function () {
      await expect(
        identity.connect(other).registerWork("Fake", "amazon", "FAKE")
      ).to.be.revertedWith("Only the author");
    });

    it("only author can batch-register", async function () {
      await expect(
        identity.connect(other).registerWorksBatch(["Fake"], ["amazon"], ["FAKE"])
      ).to.be.revertedWith("Only the author");
    });

    it("returns full bibliography array", async function () {
      await identity.registerWork("Book A", "amazon", "ID-A");
      await identity.registerWork("Book B", "on-chain", "0x123");

      const biblio = await identity.getFullBibliography();
      expect(biblio.length).to.equal(2);
      expect(biblio[0].title).to.equal("Book A");
      expect(biblio[1].title).to.equal("Book B");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  CONTRACT LINKING
  // ════════════════════════════════════════════════════════════════════

  describe("Contract Linking", function () {
    const GENESIS = "0x97f456300817eaE3B40E235857b856dfFE8bba90";
    const KERNEL_V2 = "0xca9F6604A9b498DB31d113836E2957c0a9aAE037";

    it("links a contract", async function () {
      await expect(
        identity.linkContract(GENESIS, "genesis-anchor")
      ).to.emit(identity, "ContractLinked")
        .withArgs(0, GENESIS, "genesis-anchor");

      expect(await identity.getLinkedContractCount()).to.equal(1);

      const linked = await identity.getLinkedContract(0);
      expect(linked.contractAddress).to.equal(GENESIS);
      expect(linked.role).to.equal("genesis-anchor");
      expect(linked.linkedAt).to.be.gt(0);
    });

    it("links multiple contracts", async function () {
      await identity.linkContract(GENESIS, "genesis-anchor");
      await identity.linkContract(KERNEL_V2, "publishing-kernel-v2");

      expect(await identity.getLinkedContractCount()).to.equal(2);

      const all = await identity.getAllLinkedContracts();
      expect(all.length).to.equal(2);
      expect(all[0].role).to.equal("genesis-anchor");
      expect(all[1].role).to.equal("publishing-kernel-v2");
    });

    it("rejects zero address", async function () {
      await expect(
        identity.linkContract(hre.ethers.ZeroAddress, "invalid")
      ).to.be.revertedWith("Zero address");
    });

    it("only author can link contracts", async function () {
      await expect(
        identity.connect(other).linkContract(GENESIS, "genesis-anchor")
      ).to.be.revertedWith("Only the author");
    });

    it("reverts on out-of-bounds linked contract index", async function () {
      await expect(identity.getLinkedContract(0))
        .to.be.revertedWith("Index out of bounds");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  IDENTITY UPDATES
  // ════════════════════════════════════════════════════════════════════

  describe("Identity Updates", function () {
    it("updates domain", async function () {
      await expect(identity.updateDomain("newdomain.com"))
        .to.emit(identity, "IdentityUpdated")
        .withArgs("domain", "newdomain.com");

      const id = await identity.getIdentity();
      expect(id.domain).to.equal("newdomain.com");
    });

    it("updates Amazon URL", async function () {
      const newUrl = "https://www.amazon.com/stores/author/NEW";
      await expect(identity.updateAmazonUrl(newUrl))
        .to.emit(identity, "IdentityUpdated")
        .withArgs("amazonAuthorUrl", newUrl);

      const id = await identity.getIdentity();
      expect(id.amazonAuthorUrl).to.equal(newUrl);
    });

    it("only author can update domain", async function () {
      await expect(
        identity.connect(other).updateDomain("hacked.com")
      ).to.be.revertedWith("Only the author");
    });

    it("only author can update Amazon URL", async function () {
      await expect(
        identity.connect(other).updateAmazonUrl("https://fake.com")
      ).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  STRUCT ACCESS VIA PUBLIC ARRAY
  // ════════════════════════════════════════════════════════════════════

  describe("Public Array Access", function () {
    it("bibliography() returns work by index", async function () {
      await identity.registerWork("Test", "test", "ID");
      const work = await identity.bibliography(0);
      expect(work.title).to.equal("Test");
    });

    it("linkedContracts() returns link by index", async function () {
      const addr = "0x97f456300817eaE3B40E235857b856dfFE8bba90";
      await identity.linkContract(addr, "test-role");
      const link = await identity.linkedContracts(0);
      expect(link.contractAddress).to.equal(addr);
      expect(link.role).to.equal("test-role");
    });
  });
});
