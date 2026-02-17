const { expect } = require("chai");
const hre = require("hardhat");

describe("StoryNFT", function () {
  const TITLE = "The 2,500 Donkeys";
  const CID = "QmVQ79NM3qxAsBpftTG4YhD4KV9sUEmM3WwFrc5vs5g8vK";
  const SHA = "cdef74d157437eeeb20d474fa7fcb590c83f87668aa109c036c76ac21e578364";

  const BASE_URI = "ipfs://QmStoryURI/";
  const ROYALTY_BPS = 750; // 7.5%
  const EDITION_INDEX = 2; // PPP is edition 2 on LiteraryAnchor

  const STORY_TITLES = [
    "MT799 Is Not Money",
    "The Bank That Didn't Exist",
    "Commission Above Supply Depth",
    "The Ghost Monetizer",
    "The Mandate That Couldn't Sign",
    "Vault Without Address",
    "The Compliance Wall",
    "Bonded but Never Seen",
    "The Sovereign Whisper",
    "The Tokenized Mirage",
    "The Initiator Awakening",
    "The Financial Alchemist's Punch List",
    "The Exclusivity Trap",
    "The Off-Ledger Revelation",
  ];

  // Fake content hashes (32 bytes each)
  const STORY_HASHES = STORY_TITLES.map(
    (_, i) => hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`story-${i}`))
  );

  const MAX_SUPPLY_PER_STORY = 100;
  const TOKEN_ID_MULTIPLIER = 10000;

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

    // Deploy anchor with genesis + 2 extra editions (indices 0, 1, 2)
    anchor = await deployAnchorWithEditions(2);

    const StoryNFT = await hre.ethers.getContractFactory("StoryNFT");
    nft = await StoryNFT.deploy(
      await anchor.getAddress(),
      EDITION_INDEX,
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

    it("sets genesis anchor address", async function () {
      expect(await nft.genesisAnchor()).to.equal(await anchor.getAddress());
    });

    it("stores edition index", async function () {
      expect(await nft.editionIndex()).to.equal(EDITION_INDEX);
    });

    it("sets name and symbol", async function () {
      expect(await nft.name()).to.equal("Private Placement Puppetry");
      expect(await nft.symbol()).to.equal("STORY");
    });

    it("sets ERC-2981 royalty", async function () {
      const salePrice = hre.ethers.parseEther("10");
      const [receiver, amount] = await nft.royaltyInfo(1, salePrice);
      expect(receiver).to.equal(deployer.address);
      expect(amount).to.equal(salePrice * BigInt(ROYALTY_BPS) / 10000n);
    });

    it("starts with 0 registered stories", async function () {
      expect(await nft.registeredCount()).to.equal(0);
    });

    it("reverts if anchor is zero address", async function () {
      const StoryNFT = await hre.ethers.getContractFactory("StoryNFT");
      await expect(
        StoryNFT.deploy(hre.ethers.ZeroAddress, EDITION_INDEX, BASE_URI, ROYALTY_BPS)
      ).to.be.revertedWith("Zero anchor address");
    });

    it("reverts if edition not yet anchored", async function () {
      const StoryNFT = await hre.ethers.getContractFactory("StoryNFT");
      await expect(
        StoryNFT.deploy(await anchor.getAddress(), 99, BASE_URI, ROYALTY_BPS)
      ).to.be.revertedWith("Edition not yet anchored");
    });

    it("reverts if royalty exceeds 100%", async function () {
      const StoryNFT = await hre.ethers.getContractFactory("StoryNFT");
      await expect(
        StoryNFT.deploy(await anchor.getAddress(), EDITION_INDEX, BASE_URI, 10001)
      ).to.be.revertedWith("Royalty exceeds 100%");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  STORY REGISTRATION
  // ════════════════════════════════════════════════════════════════════

  describe("Story Registration", function () {
    it("registers a single story", async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);

      const story = await nft.getStory(0);
      expect(story.title).to.equal(STORY_TITLES[0]);
      expect(story.contentHash).to.equal(STORY_HASHES[0]);
      expect(story.maxSupply).to.equal(MAX_SUPPLY_PER_STORY);
      expect(story.minted).to.equal(0);
      expect(story.registered).to.be.true;
      expect(story.mintOpen).to.be.false;
    });

    it("emits StoryRegistered event", async function () {
      await expect(nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY))
        .to.emit(nft, "StoryRegistered")
        .withArgs(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
    });

    it("increments registeredCount", async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
      expect(await nft.registeredCount()).to.equal(1);

      await nft.registerStory(1, STORY_TITLES[1], STORY_HASHES[1], MAX_SUPPLY_PER_STORY);
      expect(await nft.registeredCount()).to.equal(2);
    });

    it("reverts on duplicate registration", async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
      await expect(
        nft.registerStory(0, "Other", STORY_HASHES[1], 50)
      ).to.be.revertedWith("Story already registered");
    });

    it("reverts on zero content hash", async function () {
      await expect(
        nft.registerStory(0, STORY_TITLES[0], hre.ethers.ZeroHash, MAX_SUPPLY_PER_STORY)
      ).to.be.revertedWith("Zero content hash");
    });

    it("reverts on zero max supply", async function () {
      await expect(
        nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], 0)
      ).to.be.revertedWith("Zero max supply");
    });

    it("reverts on invalid story ID", async function () {
      await expect(
        nft.registerStory(14, "Invalid", STORY_HASHES[0], 100)
      ).to.be.revertedWith("Invalid story ID");
    });

    it("reverts when non-author tries to register", async function () {
      await expect(
        nft.connect(buyer).registerStory(0, STORY_TITLES[0], STORY_HASHES[0], 100)
      ).to.be.revertedWith("Only the author");
    });

    it("batch-registers all 14 stories", async function () {
      const ids = Array.from({ length: 14 }, (_, i) => i);
      const supplies = Array(14).fill(MAX_SUPPLY_PER_STORY);

      await nft.registerStoriesBatch(ids, STORY_TITLES, STORY_HASHES, supplies);

      expect(await nft.registeredCount()).to.equal(14);

      for (let i = 0; i < 14; i++) {
        const story = await nft.getStory(i);
        expect(story.title).to.equal(STORY_TITLES[i]);
        expect(story.contentHash).to.equal(STORY_HASHES[i]);
        expect(story.registered).to.be.true;
      }
    });

    it("batch reverts on array length mismatch", async function () {
      await expect(
        nft.registerStoriesBatch([0, 1], STORY_TITLES.slice(0, 1), STORY_HASHES.slice(0, 2), [100, 100])
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  PRICING & MINT CONTROL
  // ════════════════════════════════════════════════════════════════════

  describe("Pricing & Mint Control", function () {
    beforeEach(async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
    });

    it("sets price for a story", async function () {
      const price = hre.ethers.parseEther("1.0");
      await nft.setPrice(0, price);
      const story = await nft.getStory(0);
      expect(story.price).to.equal(price);
    });

    it("emits StoryPriceSet", async function () {
      const price = hre.ethers.parseEther("2.0");
      await expect(nft.setPrice(0, price))
        .to.emit(nft, "StoryPriceSet")
        .withArgs(0, price);
    });

    it("opens and closes minting", async function () {
      await nft.openMint(0);
      expect((await nft.getStory(0)).mintOpen).to.be.true;

      await nft.closeMint(0);
      expect((await nft.getStory(0)).mintOpen).to.be.false;
    });

    it("batch-sets prices", async function () {
      await nft.registerStory(1, STORY_TITLES[1], STORY_HASHES[1], MAX_SUPPLY_PER_STORY);
      const p1 = hre.ethers.parseEther("1.0");
      const p2 = hre.ethers.parseEther("2.0");

      await nft.setPriceBatch([0, 1], [p1, p2]);
      expect((await nft.getStory(0)).price).to.equal(p1);
      expect((await nft.getStory(1)).price).to.equal(p2);
    });

    it("openMintAll opens all registered stories", async function () {
      await nft.registerStory(1, STORY_TITLES[1], STORY_HASHES[1], MAX_SUPPLY_PER_STORY);
      await nft.openMintAll();
      expect((await nft.getStory(0)).mintOpen).to.be.true;
      expect((await nft.getStory(1)).mintOpen).to.be.true;
      // Unregistered story should not be open
      expect((await nft.getStory(2)).mintOpen).to.be.false;
    });

    it("reverts openMint on unregistered story", async function () {
      await expect(nft.openMint(5)).to.be.revertedWith("Story not registered");
    });

    it("reverts setPrice when non-author", async function () {
      await expect(
        nft.connect(buyer).setPrice(0, hre.ethers.parseEther("1"))
      ).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  MINTING
  // ════════════════════════════════════════════════════════════════════

  describe("Minting", function () {
    const PRICE = hre.ethers.parseEther("1.0");

    beforeEach(async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
      await nft.setPrice(0, PRICE);
      await nft.openMint(0);
    });

    it("mints a story NFT with correct token ID", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });

      // Story 0, mint 1 → tokenId = 0 * 10000 + 1 = 1
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("stores token record correctly", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });

      const record = await nft.tokenRecord(1);
      expect(record.storyId).to.equal(0);
      expect(record.mintNumber).to.equal(1);
      expect(record.mintedAt).to.be.gt(0);
    });

    it("emits StoryMinted event", async function () {
      await expect(nft.connect(buyer).mint(0, { value: PRICE }))
        .to.emit(nft, "StoryMinted")
        .withArgs(1, 0, buyer.address, 1);
    });

    it("increments story minted count", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });
      await nft.connect(other).mint(0, { value: PRICE });

      const story = await nft.getStory(0);
      expect(story.minted).to.equal(2);
    });

    it("creates correct token IDs for different stories", async function () {
      await nft.registerStory(5, STORY_TITLES[5], STORY_HASHES[5], MAX_SUPPLY_PER_STORY);
      await nft.setPrice(5, PRICE);
      await nft.openMint(5);

      await nft.connect(buyer).mint(0, { value: PRICE });  // tokenId = 1
      await nft.connect(buyer).mint(5, { value: PRICE });  // tokenId = 50001

      expect(await nft.ownerOf(1)).to.equal(buyer.address);
      expect(await nft.ownerOf(50001)).to.equal(buyer.address);
    });

    it("tracks totalRevenue", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });
      expect(await nft.totalRevenue()).to.equal(PRICE);
    });

    it("refunds overpayment", async function () {
      const overpay = hre.ethers.parseEther("2.0");
      const balBefore = await hre.ethers.provider.getBalance(buyer.address);

      const tx = await nft.connect(buyer).mint(0, { value: overpay });
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const balAfter = await hre.ethers.provider.getBalance(buyer.address);
      // Should only have paid PRICE + gas, not overpay + gas
      const spent = balBefore - balAfter;
      expect(spent).to.equal(PRICE + gasCost);
    });

    it("reverts when minting is closed", async function () {
      await nft.closeMint(0);
      await expect(
        nft.connect(buyer).mint(0, { value: PRICE })
      ).to.be.revertedWith("Minting not open");
    });

    it("reverts when insufficient payment", async function () {
      await expect(
        nft.connect(buyer).mint(0, { value: hre.ethers.parseEther("0.5") })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("reverts when sold out", async function () {
      // Register a story with maxSupply = 1
      await nft.registerStory(1, STORY_TITLES[1], STORY_HASHES[1], 1);
      await nft.setPrice(1, PRICE);
      await nft.openMint(1);

      await nft.connect(buyer).mint(1, { value: PRICE });
      await expect(
        nft.connect(other).mint(1, { value: PRICE })
      ).to.be.revertedWith("Story sold out");
    });

    it("reverts when story not registered", async function () {
      await expect(
        nft.connect(buyer).mint(3, { value: PRICE })
      ).to.be.revertedWith("Story not registered");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  AUTHOR MINTING
  // ════════════════════════════════════════════════════════════════════

  describe("Author Minting", function () {
    beforeEach(async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
    });

    it("author mints without payment or opening mint", async function () {
      await nft.authorMint(0, buyer.address);
      expect(await nft.ownerOf(1)).to.equal(buyer.address);
    });

    it("author batch-mints to multiple recipients", async function () {
      await nft.authorMintBatch(0, [buyer.address, other.address]);

      expect(await nft.ownerOf(1)).to.equal(buyer.address);
      expect(await nft.ownerOf(2)).to.equal(other.address);

      const story = await nft.getStory(0);
      expect(story.minted).to.equal(2);
    });

    it("reverts batch mint exceeding supply", async function () {
      // Register with maxSupply=1
      await nft.registerStory(1, STORY_TITLES[1], STORY_HASHES[1], 1);
      await expect(
        nft.authorMintBatch(1, [buyer.address, other.address])
      ).to.be.revertedWith("Exceeds supply");
    });

    it("non-author cannot author-mint", async function () {
      await expect(
        nft.connect(buyer).authorMint(0, other.address)
      ).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  REVENUE & WITHDRAWAL
  // ════════════════════════════════════════════════════════════════════

  describe("Revenue & Withdrawal", function () {
    const PRICE = hre.ethers.parseEther("1.0");

    beforeEach(async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
      await nft.setPrice(0, PRICE);
      await nft.openMint(0);
    });

    it("accumulates mint revenue in contract", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });
      const balance = await hre.ethers.provider.getBalance(await nft.getAddress());
      expect(balance).to.equal(PRICE);
    });

    it("author withdraws all funds", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });
      await nft.connect(other).mint(0, { value: PRICE });

      const balBefore = await hre.ethers.provider.getBalance(deployer.address);
      const tx = await nft.withdraw();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await hre.ethers.provider.getBalance(deployer.address);

      expect(balAfter - balBefore + gasCost).to.equal(PRICE * 2n);
    });

    it("emits FundsWithdrawn event", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });
      await expect(nft.withdraw())
        .to.emit(nft, "FundsWithdrawn")
        .withArgs(deployer.address, PRICE);
    });

    it("reverts withdraw when no balance", async function () {
      await expect(nft.withdraw()).to.be.revertedWith("No balance");
    });

    it("reverts when non-author tries to withdraw", async function () {
      await nft.connect(buyer).mint(0, { value: PRICE });
      await expect(nft.connect(buyer).withdraw()).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  VIEW FUNCTIONS
  // ════════════════════════════════════════════════════════════════════

  describe("View Functions", function () {
    beforeEach(async function () {
      const ids = Array.from({ length: 14 }, (_, i) => i);
      const supplies = Array(14).fill(MAX_SUPPLY_PER_STORY);
      await nft.registerStoriesBatch(ids, STORY_TITLES, STORY_HASHES, supplies);
    });

    it("storySupplyRemaining returns correct value", async function () {
      expect(await nft.storySupplyRemaining(0)).to.equal(MAX_SUPPLY_PER_STORY);

      await nft.authorMint(0, buyer.address);
      expect(await nft.storySupplyRemaining(0)).to.equal(MAX_SUPPLY_PER_STORY - 1);
    });

    it("storySupplyRemaining returns 0 for unregistered story (impossible after batch)", async function () {
      // All registered in this test, but let's test the logic with a fresh contract
      const StoryNFT = await hre.ethers.getContractFactory("StoryNFT");
      const fresh = await StoryNFT.deploy(
        await anchor.getAddress(), EDITION_INDEX, BASE_URI, ROYALTY_BPS
      );
      await fresh.waitForDeployment();
      expect(await fresh.storySupplyRemaining(5)).to.equal(0);
    });

    it("totalMinted counts across all stories", async function () {
      await nft.authorMint(0, buyer.address);
      await nft.authorMint(3, buyer.address);
      await nft.authorMint(13, buyer.address);

      expect(await nft.totalMinted()).to.equal(3);
    });

    it("mintableStories returns only open, non-sold-out stories", async function () {
      await nft.openMint(0);
      await nft.openMint(5);
      await nft.openMint(13);

      const mintable = await nft.mintableStories();
      expect(mintable.length).to.equal(3);
      expect(mintable[0]).to.equal(0);
      expect(mintable[1]).to.equal(5);
      expect(mintable[2]).to.equal(13);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  METADATA
  // ════════════════════════════════════════════════════════════════════

  describe("Metadata", function () {
    it("returns correct base URI in tokenURI", async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
      await nft.authorMint(0, buyer.address);

      const uri = await nft.tokenURI(1);
      expect(uri).to.equal(BASE_URI + "1");
    });

    it("author can update base URI", async function () {
      await nft.registerStory(0, STORY_TITLES[0], STORY_HASHES[0], MAX_SUPPLY_PER_STORY);
      await nft.authorMint(0, buyer.address);

      await nft.setBaseURI("https://xxxiii.io/metadata/stories/");
      expect(await nft.tokenURI(1)).to.equal("https://xxxiii.io/metadata/stories/1");
    });

    it("emits BaseURIUpdated", async function () {
      await expect(nft.setBaseURI("https://new.io/"))
        .to.emit(nft, "BaseURIUpdated")
        .withArgs("https://new.io/");
    });

    it("non-author cannot update base URI", async function () {
      await expect(
        nft.connect(buyer).setBaseURI("https://evil.io/")
      ).to.be.revertedWith("Only the author");
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  ERC-165 INTERFACE SUPPORT
  // ════════════════════════════════════════════════════════════════════

  describe("Interface Support", function () {
    it("supports ERC-721", async function () {
      expect(await nft.supportsInterface("0x80ac58cd")).to.be.true;
    });

    it("supports ERC-721 Enumerable", async function () {
      expect(await nft.supportsInterface("0x780e9d63")).to.be.true;
    });

    it("supports ERC-2981 (Royalty)", async function () {
      expect(await nft.supportsInterface("0x2a55205a")).to.be.true;
    });
  });
});
