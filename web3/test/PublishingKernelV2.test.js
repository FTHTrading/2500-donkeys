const { expect } = require("chai");
const hre = require("hardhat");

describe("PublishingKernelV2", function () {
  const TITLE = "The 2,500 Donkeys";
  const CID = "QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK";
  const SHA = "cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364";
  const GENESIS_ANCHOR = "0x97f456300817eaE3B40E235857b856dfFE8bba90";
  const V1_KERNEL = "0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae";

  // Merkle roots
  const ROOTS = {
    manuscriptRoot: "0xdd95d1216b8e2cb8008c8993dffc54d66b550018a47401dd5df001ff487467d3",
    artifactRoot:   "0x9c653a2e453e895f294375818bb872d47d4c90b15859587ba2c5238024202c56",
    imageRoot:      "0x0e45331c0b80738ff3f491e63b47a5454f162cfe5a1d367e90b709c96c56c638",
    promptRoot:     "0x32bed9e54ed6dc5f4ee8082dce928bd86fb76c36b92d9f949ba12c046674f32c",
    editionRoot:    "0x6719ed7f9e142a39a4a7db533895562bdf5379cf7f9816ed7cbe045ca359594e"
  };

  const rootsTuple = [
    ROOTS.manuscriptRoot,
    ROOTS.artifactRoot,
    ROOTS.imageRoot,
    ROOTS.promptRoot,
    ROOTS.editionRoot
  ];

  // Alternate roots for second editions
  const ROOTS2 = {
    manuscriptRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    artifactRoot:   "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    imageRoot:      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    promptRoot:     "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    editionRoot:    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  };

  const roots2Tuple = [
    ROOTS2.manuscriptRoot,
    ROOTS2.artifactRoot,
    ROOTS2.imageRoot,
    ROOTS2.promptRoot,
    ROOTS2.editionRoot
  ];

  // Third set of roots
  const ROOTS3 = {
    manuscriptRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
    artifactRoot:   "0x2222222222222222222222222222222222222222222222222222222222222222",
    imageRoot:      "0x3333333333333333333333333333333333333333333333333333333333333333",
    promptRoot:     "0x4444444444444444444444444444444444444444444444444444444444444444",
    editionRoot:    "0x5555555555555555555555555555555555555555555555555555555555555555"
  };

  const roots3Tuple = [
    ROOTS3.manuscriptRoot,
    ROOTS3.artifactRoot,
    ROOTS3.imageRoot,
    ROOTS3.promptRoot,
    ROOTS3.editionRoot
  ];

  let kernel;
  let deployer;
  let other;
  let addr3;
  let adminWallet;

  /**
   * Sign an editionRoot with a wallet (EIP-191 personal_sign).
   * Returns the signature bytes.
   */
  async function signEditionRoot(signer, editionRoot) {
    // signMessage auto-applies EIP-191 prefix
    return await signer.signMessage(hre.ethers.getBytes(editionRoot));
  }

  /**
   * Deploy a fresh v2 kernel with proper ECDSA signature.
   */
  async function deployKernel(signerOverride) {
    const signer = signerOverride || deployer;
    const signature = await signEditionRoot(signer, ROOTS.editionRoot);

    const PublishingKernelV2 = await hre.ethers.getContractFactory("PublishingKernelV2", signer);
    const k = await PublishingKernelV2.deploy(
      TITLE, CID, SHA,
      rootsTuple,
      GENESIS_ANCHOR,
      V1_KERNEL,
      signature
    );
    await k.waitForDeployment();
    return k;
  }

  beforeEach(async function () {
    [deployer, other, addr3, adminWallet] = await hre.ethers.getSigners();
    kernel = await deployKernel();
  });

  // ════════════════════════════════════════════════════════════════════
  //  DEPLOYMENT
  // ════════════════════════════════════════════════════════════════════

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

    it("stores predecessor kernel address", async function () {
      expect(await kernel.predecessorKernel()).to.equal(V1_KERNEL);
    });

    it("reports VERSION = 2", async function () {
      expect(await kernel.VERSION()).to.equal(2n);
    });

    it("creates genesis edition with Merkle roots", async function () {
      const genesis = await kernel.genesis();
      expect(genesis.ipfsCID).to.equal(CID);
      expect(genesis.sha256Hash).to.equal(SHA);
      expect(genesis.roots.editionRoot).to.equal(ROOTS.editionRoot);
      expect(genesis.roots.manuscriptRoot).to.equal(ROOTS.manuscriptRoot);
      expect(genesis.isCanonical).to.equal(true);
      expect(genesis.isRetracted).to.equal(false);
      expect(genesis.isFrozen).to.equal(false);
    });

    it("starts with edition count of 1", async function () {
      expect(await kernel.editionCount()).to.equal(1n);
    });

    it("marks genesis edition root as anchored", async function () {
      expect(await kernel.isAnchored(ROOTS.editionRoot)).to.equal(true);
    });

    it("sets canonical edition to 0", async function () {
      expect(await kernel.canonicalEditionId()).to.equal(0n);
      expect(await kernel.hasCanonical()).to.equal(true);
    });

    it("sets admin to author by default", async function () {
      expect(await kernel.admin()).to.equal(deployer.address);
    });

    it("emits EditionAnchored + SignatureVerified + CanonicalSnapshot on deploy", async function () {
      const sig = await signEditionRoot(deployer, ROOTS.editionRoot);
      const PKV2 = await hre.ethers.getContractFactory("PublishingKernelV2");
      const tx = await PKV2.deploy(TITLE, CID, SHA, rootsTuple, GENESIS_ANCHOR, V1_KERNEL, sig);
      const receipt = await tx.deploymentTransaction().wait();
      // Should have at least 3 events: EditionAnchored, SignatureVerified, CanonicalSnapshot
      expect(receipt.logs.length).to.be.greaterThanOrEqual(3);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  ECDSA SIGNATURE ENFORCEMENT
  // ════════════════════════════════════════════════════════════════════

  describe("ECDSA Enforcement", function () {
    it("rejects deployment with wrong signer", async function () {
      // Sign with 'other' but deploy from 'deployer' => mismatch
      const badSig = await signEditionRoot(other, ROOTS.editionRoot);
      const PKV2 = await hre.ethers.getContractFactory("PublishingKernelV2");
      await expect(
        PKV2.deploy(TITLE, CID, SHA, rootsTuple, GENESIS_ANCHOR, V1_KERNEL, badSig)
      ).to.be.revertedWith("PKv2: invalid author signature");
    });

    it("rejects deployment with garbage signature", async function () {
      const PKV2 = await hre.ethers.getContractFactory("PublishingKernelV2");
      await expect(
        PKV2.deploy(TITLE, CID, SHA, rootsTuple, GENESIS_ANCHOR, V1_KERNEL, "0x00")
      ).to.be.reverted;
    });

    it("rejects anchorEdition with wrong signature", async function () {
      const badSig = await signEditionRoot(other, ROOTS2.editionRoot);
      await expect(
        kernel.anchorEdition("QmNew", "newsha", "Bad sig",
          roots2Tuple, badSig)
      ).to.be.revertedWith("PKv2: invalid author signature");
    });

    it("accepts anchorEdition with valid signature", async function () {
      const sig = await signEditionRoot(deployer, ROOTS2.editionRoot);
      await kernel.anchorEdition("QmNew", "newsha", "Good sig", roots2Tuple, sig);
      expect(await kernel.editionCount()).to.equal(2n);
    });

    it("rejects anchorEditionWithProvenance with wrong signature", async function () {
      const badSig = await signEditionRoot(other, ROOTS2.editionRoot);
      await expect(
        kernel.anchorEditionWithProvenance(
          "QmNew", "newsha", "Bad sig",
          roots2Tuple, badSig,
          "sdxl", "0x6666666666666666666666666666666666666666666666666666666666666666"
        )
      ).to.be.revertedWith("PKv2: invalid author signature");
    });

    it("verifySignature returns true for valid author signature", async function () {
      const sig = await signEditionRoot(deployer, ROOTS.editionRoot);
      const [valid, signer] = await kernel.verifySignature(ROOTS.editionRoot, sig);
      expect(valid).to.equal(true);
      expect(signer).to.equal(deployer.address);
    });

    it("verifySignature returns false for non-author signature", async function () {
      const sig = await signEditionRoot(other, ROOTS.editionRoot);
      const [valid, signer] = await kernel.verifySignature(ROOTS.editionRoot, sig);
      expect(valid).to.equal(false);
      expect(signer).to.equal(other.address);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  EDITION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════

  describe("anchorEdition", function () {
    it("allows author to anchor new edition with valid sig", async function () {
      const sig = await signEditionRoot(deployer, ROOTS2.editionRoot);
      await kernel.anchorEdition("QmEdition2", "sha2", "Edition 2", roots2Tuple, sig);
      expect(await kernel.editionCount()).to.equal(2n);

      const latest = await kernel.latest();
      expect(latest.ipfsCID).to.equal("QmEdition2");
      expect(latest.roots.editionRoot).to.equal(ROOTS2.editionRoot);
    });

    it("rejects non-author", async function () {
      const sig = await signEditionRoot(other, ROOTS2.editionRoot);
      await expect(
        kernel.connect(other).anchorEdition("QmNew", "sha", "Unauthorized",
          roots2Tuple, sig)
      ).to.be.revertedWith("PKv2: caller is not the author");
    });

    it("rejects duplicate edition root", async function () {
      const sig = await signEditionRoot(deployer, ROOTS.editionRoot);
      await expect(
        kernel.anchorEdition("QmDup", "sha", "Duplicate", rootsTuple, sig)
      ).to.be.revertedWith("PKv2: edition root already anchored");
    });

    it("updates canonical to latest edition", async function () {
      const sig = await signEditionRoot(deployer, ROOTS2.editionRoot);
      await kernel.anchorEdition("QmEdition2", "sha2", "Edition 2", roots2Tuple, sig);
      expect(await kernel.canonicalEditionId()).to.equal(1n);
    });
  });

  describe("anchorEditionWithProvenance", function () {
    it("stores AI provenance metadata with valid sig", async function () {
      const sig = await signEditionRoot(deployer, ROOTS2.editionRoot);
      await kernel.anchorEditionWithProvenance(
        "QmProvenance", "sha", "AI Edition",
        roots2Tuple, sig,
        "stable-diffusion-xl", "0x6666666666666666666666666666666666666666666666666666666666666666"
      );

      const edition = await kernel.getEdition(1);
      expect(edition.aiModel).to.equal("stable-diffusion-xl");
      expect(edition.promptSetHash).to.equal("0x6666666666666666666666666666666666666666666666666666666666666666");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  LINEAGE
  // ════════════════════════════════════════════════════════════════════

  describe("Lineage", function () {
    beforeEach(async function () {
      const sig = await signEditionRoot(deployer, ROOTS2.editionRoot);
      await kernel.anchorEdition("QmEdition2", "sha2", "v2", roots2Tuple, sig);
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

    it("supersede recalculates canonical cache", async function () {
      await kernel.supersede(0, 1);
      // Edition 1 is newest canonical
      expect(await kernel.canonicalEditionId()).to.equal(1n);
    });

    it("setCanonical toggles canonicality", async function () {
      await kernel.setCanonical(1, false);
      const ed = await kernel.getEdition(1);
      expect(ed.isCanonical).to.equal(false);
      // Should recalculate to edition 0
      expect(await kernel.canonicalEditionId()).to.equal(0n);
    });

    it("setCanonical(true) updates cache", async function () {
      await kernel.setCanonical(0, false); // demote 0
      expect(await kernel.canonicalEditionId()).to.equal(1n); // 1 is still canonical

      await kernel.setCanonical(0, true); // promote 0 back
      // Cache now points to 0 (last call to setCanonical(true))
      expect(await kernel.canonicalEditionId()).to.equal(0n);
    });

    it("canonicalEdition() uses O(1) cache", async function () {
      const [id, edition] = await kernel.canonicalEdition();
      expect(id).to.equal(1n); // Latest anchored edition
      expect(edition.ipfsCID).to.equal("QmEdition2");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  EDITION FREEZE
  // ════════════════════════════════════════════════════════════════════

  describe("Edition Freeze", function () {
    it("freezes an edition", async function () {
      await kernel.freezeEdition(0);
      const ed = await kernel.getEdition(0);
      expect(ed.isFrozen).to.equal(true);
    });

    it("emits EditionFrozen event", async function () {
      await expect(kernel.freezeEdition(0))
        .to.emit(kernel, "EditionFrozen")
        .withArgs(0n, (ts) => ts > 0);
    });

    it("rejects double freeze", async function () {
      await kernel.freezeEdition(0);
      await expect(kernel.freezeEdition(0))
        .to.be.revertedWith("PKv2: already frozen");
    });

    it("blocks supersede on frozen edition", async function () {
      const sig = await signEditionRoot(deployer, ROOTS2.editionRoot);
      await kernel.anchorEdition("QmNew", "sha", "v2", roots2Tuple, sig);
      await kernel.freezeEdition(0);

      await expect(kernel.supersede(0, 1))
        .to.be.revertedWith("PKv2: edition is frozen");
    });

    it("blocks setCanonical on frozen edition", async function () {
      await kernel.freezeEdition(0);
      await expect(kernel.setCanonical(0, false))
        .to.be.revertedWith("PKv2: edition is frozen");
    });

    it("blocks retraction proposal on frozen edition", async function () {
      await kernel.freezeEdition(0);
      await expect(kernel.proposeRetraction(0, "Should fail"))
        .to.be.revertedWith("PKv2: edition is frozen");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  TIMELOCK: RETRACTION
  // ════════════════════════════════════════════════════════════════════

  describe("Timelock — Retraction", function () {
    it("proposes retraction and emits TimelockProposed", async function () {
      await expect(kernel.proposeRetraction(0, "Factual error"))
        .to.emit(kernel, "TimelockProposed");

      expect(await kernel.timelockCount()).to.equal(1n);
      const action = await kernel.getTimelockAction(0);
      expect(action.targetId).to.equal(0n);
      expect(action.actionType).to.equal(0);
      expect(action.reason).to.equal("Factual error");
      expect(action.executed).to.equal(false);
      expect(action.cancelled).to.equal(false);
    });

    it("rejects execution before timelock expires", async function () {
      await kernel.proposeRetraction(0, "Too early");
      await expect(kernel.executeTimelock(0))
        .to.be.revertedWith("PKv2: timelock not expired");
    });

    it("executes retraction after 48h", async function () {
      await kernel.proposeRetraction(0, "Delayed retraction");

      // Advance time by 48 hours + 1 second
      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");

      await expect(kernel.executeTimelock(0))
        .to.emit(kernel, "TimelockExecuted")
        .withArgs(0n);

      const ed = await kernel.getEdition(0);
      expect(ed.isRetracted).to.equal(true);
      expect(ed.isCanonical).to.equal(false);
      expect(ed.retractionReason).to.equal("Delayed retraction");
    });

    it("cancels a pending retraction", async function () {
      await kernel.proposeRetraction(0, "Will cancel");
      await kernel.cancelTimelock(0);

      const action = await kernel.getTimelockAction(0);
      expect(action.cancelled).to.equal(true);

      // Cannot execute a cancelled action even after timelock
      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");
      await expect(kernel.executeTimelock(0))
        .to.be.revertedWith("PKv2: action was cancelled");
    });

    it("rejects double execution", async function () {
      await kernel.proposeRetraction(0, "Once only");
      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");
      await kernel.executeTimelock(0);

      await expect(kernel.executeTimelock(0))
        .to.be.revertedWith("PKv2: already executed");
    });

    it("retraction recalculates canonical", async function () {
      // Add a second edition first
      const sig = await signEditionRoot(deployer, ROOTS2.editionRoot);
      await kernel.anchorEdition("QmEdition2", "sha2", "v2", roots2Tuple, sig);

      // Propose retraction of edition 1 (the latest canonical)
      await kernel.proposeRetraction(1, "Retract latest");
      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");
      await kernel.executeTimelock(0);

      // Canonical should fall back to edition 0
      expect(await kernel.canonicalEditionId()).to.equal(0n);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  TIMELOCK: LICENSE REVOCATION
  // ════════════════════════════════════════════════════════════════════

  describe("Timelock — License Revocation", function () {
    beforeEach(async function () {
      await kernel.grantLicense(
        0, other.address, "CC-BY-NC-4.0", "GLOBAL",
        Math.floor(Date.now() / 1000), 0, "all",
        hre.ethers.ZeroAddress
      );
    });

    it("proposes license revocation", async function () {
      await expect(kernel.proposeRevocation(0))
        .to.emit(kernel, "TimelockProposed");

      const action = await kernel.getTimelockAction(0);
      expect(action.actionType).to.equal(1);
      expect(action.targetId).to.equal(0n);
    });

    it("executes revocation after 48h", async function () {
      await kernel.proposeRevocation(0);

      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");

      await kernel.executeTimelock(0);

      const license = await kernel.getLicense(0);
      expect(license.revoked).to.equal(true);
    });

    it("rejects revocation proposal for already revoked license", async function () {
      await kernel.proposeRevocation(0);
      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");
      await kernel.executeTimelock(0);

      await expect(kernel.proposeRevocation(0))
        .to.be.revertedWith("PKv2: already revoked");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  LICENSE REGISTRY
  // ════════════════════════════════════════════════════════════════════

  describe("License Registry", function () {
    it("grants a license", async function () {
      const tx = await kernel.grantLicense(
        0, other.address, "CC-BY-NC-4.0", "GLOBAL",
        Math.floor(Date.now() / 1000), 0, "all",
        hre.ethers.ZeroAddress
      );
      await tx.wait();

      expect(await kernel.licenseCount()).to.equal(1n);
      const license = await kernel.getLicense(0);
      expect(license.grantee).to.equal(other.address);
      expect(license.templateId).to.equal("CC-BY-NC-4.0");
      expect(license.revoked).to.equal(false);
    });

    it("rejects non-author license grant", async function () {
      await expect(
        kernel.connect(other).grantLicense(
          0, addr3.address, "CC-BY-4.0", "US", 0, 0, "print",
          hre.ethers.ZeroAddress
        )
      ).to.be.revertedWith("PKv2: caller is not the author");
    });

    it("rejects license on retracted edition", async function () {
      await kernel.proposeRetraction(0, "Withdrawn");
      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");
      await kernel.executeTimelock(0);

      await expect(
        kernel.grantLicense(0, other.address, "CC-BY-4.0", "GLOBAL", 0, 0, "all",
          hre.ethers.ZeroAddress)
      ).to.be.revertedWith("PKv2: cannot license retracted edition");
    });

    it("editionLicenses returns linked license IDs", async function () {
      await kernel.grantLicense(0, other.address, "CC-BY-4.0", "US", 0, 0, "print", hre.ethers.ZeroAddress);
      await kernel.grantLicense(0, addr3.address, "exclusive-digital", "GLOBAL", 0, 0, "digital", hre.ethers.ZeroAddress);
      const ids = await kernel.getEditionLicenses(0);
      expect(ids.length).to.equal(2);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  ADMIN ROLE
  // ════════════════════════════════════════════════════════════════════

  describe("Admin Role", function () {
    it("author can set admin", async function () {
      await kernel.setAdmin(adminWallet.address);
      expect(await kernel.admin()).to.equal(adminWallet.address);
    });

    it("emits AdminTransferred event", async function () {
      await expect(kernel.setAdmin(adminWallet.address))
        .to.emit(kernel, "AdminTransferred")
        .withArgs(deployer.address, adminWallet.address);
    });

    it("admin can propose retraction", async function () {
      await kernel.setAdmin(adminWallet.address);
      await expect(kernel.connect(adminWallet).proposeRetraction(0, "Admin call"))
        .to.emit(kernel, "TimelockProposed");
    });

    it("admin can propose license revocation", async function () {
      await kernel.grantLicense(0, other.address, "CC-BY-4.0", "GLOBAL", 0, 0, "all", hre.ethers.ZeroAddress);
      await kernel.setAdmin(adminWallet.address);
      await expect(kernel.connect(adminWallet).proposeRevocation(0))
        .to.emit(kernel, "TimelockProposed");
    });

    it("admin can execute timelock", async function () {
      await kernel.setAdmin(adminWallet.address);
      await kernel.proposeRetraction(0, "Author proposes");
      await hre.ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
      await hre.ethers.provider.send("evm_mine");

      await expect(kernel.connect(adminWallet).executeTimelock(0))
        .to.emit(kernel, "TimelockExecuted");
    });

    it("only author can cancel timelock (not admin)", async function () {
      await kernel.setAdmin(adminWallet.address);
      await kernel.proposeRetraction(0, "Test");

      await expect(kernel.connect(adminWallet).cancelTimelock(0))
        .to.be.revertedWith("PKv2: caller is not the author");
    });

    it("non-author cannot set admin", async function () {
      await expect(kernel.connect(other).setAdmin(other.address))
        .to.be.revertedWith("PKv2: caller is not the author");
    });

    it("admin cannot anchor editions", async function () {
      await kernel.setAdmin(adminWallet.address);
      const sig = await signEditionRoot(adminWallet, ROOTS2.editionRoot);
      await expect(
        kernel.connect(adminWallet).anchorEdition("QmNew", "sha", "Admin",
          roots2Tuple, sig)
      ).to.be.revertedWith("PKv2: caller is not the author");
    });

    it("admin cannot grant licenses", async function () {
      await kernel.setAdmin(adminWallet.address);
      await expect(
        kernel.connect(adminWallet).grantLicense(
          0, other.address, "CC-BY-4.0", "GLOBAL", 0, 0, "all",
          hre.ethers.ZeroAddress)
      ).to.be.revertedWith("PKv2: caller is not the author");
    });

    it("admin can be set to address(0) to disable", async function () {
      await kernel.setAdmin(hre.ethers.ZeroAddress);
      expect(await kernel.admin()).to.equal(hre.ethers.ZeroAddress);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  VIEWS
  // ════════════════════════════════════════════════════════════════════

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
      await expect(kernel.getEdition(99)).to.be.revertedWith("PKv2: edition does not exist");
    });

    it("canonicalEdition reverts when no canonical", async function () {
      await kernel.setCanonical(0, false);
      await expect(kernel.canonicalEdition())
        .to.be.revertedWith("PKv2: no canonical edition");
    });

    it("TIMELOCK_DURATION is 48 hours", async function () {
      expect(await kernel.TIMELOCK_DURATION()).to.equal(48n * 3600n);
    });
  });
});
