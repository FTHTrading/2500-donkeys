// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title StoryNFT
 * @author Kevan Burns (Kidd James) / FTH Trading
 * @notice Literary Protocol Standard — Per-Story Collectible NFTs
 *
 * Each of the 14 stories in Private Placement Puppetry is a separate
 * mintable series. Collectors can own individual stories as NFTs.
 *
 * Architecture:
 *   - 14 story slots (storyId 0..13), each with its own supply cap
 *   - Each story references a content hash (SHA-256 of the story markdown)
 *   - ERC-2981 royalties for secondary marketplace sales
 *   - Pull-based revenue withdrawal (CEI pattern)
 *   - Author-only admin functions (no proxy, no upgrade)
 *
 * Token ID encoding: storyId * 10000 + mintNumber
 *   - Story 0, mint 1 → tokenId 1
 *   - Story 0, mint 2 → tokenId 2
 *   - Story 1, mint 1 → tokenId 10001
 *   - Story 13, mint 33 → tokenId 130033
 *
 * Follows the literary protocol conventions:
 *   - address public immutable author
 *   - onlyAuthor modifier for all state mutations
 *   - genesisAnchor linkage to LiteraryAnchor
 *   - Pull-based revenue withdrawal
 *   - ERC-2981 royalty standard
 *
 * @dev Author Identity
 *      Real name:  Kevan Burns
 *      Nickname:   Burnzy
 *      Pseudonym:  Kidd James (pen name)
 *      Org:        FTH Trading
 *      Wallet:     0xC91668184736BF75C4ecE37473D694efb2A43978
 *      Domain:     unykorn.org
 */

/// @notice Minimal interface for edition count verification
interface ILiteraryAnchor {
    function editionCount() external view returns (uint256);
}

contract StoryNFT is ERC721, ERC721Enumerable, ERC2981 {

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTANTS
    // ══════════════════════════════════════════════════════════════════════

    uint256 public constant MAX_STORIES = 14;
    uint256 public constant TOKEN_ID_MULTIPLIER = 10000;

    // ══════════════════════════════════════════════════════════════════════
    //  STRUCTS
    // ══════════════════════════════════════════════════════════════════════

    struct Story {
        string  title;          // Story title (e.g., "MT799 Is Not Money")
        bytes32 contentHash;    // SHA-256 hash of the story markdown
        uint256 maxSupply;      // Maximum mintable copies per story
        uint256 minted;         // Current mint count
        uint256 price;          // Mint price in wei (0 = free)
        bool    mintOpen;       // Whether public minting is active
        bool    registered;     // Whether this story slot has been configured
    }

    struct TokenRecord {
        uint256 storyId;        // Which story (0..13)
        uint256 mintNumber;     // Nth mint within this story (1-based)
        uint256 mintedAt;       // block.timestamp at mint
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════════════════

    address public immutable author;
    address public immutable genesisAnchor;    // LiteraryAnchor contract
    uint256 public immutable editionIndex;     // Which edition on LiteraryAnchor

    Story[14] public stories;
    mapping(uint256 => TokenRecord) public tokenRecord;

    uint256 public registeredCount;        // How many stories have been registered
    uint256 public totalRevenue;           // Lifetime revenue counter (wei)
    string  private _baseTokenURI;

    // ══════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════════════════

    event StoryRegistered(
        uint256 indexed storyId,
        string  title,
        bytes32 contentHash,
        uint256 maxSupply
    );

    event StoryMinted(
        uint256 indexed tokenId,
        uint256 indexed storyId,
        address indexed to,
        uint256 mintNumber
    );

    event StoryPriceSet(uint256 indexed storyId, uint256 price);
    event StoryMintOpened(uint256 indexed storyId);
    event StoryMintClosed(uint256 indexed storyId);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event BaseURIUpdated(string newBaseURI);

    // ══════════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════════════════════════════════

    modifier onlyAuthor() {
        require(msg.sender == author, "Only the author");
        _;
    }

    modifier validStory(uint256 _storyId) {
        require(_storyId < MAX_STORIES, "Invalid story ID");
        _;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Deploy StoryNFT linked to a LiteraryAnchor edition.
     * @param _genesisAnchor   LiteraryAnchor contract address
     * @param _editionIndex    Edition index for Private Placement Puppetry
     * @param _baseMetadataURI Base URI for token metadata
     * @param _royaltyBps      Default royalty in basis points (e.g., 750 = 7.5%)
     */
    constructor(
        address _genesisAnchor,
        uint256 _editionIndex,
        string memory _baseMetadataURI,
        uint96  _royaltyBps
    ) ERC721("Private Placement Puppetry", "STORY") {
        require(_genesisAnchor != address(0), "Zero anchor address");
        require(_royaltyBps <= 10000, "Royalty exceeds 100%");

        author = msg.sender;
        genesisAnchor = _genesisAnchor;
        _baseTokenURI = _baseMetadataURI;

        // Verify the edition exists on-chain
        uint256 count = ILiteraryAnchor(_genesisAnchor).editionCount();
        require(_editionIndex < count, "Edition not yet anchored");
        editionIndex = _editionIndex;

        // ERC-2981: Set default royalty with author as recipient
        _setDefaultRoyalty(msg.sender, _royaltyBps);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STORY REGISTRATION (author only)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Register a story slot with title, content hash, and supply cap.
     *         Once registered, a story's contentHash and maxSupply are immutable.
     * @param _storyId     Story index (0..13)
     * @param _title       Story title
     * @param _contentHash SHA-256 hash of the story's markdown source
     * @param _maxSupply   Maximum copies that can be minted
     */
    function registerStory(
        uint256 _storyId,
        string calldata _title,
        bytes32 _contentHash,
        uint256 _maxSupply
    ) external onlyAuthor validStory(_storyId) {
        require(!stories[_storyId].registered, "Story already registered");
        require(_contentHash != bytes32(0), "Zero content hash");
        require(_maxSupply > 0, "Zero max supply");

        stories[_storyId] = Story({
            title:       _title,
            contentHash: _contentHash,
            maxSupply:   _maxSupply,
            minted:      0,
            price:       0,
            mintOpen:    false,
            registered:  true
        });

        registeredCount++;

        emit StoryRegistered(_storyId, _title, _contentHash, _maxSupply);
    }

    /**
     * @notice Batch-register multiple stories in one transaction.
     * @param _storyIds     Array of story indices
     * @param _titles       Array of story titles
     * @param _contentHashes Array of SHA-256 content hashes
     * @param _maxSupplies  Array of max supplies
     */
    function registerStoriesBatch(
        uint256[] calldata _storyIds,
        string[] calldata _titles,
        bytes32[] calldata _contentHashes,
        uint256[] calldata _maxSupplies
    ) external onlyAuthor {
        require(
            _storyIds.length == _titles.length &&
            _titles.length == _contentHashes.length &&
            _contentHashes.length == _maxSupplies.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < _storyIds.length; i++) {
            uint256 sid = _storyIds[i];
            require(sid < MAX_STORIES, "Invalid story ID");
            require(!stories[sid].registered, "Story already registered");
            require(_contentHashes[i] != bytes32(0), "Zero content hash");
            require(_maxSupplies[i] > 0, "Zero max supply");

            stories[sid] = Story({
                title:       _titles[i],
                contentHash: _contentHashes[i],
                maxSupply:   _maxSupplies[i],
                minted:      0,
                price:       0,
                mintOpen:    false,
                registered:  true
            });

            registeredCount++;
            emit StoryRegistered(sid, _titles[i], _contentHashes[i], _maxSupplies[i]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  PRICING & MINT CONTROL (author only)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Set the mint price for a story.
     */
    function setPrice(uint256 _storyId, uint256 _price)
        external onlyAuthor validStory(_storyId)
    {
        require(stories[_storyId].registered, "Story not registered");
        stories[_storyId].price = _price;
        emit StoryPriceSet(_storyId, _price);
    }

    /**
     * @notice Batch-set prices for multiple stories.
     */
    function setPriceBatch(uint256[] calldata _storyIds, uint256[] calldata _prices)
        external onlyAuthor
    {
        require(_storyIds.length == _prices.length, "Array length mismatch");
        for (uint256 i = 0; i < _storyIds.length; i++) {
            require(_storyIds[i] < MAX_STORIES, "Invalid story ID");
            require(stories[_storyIds[i]].registered, "Story not registered");
            stories[_storyIds[i]].price = _prices[i];
            emit StoryPriceSet(_storyIds[i], _prices[i]);
        }
    }

    /**
     * @notice Open minting for a story.
     */
    function openMint(uint256 _storyId)
        external onlyAuthor validStory(_storyId)
    {
        require(stories[_storyId].registered, "Story not registered");
        require(!stories[_storyId].mintOpen, "Already open");
        stories[_storyId].mintOpen = true;
        emit StoryMintOpened(_storyId);
    }

    /**
     * @notice Open minting for all registered stories at once.
     */
    function openMintAll() external onlyAuthor {
        for (uint256 i = 0; i < MAX_STORIES; i++) {
            if (stories[i].registered && !stories[i].mintOpen) {
                stories[i].mintOpen = true;
                emit StoryMintOpened(i);
            }
        }
    }

    /**
     * @notice Close minting for a story.
     */
    function closeMint(uint256 _storyId)
        external onlyAuthor validStory(_storyId)
    {
        require(stories[_storyId].mintOpen, "Already closed");
        stories[_storyId].mintOpen = false;
        emit StoryMintClosed(_storyId);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  MINTING
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Mint a story NFT. Requires msg.value >= story price.
     * @param _storyId Which story to mint (0..13)
     */
    function mint(uint256 _storyId) external payable validStory(_storyId) {
        Story storage story = stories[_storyId];

        // Checks
        require(story.registered, "Story not registered");
        require(story.mintOpen, "Minting not open");
        require(story.minted < story.maxSupply, "Story sold out");
        require(msg.value >= story.price, "Insufficient payment");

        // Effects
        uint256 mintPrice = story.price;
        story.minted++;
        uint256 mintNum = story.minted;
        uint256 tokenId = (_storyId * TOKEN_ID_MULTIPLIER) + mintNum;

        tokenRecord[tokenId] = TokenRecord({
            storyId:    _storyId,
            mintNumber: mintNum,
            mintedAt:   block.timestamp
        });

        totalRevenue += mintPrice;

        // Interactions
        _safeMint(msg.sender, tokenId);
        emit StoryMinted(tokenId, _storyId, msg.sender, mintNum);

        // Refund overpayment
        uint256 refund = msg.value - mintPrice;
        if (refund > 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @notice Author-only mint (no payment required).
     * @param _storyId Which story to mint
     * @param _to      Recipient address
     */
    function authorMint(uint256 _storyId, address _to)
        external onlyAuthor validStory(_storyId)
    {
        Story storage story = stories[_storyId];
        require(story.registered, "Story not registered");
        require(story.minted < story.maxSupply, "Story sold out");

        story.minted++;
        uint256 mintNum = story.minted;
        uint256 tokenId = (_storyId * TOKEN_ID_MULTIPLIER) + mintNum;

        tokenRecord[tokenId] = TokenRecord({
            storyId:    _storyId,
            mintNumber: mintNum,
            mintedAt:   block.timestamp
        });

        _safeMint(_to, tokenId);
        emit StoryMinted(tokenId, _storyId, _to, mintNum);
    }

    /**
     * @notice Author batch-mint a story to multiple recipients.
     */
    function authorMintBatch(uint256 _storyId, address[] calldata _recipients)
        external onlyAuthor validStory(_storyId)
    {
        Story storage story = stories[_storyId];
        require(story.registered, "Story not registered");
        require(story.minted + _recipients.length <= story.maxSupply, "Exceeds supply");

        for (uint256 i = 0; i < _recipients.length; i++) {
            story.minted++;
            uint256 mintNum = story.minted;
            uint256 tokenId = (_storyId * TOKEN_ID_MULTIPLIER) + mintNum;

            tokenRecord[tokenId] = TokenRecord({
                storyId:    _storyId,
                mintNumber: mintNum,
                mintedAt:   block.timestamp
            });

            _safeMint(_recipients[i], tokenId);
            emit StoryMinted(tokenId, _storyId, _recipients[i], mintNum);
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
     * @notice Get full configuration for a story.
     */
    function getStory(uint256 _storyId) external view validStory(_storyId)
        returns (Story memory)
    {
        return stories[_storyId];
    }

    /**
     * @notice Remaining supply for a story.
     */
    function storySupplyRemaining(uint256 _storyId) external view validStory(_storyId)
        returns (uint256)
    {
        if (!stories[_storyId].registered) return 0;
        return stories[_storyId].maxSupply - stories[_storyId].minted;
    }

    /**
     * @notice Total tokens minted across all stories.
     */
    function totalMinted() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < MAX_STORIES; i++) {
            total += stories[i].minted;
        }
        return total;
    }

    /**
     * @notice Get all stories that are currently mintable.
     */
    function mintableStories() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < MAX_STORIES; i++) {
            if (stories[i].registered && stories[i].mintOpen && stories[i].minted < stories[i].maxSupply) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < MAX_STORIES; i++) {
            if (stories[i].registered && stories[i].mintOpen && stories[i].minted < stories[i].maxSupply) {
                result[idx++] = i;
            }
        }
        return result;
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
