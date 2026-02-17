const { expect } = require("chai");
const hre = require("hardhat");

describe("EditionNFT", function () {
  const TITLE = "The 2,500 Donkeys";
  const CID = "QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK";
  const SHA = "cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364";

  const GENESIS_TIER = 0;
  const FOUNDER_TIER = 1;
  const PUBLIC_TIER  = 2;

  const FOUNDER_SUPPLY = 33;
  const PUBLIC_SUPPLY  = 2500;
  const BASE_URI       = "ipfs://QmBaseURI/";
  const ROYALTY_BPS    = 750; // 7.5%

  let anchor;
  let nft;
  let deployer;
  let buyer;
  let other;

  async function deployAnchorWithEditions(numExtra) {
    const LiteraryAnchor = await hre.ethers.getContractFactory("LiteraryAnchor");
    const a = await LiteraryAnchor.deploy(TITLE, CID, SHA);
    await a.waitForDeployment();

    for (let i = 0; i < numExtra; i++) {
      await a.anchorEdition(`QmEdition${i + 2}`, `sha${i + 2}`, `Edition ${i + 2}`);
    }
    return a;
  }

  beforeEach(async function () {
    [deployer, buyer, other] = await hre.ethers.getSigners();

    // Deploy anchor with genesis + 1 extra edition (edition index 0 and 1)
    anchor = await deployAnchorWithEditions(1);

    const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
    nft = await EditionNFT.deploy(
      await anchor.getAddress(),
      FOUNDER_SUPPLY,
      PUBLIC_SUPPLY,
      BASE_URI,
      ROYALTY_BPS
    );
    await nft.waitForDeployment();
  });

  // ════════════════════════════════════════════════════════════════════
  //  DEPLOYMENT
  // ════════════════════════════════════════════════════════════════════

  describe("Deployment", function () {
    it("sets author as deployer (immutable)", async function () {
      expect(await nft.author()).to.equal(deployer.address);
    });

    it("sets genesisAnchor (immutable)", async function () {
      expect(await nft.genesisAnchor()).to.equal(await anchor.getAddress());
    });

    it("sets correct name and symbol", async function () {
      expect(await nft.name()).to.equal("The 2,500 Donkeys");
      expect(await nft.symbol()).to.equal("DONKEY");
    });

    it("INV-S1: genesis maxSupply is exactly 1", async function () {
      const tier = await nft.getTier(GENESIS_TIER);
      expect(tier.maxSupply).to.equal(1n);
    });

    it("INV-S2: founder maxSupply matches constructor arg", async function () {
      const tier = await nft.getTier(FOUNDER_TIER);
      expect(tier.maxSupply).to.equal(BigInt(FOUNDER_SUPPLY));
    });

    it("INV-S3: public maxSupply matches constructor arg", async function () {
      const tier = await nft.getTier(PUBLIC_TIER);
      expect(tier.maxSupply).to.equal(BigInt(PUBLIC_SUPPLY));
    });

    it("all tiers start with zero minted", async function () {
      for (let t = 0; t <= 2; t++) {
        const tier = await nft.getTier(t);
        expect(tier.minted).to.equal(0n);
      }
    });

    it("all tiers start with minting closed", async function () {
      for (let t = 0; t <= 2; t++) {
        const tier = await nft.getTier(t);
        expect(tier.mintOpen).to.equal(false);
      }
    });

    it("all tiers start unlinked", async function () {
      for (let t = 0; t <= 2; t++) {
        const tier = await nft.getTier(t);
        expect(tier.editionLinked).to.equal(false);
      }
    });

    it("reverts on zero anchor address", async function () {
      const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
      await expect(
        EditionNFT.deploy(hre.ethers.ZeroAddress, FOUNDER_SUPPLY, PUBLIC_SUPPLY, BASE_URI, ROYALTY_BPS)
      ).to.be.revertedWith("Zero anchor address");
    });

    it("reverts on zero founder supply", async function () {
      const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
      await expect(
        EditionNFT.deploy(await anchor.getAddress(), 0, PUBLIC_SUPPLY, BASE_URI, ROYALTY_BPS)
      ).to.be.revertedWith("Zero founder supply");
    });

    it("reverts on zero public supply", async function () {
      const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
      await expect(
        EditionNFT.deploy(await anchor.getAddress(), FOUNDER_SUPPLY, 0, BASE_URI, ROYALTY_BPS)
      ).to.be.revertedWith("Zero public supply");
    });

    it("reverts on royalty > 100%", async function () {
      const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
      await expect(
        EditionNFT.deploy(await anchor.getAddress(), FOUNDER_SUPPLY, PUBLIC_SUPPLY, BASE_URI, 10001)
      ).to.be.revertedWith("Royalty exceeds 100%");
    });

    it("ERC-2981: default royalty set correctly", async function () {
      // royaltyInfo(tokenId, salePrice) — use hypothetical token 1, sale price 10000
      const [receiver, amount] = await nft.royaltyInfo(1, 10000n);
      expect(receiver).to.equal(deployer.address);
      expect(amount).to.equal(750n); // 7.5% of 10000
    });

    it("totalMinted starts at zero", async function () {
      expect(await nft.totalMinted()).to.equal(0n);
    });

    it("totalRevenue starts at zero", async function () {
      expect(await nft.totalRevenue()).to.equal(0n);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  LINK EDITION
  // ════════════════════════════════════════════════════════════════════

  describe("linkEdition", function () {
    it("author can link tier to genesis edition (index 0)", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      const tier = await nft.getTier(GENESIS_TIER);
      expect(tier.editionLinked).to.equal(true);
      expect(tier.editionIndex).to.equal(0n);
    });

    it("author can link tier to edition 1", async function () {
      await nft.linkEdition(FOUNDER_TIER, 1);
      const tier = await nft.getTier(FOUNDER_TIER);
      expect(tier.editionLinked).to.equal(true);
      expect(tier.editionIndex).to.equal(1n);
    });

    it("different tiers can link to different editions", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      await nft.linkEdition(FOUNDER_TIER, 1);
      await nft.linkEdition(PUBLIC_TIER, 1);

      expect((await nft.getTier(GENESIS_TIER)).editionIndex).to.equal(0n);
      expect((await nft.getTier(FOUNDER_TIER)).editionIndex).to.equal(1n);
      expect((await nft.getTier(PUBLIC_TIER)).editionIndex).to.equal(1n);
    });

    it("emits TierLinked event", async function () {
      await expect(nft.linkEdition(GENESIS_TIER, 0))
        .to.emit(nft, "TierLinked")
        .withArgs(GENESIS_TIER, 0);
    });

    it("rejects non-author", async function () {
      await expect(
        nft.connect(buyer).linkEdition(GENESIS_TIER, 0)
      ).to.be.revertedWith("Only the author");
    });

    it("rejects double-linking same tier", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      await expect(
        nft.linkEdition(GENESIS_TIER, 1)
      ).to.be.revertedWith("Edition already linked");
    });

    it("INV-S4: rejects edition that doesn't exist on-chain", async function () {
      // Anchor has editions 0 and 1 — index 2 doesn't exist
      await expect(
        nft.linkEdition(GENESIS_TIER, 2)
      ).to.be.revertedWith("Edition not yet anchored");
    });

    it("INV-S4: rejects edition index far beyond count", async function () {
      await expect(
        nft.linkEdition(GENESIS_TIER, 999)
      ).to.be.revertedWith("Edition not yet anchored");
    });

    it("rejects invalid tier", async function () {
      await expect(
        nft.linkEdition(3, 0)
      ).to.be.revertedWith("Invalid tier");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  SET PRICE
  // ════════════════════════════════════════════════════════════════════

  describe("setPrice", function () {
    it("author can set price", async function () {
      const price = hre.ethers.parseEther("0.1");
      await nft.setPrice(PUBLIC_TIER, price);
      const tier = await nft.getTier(PUBLIC_TIER);
      expect(tier.price).to.equal(price);
    });

    it("author can set price to zero (free)", async function () {
      await nft.setPrice(PUBLIC_TIER, 0);
      const tier = await nft.getTier(PUBLIC_TIER);
      expect(tier.price).to.equal(0n);
    });

    it("emits TierPriceSet event", async function () {
      const price = hre.ethers.parseEther("1.0");
      await expect(nft.setPrice(FOUNDER_TIER, price))
        .to.emit(nft, "TierPriceSet")
        .withArgs(FOUNDER_TIER, price);
    });

    it("rejects non-author", async function () {
      await expect(
        nft.connect(buyer).setPrice(PUBLIC_TIER, 100)
      ).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  OPEN / CLOSE MINT
  // ════════════════════════════════════════════════════════════════════

  describe("openMint / closeMint", function () {
    beforeEach(async function () {
      await nft.linkEdition(PUBLIC_TIER, 0);
    });

    it("author can open mint", async function () {
      await nft.openMint(PUBLIC_TIER);
      const tier = await nft.getTier(PUBLIC_TIER);
      expect(tier.mintOpen).to.equal(true);
    });

    it("emits TierMintOpened event", async function () {
      await expect(nft.openMint(PUBLIC_TIER))
        .to.emit(nft, "TierMintOpened")
        .withArgs(PUBLIC_TIER);
    });

    it("author can close mint", async function () {
      await nft.openMint(PUBLIC_TIER);
      await nft.closeMint(PUBLIC_TIER);
      const tier = await nft.getTier(PUBLIC_TIER);
      expect(tier.mintOpen).to.equal(false);
    });

    it("emits TierMintClosed event", async function () {
      await nft.openMint(PUBLIC_TIER);
      await expect(nft.closeMint(PUBLIC_TIER))
        .to.emit(nft, "TierMintClosed")
        .withArgs(PUBLIC_TIER);
    });

    it("rejects openMint without edition linked", async function () {
      await expect(
        nft.openMint(FOUNDER_TIER) // not linked
      ).to.be.revertedWith("Edition not linked");
    });

    it("rejects opening already-open tier", async function () {
      await nft.openMint(PUBLIC_TIER);
      await expect(
        nft.openMint(PUBLIC_TIER)
      ).to.be.revertedWith("Already open");
    });

    it("rejects closing already-closed tier", async function () {
      await expect(
        nft.closeMint(PUBLIC_TIER)
      ).to.be.revertedWith("Already closed");
    });

    it("rejects non-author openMint", async function () {
      await expect(
        nft.connect(buyer).openMint(PUBLIC_TIER)
      ).to.be.revertedWith("Only the author");
    });

    it("rejects non-author closeMint", async function () {
      await nft.openMint(PUBLIC_TIER);
      await expect(
        nft.connect(buyer).closeMint(PUBLIC_TIER)
      ).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  MINTING (public)
  // ════════════════════════════════════════════════════════════════════

  describe("mint", function () {
    const MINT_PRICE = hre.ethers.parseEther("0.05");

    beforeEach(async function () {
      await nft.linkEdition(PUBLIC_TIER, 1);
      await nft.setPrice(PUBLIC_TIER, MINT_PRICE);
      await nft.openMint(PUBLIC_TIER);
    });

    it("mints a token to caller", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("assigns sequential token IDs starting at 1", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      await nft.connect(other).mint(PUBLIC_TIER, { value: MINT_PRICE });
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
      expect(await nft.ownerOf(2)).to.equal(other.address);
    });

    it("stores correct token record", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      const record = await nft.tokenRecord(1);
      expect(record.tier).to.equal(PUBLIC_TIER);
      expect(record.editionIndex).to.equal(1n);
      expect(record.mintNumber).to.equal(1n);
      expect(record.mintedAt).to.be.gt(0n);
    });

    it("increments tier minted count", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      const tier = await nft.getTier(PUBLIC_TIER);
      expect(tier.minted).to.equal(1n);
    });

    it("increments totalMinted", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      expect(await nft.totalMinted()).to.equal(1n);
    });

    it("accumulates totalRevenue", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      expect(await nft.totalRevenue()).to.equal(MINT_PRICE);
    });

    it("emits EditionMinted event", async function () {
      await expect(nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE }))
        .to.emit(nft, "EditionMinted")
        .withArgs(1, PUBLIC_TIER, buyer.address, 1, 1);
    });

    it("accepts overpayment and refunds excess", async function () {
      const overpay = hre.ethers.parseEther("1.0");
      const balBefore = await hre.ethers.provider.getBalance(buyer.address);

      const tx = await nft.connect(buyer).mint(PUBLIC_TIER, { value: overpay });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balAfter = await hre.ethers.provider.getBalance(buyer.address);
      // Buyer should only lose MINT_PRICE + gas, not the full overpay
      const spent = balBefore - balAfter;
      expect(spent).to.equal(MINT_PRICE + gasCost);
    });

    it("rejects insufficient payment", async function () {
      const tooLow = MINT_PRICE - 1n;
      await expect(
        nft.connect(buyer).mint(PUBLIC_TIER, { value: tooLow })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("rejects mint when tier is closed", async function () {
      await nft.closeMint(PUBLIC_TIER);
      await expect(
        nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE })
      ).to.be.revertedWith("Minting not open");
    });

    it("works with zero price (free mint)", async function () {
      await nft.setPrice(PUBLIC_TIER, 0);
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: 0 });
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
      expect(await nft.totalRevenue()).to.equal(0n);
    });

    it("rejects invalid tier", async function () {
      await expect(
        nft.connect(buyer).mint(3, { value: MINT_PRICE })
      ).to.be.revertedWith("Invalid tier");
    });

    it("tokenURI includes base URI", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      expect(await nft.tokenURI(1)).to.equal(BASE_URI + "1");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  SUPPLY INVARIANTS
  // ════════════════════════════════════════════════════════════════════

  describe("Supply invariants", function () {
    it("INV-S1: cannot mint more than 1 genesis NFT", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      await nft.openMint(GENESIS_TIER);

      await nft.connect(buyer).mint(GENESIS_TIER);
      expect(await nft.tierSupplyRemaining(GENESIS_TIER)).to.equal(0n);

      await expect(
        nft.connect(other).mint(GENESIS_TIER)
      ).to.be.revertedWith("Tier sold out");
    });

    it("INV-S2: founder tier respects max supply", async function () {
      // Deploy with founder supply of 3 for fast test
      const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
      const smallNft = await EditionNFT.deploy(
        await anchor.getAddress(), 3, 10, BASE_URI, ROYALTY_BPS
      );
      await smallNft.waitForDeployment();
      await smallNft.linkEdition(FOUNDER_TIER, 0);
      await smallNft.openMint(FOUNDER_TIER);

      // Mint all 3
      for (let i = 0; i < 3; i++) {
        await smallNft.connect(buyer).mint(FOUNDER_TIER);
      }

      // 4th should fail
      await expect(
        smallNft.connect(buyer).mint(FOUNDER_TIER)
      ).to.be.revertedWith("Tier sold out");
    });

    it("INV-S3: public tier respects max supply", async function () {
      const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
      const smallNft = await EditionNFT.deploy(
        await anchor.getAddress(), 5, 2, BASE_URI, ROYALTY_BPS
      );
      await smallNft.waitForDeployment();
      await smallNft.linkEdition(PUBLIC_TIER, 0);
      await smallNft.openMint(PUBLIC_TIER);

      await smallNft.connect(buyer).mint(PUBLIC_TIER);
      await smallNft.connect(other).mint(PUBLIC_TIER);

      await expect(
        smallNft.connect(buyer).mint(PUBLIC_TIER)
      ).to.be.revertedWith("Tier sold out");
    });

    it("no function exists to increase any maxSupply", async function () {
      // Verify by checking the contract ABI has no such function
      const abi = nft.interface;
      const fnNames = abi.fragments
        .filter(f => f.type === "function")
        .map(f => f.name);

      expect(fnNames).to.not.include("setMaxSupply");
      expect(fnNames).to.not.include("increaseSupply");
      expect(fnNames).to.not.include("updateSupply");
    });

    it("tierSupplyRemaining decreases as tokens are minted", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      expect(await nft.tierSupplyRemaining(GENESIS_TIER)).to.equal(1n);

      await nft.authorMint(GENESIS_TIER, deployer.address);
      expect(await nft.tierSupplyRemaining(GENESIS_TIER)).to.equal(0n);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  AUTHOR MINT
  // ════════════════════════════════════════════════════════════════════

  describe("authorMint", function () {
    beforeEach(async function () {
      await nft.linkEdition(FOUNDER_TIER, 1);
    });

    it("author can mint to self", async function () {
      await nft.authorMint(FOUNDER_TIER, deployer.address);
      expect(await nft.ownerOf(1)).to.equal(deployer.address);
    });

    it("author can mint to another address", async function () {
      await nft.authorMint(FOUNDER_TIER, buyer.address);
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("does not require payment", async function () {
      await nft.authorMint(FOUNDER_TIER, buyer.address);
      expect(await nft.totalRevenue()).to.equal(0n);
    });

    it("does not require mint to be open", async function () {
      // Mint is closed by default, but authorMint should still work
      const tier = await nft.getTier(FOUNDER_TIER);
      expect(tier.mintOpen).to.equal(false);

      await nft.authorMint(FOUNDER_TIER, buyer.address);
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("rejects non-author", async function () {
      await expect(
        nft.connect(buyer).authorMint(FOUNDER_TIER, buyer.address)
      ).to.be.revertedWith("Only the author");
    });

    it("rejects when tier not linked", async function () {
      await expect(
        nft.authorMint(PUBLIC_TIER, buyer.address) // PUBLIC_TIER not linked
      ).to.be.revertedWith("Edition not linked");
    });

    it("rejects when sold out", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      await nft.authorMint(GENESIS_TIER, deployer.address);
      await expect(
        nft.authorMint(GENESIS_TIER, deployer.address)
      ).to.be.revertedWith("Tier sold out");
    });

    it("stores correct token record", async function () {
      await nft.authorMint(FOUNDER_TIER, buyer.address);
      const record = await nft.tokenRecord(1);
      expect(record.tier).to.equal(FOUNDER_TIER);
      expect(record.editionIndex).to.equal(1n);
      expect(record.mintNumber).to.equal(1n);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  AUTHOR MINT BATCH
  // ════════════════════════════════════════════════════════════════════

  describe("authorMintBatch", function () {
    beforeEach(async function () {
      await nft.linkEdition(FOUNDER_TIER, 0);
    });

    it("mints to multiple recipients", async function () {
      await nft.authorMintBatch(FOUNDER_TIER, [buyer.address, other.address]);
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
      expect(await nft.ownerOf(2)).to.equal(other.address);
    });

    it("assigns sequential mint numbers", async function () {
      await nft.authorMintBatch(FOUNDER_TIER, [buyer.address, other.address]);
      expect((await nft.tokenRecord(1)).mintNumber).to.equal(1n);
      expect((await nft.tokenRecord(2)).mintNumber).to.equal(2n);
    });

    it("increments minted count correctly", async function () {
      await nft.authorMintBatch(FOUNDER_TIER, [buyer.address, other.address]);
      const tier = await nft.getTier(FOUNDER_TIER);
      expect(tier.minted).to.equal(2n);
    });

    it("reverts if batch exceeds remaining supply", async function () {
      // Deploy with founder supply = 2
      const EditionNFT = await hre.ethers.getContractFactory("EditionNFT");
      const smallNft = await EditionNFT.deploy(
        await anchor.getAddress(), 2, 10, BASE_URI, ROYALTY_BPS
      );
      await smallNft.waitForDeployment();
      await smallNft.linkEdition(FOUNDER_TIER, 0);

      await expect(
        smallNft.authorMintBatch(FOUNDER_TIER, [buyer.address, other.address, deployer.address])
      ).to.be.revertedWith("Exceeds supply");
    });

    it("rejects non-author", async function () {
      await expect(
        nft.connect(buyer).authorMintBatch(FOUNDER_TIER, [buyer.address])
      ).to.be.revertedWith("Only the author");
    });

    it("rejects unlinked tier", async function () {
      await expect(
        nft.authorMintBatch(PUBLIC_TIER, [buyer.address])
      ).to.be.revertedWith("Edition not linked");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  REVENUE / WITHDRAWAL
  // ════════════════════════════════════════════════════════════════════

  describe("withdraw", function () {
    const MINT_PRICE = hre.ethers.parseEther("0.1");

    beforeEach(async function () {
      await nft.linkEdition(PUBLIC_TIER, 0);
      await nft.setPrice(PUBLIC_TIER, MINT_PRICE);
      await nft.openMint(PUBLIC_TIER);
    });

    it("author can withdraw accumulated funds", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      await nft.connect(other).mint(PUBLIC_TIER, { value: MINT_PRICE });

      const authorBalBefore = await hre.ethers.provider.getBalance(deployer.address);

      const tx = await nft.withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const authorBalAfter = await hre.ethers.provider.getBalance(deployer.address);
      const expectedGain = MINT_PRICE * 2n;

      expect(authorBalAfter - authorBalBefore + gasCost).to.equal(expectedGain);
    });

    it("emits FundsWithdrawn event", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });

      await expect(nft.withdraw())
        .to.emit(nft, "FundsWithdrawn")
        .withArgs(deployer.address, MINT_PRICE);
    });

    it("rejects non-author", async function () {
      await nft.connect(buyer).mint(PUBLIC_TIER, { value: MINT_PRICE });
      await expect(
        nft.connect(buyer).withdraw()
      ).to.be.revertedWith("Only the author");
    });

    it("rejects when no balance", async function () {
      await expect(nft.withdraw()).to.be.revertedWith("No balance");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  METADATA
  // ════════════════════════════════════════════════════════════════════

  describe("Metadata", function () {
    it("setBaseURI updates token URIs", async function () {
      await nft.linkEdition(FOUNDER_TIER, 0);
      await nft.authorMint(FOUNDER_TIER, deployer.address);

      const newURI = "https://xxxiii.io/nft/";
      await nft.setBaseURI(newURI);
      expect(await nft.tokenURI(1)).to.equal(newURI + "1");
    });

    it("emits BaseURIUpdated event", async function () {
      const newURI = "ipfs://QmNewBase/";
      await expect(nft.setBaseURI(newURI))
        .to.emit(nft, "BaseURIUpdated")
        .withArgs(newURI);
    });

    it("rejects non-author setBaseURI", async function () {
      await expect(
        nft.connect(buyer).setBaseURI("http://evil.com/")
      ).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  ERC-721 ENUMERABLE
  // ════════════════════════════════════════════════════════════════════

  describe("ERC-721 Enumerable", function () {
    beforeEach(async function () {
      await nft.linkEdition(FOUNDER_TIER, 0);
    });

    it("totalSupply tracks minted tokens", async function () {
      expect(await nft.totalSupply()).to.equal(0n);

      await nft.authorMint(FOUNDER_TIER, buyer.address);
      expect(await nft.totalSupply()).to.equal(1n);

      await nft.authorMint(FOUNDER_TIER, other.address);
      expect(await nft.totalSupply()).to.equal(2n);
    });

    it("tokenByIndex works", async function () {
      await nft.authorMint(FOUNDER_TIER, buyer.address);
      await nft.authorMint(FOUNDER_TIER, other.address);

      expect(await nft.tokenByIndex(0)).to.equal(1n); // first token has ID 1
      expect(await nft.tokenByIndex(1)).to.equal(2n);
    });

    it("tokenOfOwnerByIndex works", async function () {
      await nft.authorMint(FOUNDER_TIER, buyer.address);
      await nft.authorMint(FOUNDER_TIER, buyer.address);

      expect(await nft.tokenOfOwnerByIndex(buyer.address, 0)).to.equal(1n);
      expect(await nft.tokenOfOwnerByIndex(buyer.address, 1)).to.equal(2n);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  ERC-2981 ROYALTIES
  // ════════════════════════════════════════════════════════════════════

  describe("ERC-2981 Royalties", function () {
    it("royaltyInfo returns correct fraction", async function () {
      const salePrice = hre.ethers.parseEther("10.0");
      const [receiver, amount] = await nft.royaltyInfo(1, salePrice);

      expect(receiver).to.equal(deployer.address);
      // 7.5% of 10 ETH = 0.75 ETH
      expect(amount).to.equal(hre.ethers.parseEther("0.75"));
    });

    it("supports ERC-2981 interface", async function () {
      // ERC-2981 interface ID: 0x2a55205a
      expect(await nft.supportsInterface("0x2a55205a")).to.equal(true);
    });

    it("supports ERC-721 interface", async function () {
      // ERC-721 interface ID: 0x80ac58cd
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("supports ERC-721 Enumerable interface", async function () {
      // ERC-721 Enumerable interface ID: 0x780e9d63
      expect(await nft.supportsInterface("0x780e9d63")).to.equal(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  CROSS-TIER MINTING
  // ════════════════════════════════════════════════════════════════════

  describe("Cross-tier minting", function () {
    it("token IDs are globally sequential across tiers", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      await nft.linkEdition(FOUNDER_TIER, 1);
      await nft.linkEdition(PUBLIC_TIER, 1);

      await nft.authorMint(GENESIS_TIER, deployer.address); // token 1
      await nft.authorMint(FOUNDER_TIER, buyer.address);    // token 2
      await nft.openMint(PUBLIC_TIER);
      await nft.connect(other).mint(PUBLIC_TIER);            // token 3

      expect(await nft.ownerOf(1)).to.equal(deployer.address);
      expect(await nft.ownerOf(2)).to.equal(buyer.address);
      expect(await nft.ownerOf(3)).to.equal(other.address);

      // Verify tier records
      expect((await nft.tokenRecord(1)).tier).to.equal(GENESIS_TIER);
      expect((await nft.tokenRecord(2)).tier).to.equal(FOUNDER_TIER);
      expect((await nft.tokenRecord(3)).tier).to.equal(PUBLIC_TIER);
    });

    it("mint numbers are per-tier", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      await nft.linkEdition(FOUNDER_TIER, 0);

      await nft.authorMint(GENESIS_TIER, deployer.address); // genesis #1
      await nft.authorMint(FOUNDER_TIER, buyer.address);    // founder #1
      await nft.authorMint(FOUNDER_TIER, other.address);    // founder #2

      expect((await nft.tokenRecord(1)).mintNumber).to.equal(1n); // genesis #1
      expect((await nft.tokenRecord(2)).mintNumber).to.equal(1n); // founder #1
      expect((await nft.tokenRecord(3)).mintNumber).to.equal(2n); // founder #2
    });

    it("totalMinted sums all tiers", async function () {
      await nft.linkEdition(GENESIS_TIER, 0);
      await nft.linkEdition(FOUNDER_TIER, 0);

      await nft.authorMint(GENESIS_TIER, deployer.address);
      await nft.authorMint(FOUNDER_TIER, buyer.address);
      await nft.authorMint(FOUNDER_TIER, other.address);

      expect(await nft.totalMinted()).to.equal(3n);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  ERC-721 TRANSFERS
  // ════════════════════════════════════════════════════════════════════

  describe("Transfers", function () {
    beforeEach(async function () {
      await nft.linkEdition(FOUNDER_TIER, 0);
      await nft.authorMint(FOUNDER_TIER, buyer.address); // token 1
    });

    it("owner can transfer token", async function () {
      await nft.connect(buyer).transferFrom(buyer.address, other.address, 1);
      expect(await nft.ownerOf(1)).to.equal(other.address);
    });

    it("approved address can transfer token", async function () {
      await nft.connect(buyer).approve(other.address, 1);
      await nft.connect(other).transferFrom(buyer.address, other.address, 1);
      expect(await nft.ownerOf(1)).to.equal(other.address);
    });

    it("token record persists after transfer", async function () {
      await nft.connect(buyer).transferFrom(buyer.address, other.address, 1);
      const record = await nft.tokenRecord(1);
      expect(record.tier).to.equal(FOUNDER_TIER);
      expect(record.mintNumber).to.equal(1n);
    });
  });
});
