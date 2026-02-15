// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AuthorIdentity
 * @author Kevan Burns (Kidd James) / FTH Trading
 * @notice On-chain author identity declaration for the Literary Protocol Standard.
 *
 * This contract establishes an immutable, verifiable link between:
 *   - A real-world identity (Kevan Burns)
 *   - A pen name / pseudonym (Kidd James)
 *   - A cryptographic wallet (author address)
 *   - A publishing bibliography (Amazon, on-chain works)
 *   - External domains and platforms (unykorn.org)
 *
 * This is a declaration contract — it holds no funds and performs no
 * token operations. Its sole purpose is to anchor provenance metadata
 * on-chain so that any contract in the protocol can reference it as
 * the authoritative identity source.
 *
 * @dev Author Identity
 *      Real name:  Kevan Burns
 *      Nickname:   Burnzy
 *      Pseudonym:  Kidd James (pen name)
 *      Org:        FTH Trading
 *      Wallet:     0xC91668184736BF75C4ecE37473D694efb2A43978
 *      Domain:     unykorn.org
 */
contract AuthorIdentity {

    // ══════════════════════════════════════════════════════════════════════
    //  STRUCTS
    // ══════════════════════════════════════════════════════════════════════

    struct Identity {
        string realName;
        string nickname;
        string pseudonym;       // pen name
        string organization;
        string domain;          // primary web domain
        string amazonAuthorUrl; // external author page
    }

    struct PublishedWork {
        string title;
        string platform;       // "amazon", "on-chain", "ipfs", etc.
        string identifier;     // ASIN, contract address, CID, etc.
        uint256 registeredAt;
    }

    struct LinkedContract {
        address contractAddress;
        string  role;           // "genesis-anchor", "publishing-kernel-v1", etc.
        uint256 linkedAt;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════════════════

    address public immutable author;
    Identity public identity;

    PublishedWork[] public bibliography;
    LinkedContract[] public linkedContracts;

    // ══════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════════════════

    event IdentityDeclared(
        address indexed author,
        string realName,
        string pseudonym,
        string domain
    );

    event WorkRegistered(
        uint256 indexed workIndex,
        string title,
        string platform
    );

    event ContractLinked(
        uint256 indexed linkIndex,
        address indexed contractAddress,
        string role
    );

    event IdentityUpdated(string field, string newValue);

    // ══════════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════════════════════════════════

    modifier onlyAuthor() {
        require(msg.sender == author, "Only the author");
        _;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════

    constructor(
        string memory _realName,
        string memory _nickname,
        string memory _pseudonym,
        string memory _organization,
        string memory _domain,
        string memory _amazonAuthorUrl
    ) {
        author = msg.sender;

        identity = Identity({
            realName:       _realName,
            nickname:       _nickname,
            pseudonym:      _pseudonym,
            organization:   _organization,
            domain:         _domain,
            amazonAuthorUrl: _amazonAuthorUrl
        });

        emit IdentityDeclared(msg.sender, _realName, _pseudonym, _domain);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  BIBLIOGRAPHY
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Register a published work in the on-chain bibliography.
     * @param _title     Title of the work
     * @param _platform  Publishing platform ("amazon", "on-chain", "ipfs")
     * @param _identifier Platform-specific ID (ASIN, contract address, CID)
     */
    function registerWork(
        string calldata _title,
        string calldata _platform,
        string calldata _identifier
    ) external onlyAuthor {
        bibliography.push(PublishedWork({
            title:        _title,
            platform:     _platform,
            identifier:   _identifier,
            registeredAt: block.timestamp
        }));

        emit WorkRegistered(bibliography.length - 1, _title, _platform);
    }

    /**
     * @notice Batch-register multiple works in a single transaction.
     * @param _titles      Array of work titles
     * @param _platforms   Array of platforms
     * @param _identifiers Array of identifiers
     */
    function registerWorksBatch(
        string[] calldata _titles,
        string[] calldata _platforms,
        string[] calldata _identifiers
    ) external onlyAuthor {
        require(
            _titles.length == _platforms.length &&
            _titles.length == _identifiers.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < _titles.length; i++) {
            bibliography.push(PublishedWork({
                title:        _titles[i],
                platform:     _platforms[i],
                identifier:   _identifiers[i],
                registeredAt: block.timestamp
            }));

            emit WorkRegistered(bibliography.length - 1, _titles[i], _platforms[i]);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONTRACT LINKING
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Link a deployed contract to this author identity.
     * @param _contractAddress Address of the contract to link
     * @param _role            Role descriptor ("genesis-anchor", "kernel-v2", etc.)
     */
    function linkContract(
        address _contractAddress,
        string calldata _role
    ) external onlyAuthor {
        require(_contractAddress != address(0), "Zero address");

        linkedContracts.push(LinkedContract({
            contractAddress: _contractAddress,
            role:            _role,
            linkedAt:        block.timestamp
        }));

        emit ContractLinked(linkedContracts.length - 1, _contractAddress, _role);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  IDENTITY UPDATES (mutable fields only)
    // ══════════════════════════════════════════════════════════════════════

    function updateDomain(string calldata _domain) external onlyAuthor {
        identity.domain = _domain;
        emit IdentityUpdated("domain", _domain);
    }

    function updateAmazonUrl(string calldata _url) external onlyAuthor {
        identity.amazonAuthorUrl = _url;
        emit IdentityUpdated("amazonAuthorUrl", _url);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════

    function getIdentity() external view returns (Identity memory) {
        return identity;
    }

    function getBibliographyCount() external view returns (uint256) {
        return bibliography.length;
    }

    function getLinkedContractCount() external view returns (uint256) {
        return linkedContracts.length;
    }

    function getWork(uint256 _index) external view returns (PublishedWork memory) {
        require(_index < bibliography.length, "Index out of bounds");
        return bibliography[_index];
    }

    function getLinkedContract(uint256 _index) external view returns (LinkedContract memory) {
        require(_index < linkedContracts.length, "Index out of bounds");
        return linkedContracts[_index];
    }

    /**
     * @notice Returns the full bibliography as an array.
     */
    function getFullBibliography() external view returns (PublishedWork[] memory) {
        return bibliography;
    }

    /**
     * @notice Returns all linked contracts as an array.
     */
    function getAllLinkedContracts() external view returns (LinkedContract[] memory) {
        return linkedContracts;
    }
}
