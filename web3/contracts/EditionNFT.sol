// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title EditionNFT
 * @author Kevan Burns (Kidd James) / FTH Trading
 * @notice Literary Protocol Standard — Tiered Edition NFTs
 *
 * Three-tier minting system for The 2,500 Donkeys:
 *   - Genesis  (1/1)     — Singular token (INV-S1)
 *   - Founder  (limited)  — Fixed supply set in constructor (INV-S2)
 *   - Public   (capped)   — Hard-capped supply set in constructor (INV-S3)
 *
 * Every NFT references an already-anchored on-chain edition (INV-S4).
 * Max supplies are set in the constructor and can never be increased.
 *
 * Follows the literary protocol conventions:
 *   - address public immutable author (set at deploy, stored in bytecode)
 *   - onlyAuthor modifier for all state mutations
 *   - genesisAnchor linkage to LiteraryAnchor
 *   - Pull-based revenue withdrawal (CEI pattern)
 *   - ERC-2981 royalty standard for marketplace compatibility
 *
 * @dev Author Identity
 *      Real name:  Kevan Burns
 *      Nickname:   Burnzy
 *      Pseudonym:  Kidd James (pen name)
 *      Org:        FTH Trading
 *      Wallet:     0xC91668184736BF75C4ecE37473D694efb2A43978
 *      Domain:     unykorn.org
 */

/// @notice Minimal interface for edition count verification (INV-S4)
interface IEditionAnchor {
    function editionCount() external view returns (uint256);
}

contract EditionNFT is ERC721, ERC721Enumerable, ERC2981 {

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTANTS
    // ══════════════════════════════════════════════════════════════════════

    uint8 public constant GENESIS_TIER = 0;
    uint8 public constant FOUNDER_TIER = 1;
    uint8 public constant PUBLIC_TIER  = 2;

    // ══════════════════════════════════════════════════════════════════════
    //  STRUCTS
    // ══════════════════════════════════════════════════════════════════════

    struct TierConfig {
        uint256 maxSupply;       // Set once in constructor — never increasable
        uint256 minted;          // Current mint count for this tier
        uint256 price;           // Mint price in wei (author-settable, 0 = free)
        bool    mintOpen;        // Whether public minting is active
        uint256 editionIndex;    // LiteraryAnchor edition index this tier references
        bool    editionLinked;   // Whether an edition has been linked (one-time)
    }

    struct TokenRecord {
        uint8   tier;            // GENESIS_TIER, FOUNDER_TIER, or PUBLIC_TIER
        uint256 editionIndex;    // Edition index at time of mint
        uint256 mintNumber;      // Nth mint within this tier (1-based)
        uint256 mintedAt;        // block.timestamp at mint
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════════════════

    address public immutable author;
    address public immutable genesisAnchor;

    TierConfig[3] internal _tiers;
    mapping(uint256 => TokenRecord) public tokenRecord;

    uint256 private _nextTokenId = 1;   // Token IDs start at 1
    string  private _baseTokenURI;

    uint256 public totalRevenue;        // Lifetime revenue counter (wei)

    // ══════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════════════════

    event TierLinked(uint8 indexed tier, uint256 editionIndex);
    event TierPriceSet(uint8 indexed tier, uint256 price);
    event TierMintOpened(uint8 indexed tier);
    event TierMintClosed(uint8 indexed tier);
    event EditionMinted(
        uint256 indexed tokenId,
        uint8   indexed tier,
        address indexed to,
        uint256 mintNumber,
        uint256 editionIndex
    );
    event FundsWithdrawn(address indexed to, uint256 amount);
    event BaseURIUpdated(string newBaseURI);

    // ══════════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════════════════════════════════

    modifier onlyAuthor() {
        require(msg.sender == author, "Only the author");
        _;
    }

    modifier validTier(uint8 _tier) {
        require(_tier <= PUBLIC_TIER, "Invalid tier");
        _;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Deploy EditionNFT with immutable supply caps.
     * @param _genesisAnchor     LiteraryAnchor contract address
     * @param _founderMaxSupply  Maximum founder-tier tokens (INV-S2: fixed forever)
     * @param _publicMaxSupply   Maximum public-tier tokens (INV-S3: capped forever)
     * @param _baseMetadataURI    Base URI for token metadata (IPFS or HTTP)
     * @param _royaltyBps        Default royalty in basis points (e.g., 750 = 7.5%)
     */
    constructor(
        address _genesisAnchor,
        uint256 _founderMaxSupply,
        uint256 _publicMaxSupply,
        string memory _baseMetadataURI,
        uint96  _royaltyBps
    ) ERC721("The 2,500 Donkeys", "DONKEY") {
        require(_genesisAnchor != address(0), "Zero anchor address");
        require(_founderMaxSupply > 0, "Zero founder supply");
        require(_publicMaxSupply > 0, "Zero public supply");
        require(_royaltyBps <= 10000, "Royalty exceeds 100%");

        author = msg.sender;
        genesisAnchor = _genesisAnchor;
        _baseTokenURI = _baseMetadataURI;

        // INV-S1: Genesis supply is exactly 1 — hardcoded, immutable
        _tiers[GENESIS_TIER].maxSupply = 1;

        // INV-S2: Founder supply fixed at deployment — no function can increase it
        _tiers[FOUNDER_TIER].maxSupply = _founderMaxSupply;

        // INV-S3: Public supply hard-capped at deployment — no admin increase
        _tiers[PUBLIC_TIER].maxSupply = _publicMaxSupply;

        // ERC-2981: Set default royalty with author as recipient
        _setDefaultRoyalty(msg.sender, _royaltyBps);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  TIER MANAGEMENT (author only)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Link a tier to an anchored on-chain edition.
     *         Calls LiteraryAnchor.editionCount() to verify the edition exists (INV-S4).
     *         Each tier can only be linked once — the edition reference is immutable.
     * @param _tier          Tier index (0=Genesis, 1=Founder, 2=Public)
     * @param _editionIndex  Edition index on LiteraryAnchor
     */
    function linkEdition(uint8 _tier, uint256 _editionIndex)
        external onlyAuthor validTier(_tier)
    {
        require(!_tiers[_tier].editionLinked, "Edition already linked");

        // INV-S4: No retroactive minting — edition must already exist on-chain
        uint256 count = IEditionAnchor(genesisAnchor).editionCount();
        require(_editionIndex < count, "Edition not yet anchored");

        _tiers[_tier].editionIndex  = _editionIndex;
        _tiers[_tier].editionLinked = true;

        emit TierLinked(_tier, _editionIndex);
    }

    /**
     * @notice Set the mint price for a tier.
     * @param _tier   Tier index
     * @param _price  Price in wei (0 = free mint)
     */
    function setPrice(uint8 _tier, uint256 _price)
        external onlyAuthor validTier(_tier)
    {
        _tiers[_tier].price = _price;
        emit TierPriceSet(_tier, _price);
    }

    /**
     * @notice Open public minting for a tier. Edition must be linked first.
     */
    function openMint(uint8 _tier)
        external onlyAuthor validTier(_tier)
    {
        require(_tiers[_tier].editionLinked, "Edition not linked");
        require(!_tiers[_tier].mintOpen, "Already open");
        _tiers[_tier].mintOpen = true;
        emit TierMintOpened(_tier);
    }

    /**
     * @notice Close public minting for a tier.
     */
    function closeMint(uint8 _tier)
        external onlyAuthor validTier(_tier)
    {
        require(_tiers[_tier].mintOpen, "Already closed");
        _tiers[_tier].mintOpen = false;
        emit TierMintClosed(_tier);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  MINTING
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Mint a token from an open tier.
     *         Requires msg.value >= tier price. Overpayment is refunded.
     * @param _tier  Tier to mint from (0=Genesis, 1=Founder, 2=Public)
     */
    function mint(uint8 _tier) external payable validTier(_tier) {
        TierConfig storage tier = _tiers[_tier];

        // Checks
        require(tier.mintOpen, "Minting not open");
        require(tier.minted < tier.maxSupply, "Tier sold out");
        require(msg.value >= tier.price, "Insufficient payment");

        // Effects (CEI pattern — all state changes before interactions)
        uint256 mintPrice = tier.price;
        tier.minted++;
        uint256 tokenId = _nextTokenId++;
        uint256 mintNum = tier.minted;

        tokenRecord[tokenId] = TokenRecord({
            tier:         _tier,
            editionIndex: tier.editionIndex,
            mintNumber:   mintNum,
            mintedAt:     block.timestamp
        });

        totalRevenue += mintPrice;

        // Interactions
        _safeMint(msg.sender, tokenId);

        emit EditionMinted(tokenId, _tier, msg.sender, mintNum, tier.editionIndex);

        // Refund overpayment
        uint256 refund = msg.value - mintPrice;
        if (refund > 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Author-only mint (no payment required).
     *         For gifts, airdrops, author copies.
     * @param _tier  Tier to mint from
     * @param _to    Recipient address
     */
    function authorMint(uint8 _tier, address _to)
        external onlyAuthor validTier(_tier)
    {
        require(_tiers[_tier].editionLinked, "Edition not linked");

        TierConfig storage tier = _tiers[_tier];
        require(tier.minted < tier.maxSupply, "Tier sold out");

        tier.minted++;
        uint256 tokenId = _nextTokenId++;
        uint256 mintNum = tier.minted;

        tokenRecord[tokenId] = TokenRecord({
            tier:         _tier,
            editionIndex: tier.editionIndex,
            mintNumber:   mintNum,
            mintedAt:     block.timestamp
        });

        _safeMint(_to, tokenId);

        emit EditionMinted(tokenId, _tier, _to, mintNum, tier.editionIndex);
    }

    /**
     * @notice Batch author-mint to multiple recipients.
     * @param _tier        Tier to mint from
     * @param _recipients  Array of recipient addresses
     */
    function authorMintBatch(uint8 _tier, address[] calldata _recipients)
        external onlyAuthor validTier(_tier)
    {
        require(_tiers[_tier].editionLinked, "Edition not linked");

        TierConfig storage tier = _tiers[_tier];
        require(tier.minted + _recipients.length <= tier.maxSupply, "Exceeds supply");

        for (uint256 i = 0; i < _recipients.length; i++) {
            tier.minted++;
            uint256 tokenId = _nextTokenId++;
            uint256 mintNum = tier.minted;

            tokenRecord[tokenId] = TokenRecord({
                tier:         _tier,
                editionIndex: tier.editionIndex,
                mintNumber:   mintNum,
                mintedAt:     block.timestamp
            });

            _safeMint(_recipients[i], tokenId);

            emit EditionMinted(tokenId, _tier, _recipients[i], mintNum, tier.editionIndex);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  REVENUE (Pull pattern — CEI)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Withdraw all accumulated funds to the author.
     */
    function withdraw() external onlyAuthor {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");

        (bool success, ) = payable(author).call{value: balance}("");
        require(success, "Withdrawal failed");

        emit FundsWithdrawn(author, balance);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  METADATA
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Update the base URI for token metadata.
     */
    function setBaseURI(string calldata _newBaseURI) external onlyAuthor {
        _baseTokenURI = _newBaseURI;
        emit BaseURIUpdated(_newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get full configuration for a tier.
     */
    function getTier(uint8 _tier) external view validTier(_tier)
        returns (TierConfig memory)
    {
        return _tiers[_tier];
    }

    /**
     * @notice Remaining supply for a tier.
     */
    function tierSupplyRemaining(uint8 _tier) external view validTier(_tier)
        returns (uint256)
    {
        return _tiers[_tier].maxSupply - _tiers[_tier].minted;
    }

    /**
     * @notice Total tokens minted across all tiers.
     */
    function totalMinted() external view returns (uint256) {
        return _tiers[GENESIS_TIER].minted
             + _tiers[FOUNDER_TIER].minted
             + _tiers[PUBLIC_TIER].minted;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  REQUIRED OVERRIDES (ERC721 + ERC721Enumerable + ERC2981)
    // ══════════════════════════════════════════════════════════════════════

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
