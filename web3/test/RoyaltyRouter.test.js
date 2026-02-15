const { expect } = require("chai");
const hre = require("hardhat");

describe("RoyaltyRouter", function () {
  let router;
  let owner;
  let author;
  let illustrator;
  let editor;
  let treasury;
  let publisher;

  const EDITION_REF = "edition-2";

  beforeEach(async function () {
    [owner, author, illustrator, editor, treasury, publisher] = await hre.ethers.getSigners();

    const RoyaltyRouter = await hre.ethers.getContractFactory("RoyaltyRouter");
    router = await RoyaltyRouter.deploy(
      EDITION_REF,
      [author.address, illustrator.address, editor.address, treasury.address],
      ["author", "illustrator", "editor", "treasury"],
      [7000, 1500, 1000, 500] // 70%, 15%, 10%, 5%
    );
    await router.waitForDeployment();
  });

  describe("Deployment", function () {
    it("stores owner as deployer", async function () {
      expect(await router.owner()).to.equal(owner.address);
    });

    it("stores edition reference", async function () {
      expect(await router.editionRef()).to.equal(EDITION_REF);
    });

    it("stores correct payee count", async function () {
      expect(await router.payeeCount()).to.equal(4n);
    });

    it("stores correct payee details", async function () {
      const p = await router.getPayee(0);
      expect(p.wallet).to.equal(author.address);
      expect(p.role).to.equal("author");
      expect(p.basisPoints).to.equal(7000n);
      expect(p.active).to.equal(true);
    });

    it("rejects mismatched array lengths", async function () {
      const RoyaltyRouter = await hre.ethers.getContractFactory("RoyaltyRouter");
      await expect(
        RoyaltyRouter.deploy(EDITION_REF, [author.address], ["author", "extra"], [10000])
      ).to.be.revertedWith("RoyaltyRouter: array length mismatch");
    });

    it("rejects basis points not summing to 10000", async function () {
      const RoyaltyRouter = await hre.ethers.getContractFactory("RoyaltyRouter");
      await expect(
        RoyaltyRouter.deploy(EDITION_REF, [author.address, illustrator.address], ["author", "illustrator"], [5000, 4000])
      ).to.be.revertedWith("RoyaltyRouter: basis points must sum to 10000");
    });
  });

  describe("Revenue Distribution", function () {
    it("distributes funds via receive", async function () {
      const amount = hre.ethers.parseEther("1.0");
      await owner.sendTransaction({ to: await router.getAddress(), value: amount });

      // Author: 70% = 0.7 ETH
      expect(await router.balances(author.address)).to.equal(hre.ethers.parseEther("0.7"));
      // Illustrator: 15% = 0.15 ETH
      expect(await router.balances(illustrator.address)).to.equal(hre.ethers.parseEther("0.15"));
      // Editor: 10% = 0.1 ETH
      expect(await router.balances(editor.address)).to.equal(hre.ethers.parseEther("0.1"));
      // Treasury: 5% = 0.05 ETH
      expect(await router.balances(treasury.address)).to.equal(hre.ethers.parseEther("0.05"));
    });

    it("distributes funds via deposit()", async function () {
      const amount = hre.ethers.parseEther("2.0");
      await router.deposit({ value: amount });

      expect(await router.balances(author.address)).to.equal(hre.ethers.parseEther("1.4"));
      expect(await router.totalReceived()).to.equal(amount);
    });

    it("accumulates across multiple deposits", async function () {
      await owner.sendTransaction({ to: await router.getAddress(), value: hre.ethers.parseEther("1.0") });
      await owner.sendTransaction({ to: await router.getAddress(), value: hre.ethers.parseEther("1.0") });

      expect(await router.balances(author.address)).to.equal(hre.ethers.parseEther("1.4"));
      expect(await router.totalReceived()).to.equal(hre.ethers.parseEther("2.0"));
    });

    it("rejects zero-value deposits", async function () {
      await expect(
        router.deposit({ value: 0 })
      ).to.be.revertedWith("RoyaltyRouter: zero value");
    });
  });

  describe("Withdrawal", function () {
    beforeEach(async function () {
      await owner.sendTransaction({ to: await router.getAddress(), value: hre.ethers.parseEther("1.0") });
    });

    it("allows payee to withdraw", async function () {
      const balBefore = await hre.ethers.provider.getBalance(author.address);
      const tx = await router.connect(author).withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await hre.ethers.provider.getBalance(author.address);

      expect(balAfter - balBefore + gasCost).to.equal(hre.ethers.parseEther("0.7"));
      expect(await router.balances(author.address)).to.equal(0n);
    });

    it("rejects withdraw with zero balance", async function () {
      await expect(
        router.connect(publisher).withdraw()
      ).to.be.revertedWith("RoyaltyRouter: no balance");
    });

    it("tracks totalWithdrawn", async function () {
      await router.connect(author).withdraw();
      expect(await router.totalWithdrawn()).to.equal(hre.ethers.parseEther("0.7"));
    });
  });

  describe("Recoupment Waterfall", function () {
    it("directs recoupment share to publisher", async function () {
      // Publisher advanced 5 ETH, recouping at 70%
      await router.setRecoupment(publisher.address, hre.ethers.parseEther("5.0"), 7000);

      // Send 1 ETH
      await owner.sendTransaction({ to: await router.getAddress(), value: hre.ethers.parseEther("1.0") });

      // Recoupment: 70% of 1 ETH = 0.7 ETH to publisher
      expect(await router.balances(publisher.address)).to.equal(hre.ethers.parseEther("0.7"));

      // Remaining 0.3 ETH split among payees (70/15/10/5)
      // Author: 70% of 0.3 = 0.21
      expect(await router.balances(author.address)).to.equal(hre.ethers.parseEther("0.21"));
    });

    it("completes recoupment when fully paid", async function () {
      // Publisher advanced 0.5 ETH, recouping at 50%
      await router.setRecoupment(publisher.address, hre.ethers.parseEther("0.5"), 5000);

      // Send 2 ETH — recoupment share would be 1 ETH but only 0.5 owed
      await owner.sendTransaction({ to: await router.getAddress(), value: hre.ethers.parseEther("2.0") });

      // Publisher gets exactly 0.5 ETH (capped at totalOwed)
      expect(await router.balances(publisher.address)).to.equal(hre.ethers.parseEther("0.5"));

      // Check recoupment is completed
      const recoup = await router.getRecoupment();
      expect(recoup.completed).to.equal(true);
    });

    it("rejects setting recoupment while one is active", async function () {
      await router.setRecoupment(publisher.address, hre.ethers.parseEther("1.0"), 5000);
      await expect(
        router.setRecoupment(publisher.address, hre.ethers.parseEther("2.0"), 5000)
      ).to.be.revertedWith("RoyaltyRouter: active recoupment exists");
    });

    it("only owner can set recoupment", async function () {
      await expect(
        router.connect(author).setRecoupment(publisher.address, hre.ethers.parseEther("1.0"), 5000)
      ).to.be.revertedWith("RoyaltyRouter: caller is not the owner");
    });
  });

  describe("Payee Management", function () {
    it("deactivates a payee", async function () {
      await router.deactivatePayee(2); // editor
      const p = await router.getPayee(2);
      expect(p.active).to.equal(false);
    });

    it("rejects deactivating already inactive", async function () {
      await router.deactivatePayee(2);
      await expect(router.deactivatePayee(2)).to.be.revertedWith("RoyaltyRouter: already inactive");
    });
  });

  describe("Emergency", function () {
    it("sweeps all funds to owner", async function () {
      await owner.sendTransaction({ to: await router.getAddress(), value: hre.ethers.parseEther("1.0") });

      const balBefore = await hre.ethers.provider.getBalance(owner.address);
      const tx = await router.emergencySweep();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await hre.ethers.provider.getBalance(owner.address);

      expect(balAfter - balBefore + gasCost).to.equal(hre.ethers.parseEther("1.0"));
    });

    it("rejects non-owner sweep", async function () {
      await expect(
        router.connect(author).emergencySweep()
      ).to.be.revertedWith("RoyaltyRouter: caller is not the owner");
    });
  });

  describe("Views", function () {
    it("contractBalance reflects holdings", async function () {
      await owner.sendTransaction({ to: await router.getAddress(), value: hre.ethers.parseEther("1.0") });
      expect(await router.contractBalance()).to.equal(hre.ethers.parseEther("1.0"));
    });
  });
});
