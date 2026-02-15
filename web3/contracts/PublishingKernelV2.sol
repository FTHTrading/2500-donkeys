// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PublishingKernelV2
 * @author Kevan Burnzy / FTH Trading
 * @notice Literary Protocol Standard v2 (LPS-2) — Hardened Publishing Kernel
 *
 * Upgrades PublishingKernel v1 with:
 *   - ECDSA signature enforcement (author proof, not just attestation)
 *   - Cached canonical edition ID for O(1) lookup
 *   - CanonicalSnapshot event for immutable historical record
 *   - Edition freeze (seal) — no more modifications after freeze
 *   - Timelock on destructive operations (retract, revoke)
 *   - Optional admin role (multi-sig ready)
 *   - Predecessor kernel lineage (v1 → v2 chain)
 *
 * Predecessor: PublishingKernel v1 at 0x511c653fC0F450ba41C42A89A3125CcBf2eFE8ae
 */
contract PublishingKernelV2 {
    using ECDSA for bytes32;

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTANTS
    // ══════════════════════════════════════════════════════════════════════

    uint256 public constant TIMELOCK_DURATION = 48 hours;
    uint256 public constant VERSION = 2;

    // ══════════════════════════════════════════════════════════════════════
    //  STRUCTS
    // ══════════════════════════════════════════════════════════════════════

    struct MerkleRoots {
        bytes32 manuscriptRoot;
        bytes32 artifactRoot;
        bytes32 imageRoot;
        bytes32 promptRoot;
        bytes32 editionRoot;      // H(manuscriptRoot || artifactRoot || imageRoot || promptRoot)
    }

    struct Edition {
        // Identity
        string  ipfsCID;
        string  sha256Hash;
        string  title;
        string  note;
        uint256 timestamp;

        // Merkle integrity
        MerkleRoots roots;

        // Lineage
        uint256 supersedesEdition; // 0 = none, otherwise edition index + 1
        bool    isCanonical;
        bool    isRetracted;
        string  retractionReason;

        // AI provenance
        string  aiModel;
        bytes32 promptSetHash;

        // Signature (now ECDSA-verified)
        bytes   authorSignature;

        // V2: Freeze flag
        bool    isFrozen;
    }

    struct License {
        uint256 editionId;
        address grantee;
        string  templateId;
        string  territory;
        uint256 termStart;
        uint256 termEnd;          // 0 = perpetual
        string  fieldsOfUse;
        address royaltyRouter;
        bool    revoked;
    }

    /// @notice Pending destructive action (retraction or license revocation)
    struct TimelockAction {
        uint256 targetId;         // edition ID or license ID
        uint8   actionType;       // 0 = retract, 1 = revokeLicense
        string  reason;           // retraction reason (empty for revoke)
        uint256 proposedAt;
        bool    executed;
        bool    cancelled;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════════════════

    address public immutable author;
    string  public title;
    address public immutable genesisAnchor;
    address public immutable predecessorKernel;  // v1 contract address

    address public admin;  // Optional governance role (defaults to author)

    Edition[] public editions;
    License[] public licenses;
    TimelockAction[] public timelockActions;

    // V2: Cached canonical edition
    uint256 public canonicalEditionId;
    bool    public hasCanonical;

    // Mappings
    mapping(uint256 => uint256[]) public editionLicenses;
    mapping(bytes32 => bool) public anchoredRoots;

    // ══════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════════════════

    event EditionAnchored(
        uint256 indexed editionId,
        string  ipfsCID,
        bytes32 editionRoot,
        uint256 timestamp,
        string  note
    );

    event EditionSuperseded(
        uint256 indexed oldEditionId,
        uint256 indexed newEditionId
    );

    event EditionRetracted(
        uint256 indexed editionId,
        string  reason,
        uint256 timestamp
    );

    event CanonicalityChanged(
        uint256 indexed editionId,
        bool    isCanonical
    );

    /// @notice V2: Rich snapshot emitted when canonical edition changes
    event CanonicalSnapshot(
        uint256 indexed editionId,
        bytes32 editionRoot,
        string  ipfsCID,
        string  sha256Hash,
        uint256 timestamp
    );

    /// @notice V2: Emitted when an edition is permanently frozen
    event EditionFrozen(
        uint256 indexed editionId,
        uint256 timestamp
    );

    event LicenseGranted(
        uint256 indexed licenseId,
        uint256 indexed editionId,
        address indexed grantee,
        string  templateId
    );

    event LicenseRevoked(
        uint256 indexed licenseId,
        uint256 timestamp
    );

    /// @notice V2: Timelock events
    event TimelockProposed(
        uint256 indexed actionId,
        uint8   actionType,
        uint256 targetId,
        uint256 executeAfter
    );

    event TimelockExecuted(
        uint256 indexed actionId
    );

    event TimelockCancelled(
        uint256 indexed actionId
    );

    /// @notice V2: Admin transfer
    event AdminTransferred(
        address indexed previousAdmin,
        address indexed newAdmin
    );

    /// @notice V2: Signature verification
    event SignatureVerified(
        uint256 indexed editionId,
        address signer,
        bytes32 editionRoot
    );

    // ══════════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════════════════════════════════

    modifier onlyAuthor() {
        require(msg.sender == author, "PKv2: caller is not the author");
        _;
    }

    modifier onlyAuthorOrAdmin() {
        require(
            msg.sender == author || msg.sender == admin,
            "PKv2: caller is not author or admin"
        );
        _;
    }

    modifier editionExists(uint256 _editionId) {
        require(_editionId < editions.length, "PKv2: edition does not exist");
        _;
    }

    modifier editionNotFrozen(uint256 _editionId) {
        require(!editions[_editionId].isFrozen, "PKv2: edition is frozen");
        _;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Deploy PublishingKernelV2 with a genesis edition.
     * @param _title              Work title
     * @param _ipfsCID            IPFS CID of the compiled manuscript
     * @param _sha256Hash         SHA-256 of the compiled manuscript
     * @param _roots              Merkle roots for the genesis edition
     * @param _genesisAnchor      Address of the original LiteraryAnchor contract
     * @param _predecessorKernel  Address of PublishingKernel v1 (address(0) if none)
     * @param _authorSignature    EIP-191 signature over editionRoot
     */
    constructor(
        string memory _title,
        string memory _ipfsCID,
        string memory _sha256Hash,
        MerkleRoots memory _roots,
        address _genesisAnchor,
        address _predecessorKernel,
        bytes memory _authorSignature
    ) {
        // Verify author signature over editionRoot
        _verifySignature(_roots.editionRoot, _authorSignature, msg.sender);

        author = msg.sender;
        admin = msg.sender; // Default admin = author
        title = _title;
        genesisAnchor = _genesisAnchor;
        predecessorKernel = _predecessorKernel;

        Edition memory genesisEdition = Edition({
            ipfsCID: _ipfsCID,
            sha256Hash: _sha256Hash,
            title: _title,
            note: "Genesis - Literary Protocol Standard v2",
            timestamp: block.timestamp,
            roots: _roots,
            supersedesEdition: 0,
            isCanonical: true,
            isRetracted: false,
            retractionReason: "",
            aiModel: "",
            promptSetHash: bytes32(0),
            authorSignature: _authorSignature,
            isFrozen: false
        });

        editions.push(genesisEdition);
        anchoredRoots[_roots.editionRoot] = true;
        canonicalEditionId = 0;
        hasCanonical = true;

        emit EditionAnchored(0, _ipfsCID, _roots.editionRoot, block.timestamp, genesisEdition.note);
        emit SignatureVerified(0, msg.sender, _roots.editionRoot);
        emit CanonicalSnapshot(0, _roots.editionRoot, _ipfsCID, _sha256Hash, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  INTERNAL: ECDSA VERIFICATION
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @dev Verify that _signature is a valid EIP-191 signature of _hash by _expectedSigner.
     *      Uses "\x19Ethereum Signed Message:\n32" prefix (personal_sign standard).
     */
    function _verifySignature(
        bytes32 _hash,
        bytes memory _signature,
        address _expectedSigner
    ) internal pure {
        bytes32 ethSignedHash = ECDSA.toEthSignedMessageHash(_hash);
        address recovered = ECDSA.recover(ethSignedHash, _signature);
        require(recovered == _expectedSigner, "PKv2: invalid author signature");
    }

    /**
     * @dev Update the cached canonical edition and emit snapshot.
     */
    function _updateCanonical(uint256 _editionId) internal {
        canonicalEditionId = _editionId;
        hasCanonical = true;

        Edition storage ed = editions[_editionId];
        emit CanonicalSnapshot(
            _editionId,
            ed.roots.editionRoot,
            ed.ipfsCID,
            ed.sha256Hash,
            block.timestamp
        );
    }

    /**
     * @dev Scan backwards to find the latest canonical edition after a demotion.
     *      If none found, sets hasCanonical = false.
     */
    function _recalculateCanonical() internal {
        for (uint256 i = editions.length; i > 0; i--) {
            if (editions[i - 1].isCanonical && !editions[i - 1].isRetracted) {
                _updateCanonical(i - 1);
                return;
            }
        }
        hasCanonical = false;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  EDITION MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Anchor a new edition with ECDSA-verified signature.
     */
    function anchorEdition(
        string calldata _ipfsCID,
        string calldata _sha256Hash,
        string calldata _note,
        MerkleRoots calldata _roots,
        bytes calldata _authorSignature
    ) external onlyAuthor returns (uint256 editionId) {
        require(!anchoredRoots[_roots.editionRoot], "PKv2: edition root already anchored");

        // ECDSA enforcement
        _verifySignature(_roots.editionRoot, _authorSignature, author);

        editionId = editions.length;

        Edition memory newEdition = Edition({
            ipfsCID: _ipfsCID,
            sha256Hash: _sha256Hash,
            title: title,
            note: _note,
            timestamp: block.timestamp,
            roots: _roots,
            supersedesEdition: 0,
            isCanonical: true,
            isRetracted: false,
            retractionReason: "",
            aiModel: "",
            promptSetHash: bytes32(0),
            authorSignature: _authorSignature,
            isFrozen: false
        });

        editions.push(newEdition);
        anchoredRoots[_roots.editionRoot] = true;
        _updateCanonical(editionId);

        emit EditionAnchored(editionId, _ipfsCID, _roots.editionRoot, block.timestamp, _note);
        emit SignatureVerified(editionId, author, _roots.editionRoot);
    }

    /**
     * @notice Anchor an edition with AI provenance and ECDSA-verified signature.
     */
    function anchorEditionWithProvenance(
        string calldata _ipfsCID,
        string calldata _sha256Hash,
        string calldata _note,
        MerkleRoots calldata _roots,
        bytes calldata _authorSignature,
        string calldata _aiModel,
        bytes32 _promptSetHash
    ) external onlyAuthor returns (uint256 editionId) {
        require(!anchoredRoots[_roots.editionRoot], "PKv2: edition root already anchored");

        // ECDSA enforcement
        _verifySignature(_roots.editionRoot, _authorSignature, author);

        editionId = editions.length;

        Edition memory newEdition = Edition({
            ipfsCID: _ipfsCID,
            sha256Hash: _sha256Hash,
            title: title,
            note: _note,
            timestamp: block.timestamp,
            roots: _roots,
            supersedesEdition: 0,
            isCanonical: true,
            isRetracted: false,
            retractionReason: "",
            aiModel: _aiModel,
            promptSetHash: _promptSetHash,
            authorSignature: _authorSignature,
            isFrozen: false
        });

        editions.push(newEdition);
        anchoredRoots[_roots.editionRoot] = true;
        _updateCanonical(editionId);

        emit EditionAnchored(editionId, _ipfsCID, _roots.editionRoot, block.timestamp, _note);
        emit SignatureVerified(editionId, author, _roots.editionRoot);
    }

    /**
     * @notice Declare that a new edition supersedes an older one.
     */
    function supersede(
        uint256 _oldEditionId,
        uint256 _newEditionId
    ) external onlyAuthor
      editionExists(_oldEditionId)
      editionExists(_newEditionId)
      editionNotFrozen(_oldEditionId)
    {
        require(_newEditionId > _oldEditionId, "PKv2: new must be after old");
        require(!editions[_oldEditionId].isRetracted, "PKv2: cannot supersede retracted edition");

        editions[_newEditionId].supersedesEdition = _oldEditionId + 1; // +1 because 0 = none
        editions[_oldEditionId].isCanonical = false;

        emit EditionSuperseded(_oldEditionId, _newEditionId);
        emit CanonicalityChanged(_oldEditionId, false);

        // Recalculate canonical since we demoted an edition
        _recalculateCanonical();
    }

    /**
     * @notice Set canonicality of an edition.
     */
    function setCanonical(
        uint256 _editionId,
        bool _isCanonical
    ) external onlyAuthor
      editionExists(_editionId)
      editionNotFrozen(_editionId)
    {
        require(!editions[_editionId].isRetracted, "PKv2: cannot canonicalize retracted edition");
        editions[_editionId].isCanonical = _isCanonical;
        emit CanonicalityChanged(_editionId, _isCanonical);

        if (_isCanonical) {
            _updateCanonical(_editionId);
        } else {
            // Demoted: recalculate
            _recalculateCanonical();
        }
    }

    /**
     * @notice Permanently freeze an edition. No further modifications allowed.
     */
    function freezeEdition(
        uint256 _editionId
    ) external onlyAuthor editionExists(_editionId) {
        require(!editions[_editionId].isFrozen, "PKv2: already frozen");
        editions[_editionId].isFrozen = true;
        emit EditionFrozen(_editionId, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  TIMELOCK: DESTRUCTIVE OPERATIONS
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Propose retraction of an edition (starts 48h timelock).
     */
    function proposeRetraction(
        uint256 _editionId,
        string calldata _reason
    ) external onlyAuthorOrAdmin editionExists(_editionId) editionNotFrozen(_editionId) {
        require(!editions[_editionId].isRetracted, "PKv2: already retracted");

        uint256 actionId = timelockActions.length;
        timelockActions.push(TimelockAction({
            targetId: _editionId,
            actionType: 0,
            reason: _reason,
            proposedAt: block.timestamp,
            executed: false,
            cancelled: false
        }));

        emit TimelockProposed(actionId, 0, _editionId, block.timestamp + TIMELOCK_DURATION);
    }

    /**
     * @notice Propose revocation of a license (starts 48h timelock).
     */
    function proposeRevocation(
        uint256 _licenseId
    ) external onlyAuthorOrAdmin {
        require(_licenseId < licenses.length, "PKv2: license does not exist");
        require(!licenses[_licenseId].revoked, "PKv2: already revoked");

        uint256 actionId = timelockActions.length;
        timelockActions.push(TimelockAction({
            targetId: _licenseId,
            actionType: 1,
            reason: "",
            proposedAt: block.timestamp,
            executed: false,
            cancelled: false
        }));

        emit TimelockProposed(actionId, 1, _licenseId, block.timestamp + TIMELOCK_DURATION);
    }

    /**
     * @notice Execute a timelocked action after the delay has passed.
     */
    function executeTimelock(uint256 _actionId) external onlyAuthorOrAdmin {
        require(_actionId < timelockActions.length, "PKv2: action does not exist");
        TimelockAction storage action = timelockActions[_actionId];

        require(!action.executed, "PKv2: already executed");
        require(!action.cancelled, "PKv2: action was cancelled");
        require(
            block.timestamp >= action.proposedAt + TIMELOCK_DURATION,
            "PKv2: timelock not expired"
        );

        action.executed = true;

        if (action.actionType == 0) {
            // Retraction
            _executeRetraction(action.targetId, action.reason);
        } else if (action.actionType == 1) {
            // License revocation
            _executeLicenseRevocation(action.targetId);
        }

        emit TimelockExecuted(_actionId);
    }

    /**
     * @notice Cancel a pending timelocked action.
     */
    function cancelTimelock(uint256 _actionId) external onlyAuthor {
        require(_actionId < timelockActions.length, "PKv2: action does not exist");
        TimelockAction storage action = timelockActions[_actionId];
        require(!action.executed, "PKv2: already executed");
        require(!action.cancelled, "PKv2: already cancelled");

        action.cancelled = true;
        emit TimelockCancelled(_actionId);
    }

    /**
     * @dev Internal: execute retraction after timelock.
     */
    function _executeRetraction(uint256 _editionId, string memory _reason) internal {
        require(!editions[_editionId].isRetracted, "PKv2: already retracted");
        require(!editions[_editionId].isFrozen, "PKv2: edition is frozen");

        editions[_editionId].isRetracted = true;
        editions[_editionId].isCanonical = false;
        editions[_editionId].retractionReason = _reason;

        emit EditionRetracted(_editionId, _reason, block.timestamp);
        emit CanonicalityChanged(_editionId, false);

        _recalculateCanonical();
    }

    /**
     * @dev Internal: execute license revocation after timelock.
     */
    function _executeLicenseRevocation(uint256 _licenseId) internal {
        require(!licenses[_licenseId].revoked, "PKv2: already revoked");
        licenses[_licenseId].revoked = true;
        emit LicenseRevoked(_licenseId, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  LICENSE REGISTRY
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Grant a license for an edition. Only author can grant.
     */
    function grantLicense(
        uint256 _editionId,
        address _grantee,
        string calldata _templateId,
        string calldata _territory,
        uint256 _termStart,
        uint256 _termEnd,
        string calldata _fieldsOfUse,
        address _royaltyRouter
    ) external onlyAuthor editionExists(_editionId) returns (uint256 licenseId) {
        require(!editions[_editionId].isRetracted, "PKv2: cannot license retracted edition");

        licenseId = licenses.length;

        licenses.push(License({
            editionId: _editionId,
            grantee: _grantee,
            templateId: _templateId,
            territory: _territory,
            termStart: _termStart,
            termEnd: _termEnd,
            fieldsOfUse: _fieldsOfUse,
            royaltyRouter: _royaltyRouter,
            revoked: false
        }));

        editionLicenses[_editionId].push(licenseId);

        emit LicenseGranted(licenseId, _editionId, _grantee, _templateId);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  ADMIN MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Transfer admin role. Only author can transfer.
     *         Set to address(0) to disable admin functionality.
     */
    function setAdmin(address _newAdmin) external onlyAuthor {
        address old = admin;
        admin = _newAdmin;
        emit AdminTransferred(old, _newAdmin);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  VIEWS
    // ══════════════════════════════════════════════════════════════════════

    function editionCount() external view returns (uint256) {
        return editions.length;
    }

    function licenseCount() external view returns (uint256) {
        return licenses.length;
    }

    function timelockCount() external view returns (uint256) {
        return timelockActions.length;
    }

    function genesis() external view returns (Edition memory) {
        return editions[0];
    }

    function latest() external view returns (Edition memory) {
        return editions[editions.length - 1];
    }

    function getEdition(uint256 _id) external view editionExists(_id) returns (Edition memory) {
        return editions[_id];
    }

    function getLicense(uint256 _id) external view returns (License memory) {
        require(_id < licenses.length, "PKv2: license does not exist");
        return licenses[_id];
    }

    function getEditionLicenses(uint256 _editionId) external view returns (uint256[] memory) {
        return editionLicenses[_editionId];
    }

    function getTimelockAction(uint256 _id) external view returns (TimelockAction memory) {
        require(_id < timelockActions.length, "PKv2: action does not exist");
        return timelockActions[_id];
    }

    /**
     * @notice Verify that an edition root has been anchored.
     */
    function isAnchored(bytes32 _editionRoot) external view returns (bool) {
        return anchoredRoots[_editionRoot];
    }

    /**
     * @notice Get the current canonical edition (O(1) via cache).
     */
    function canonicalEdition() external view returns (uint256 editionId, Edition memory edition) {
        require(hasCanonical, "PKv2: no canonical edition");
        return (canonicalEditionId, editions[canonicalEditionId]);
    }

    /**
     * @notice Get all Merkle roots for an edition.
     */
    function getEditionRoots(uint256 _editionId) external view editionExists(_editionId) returns (MerkleRoots memory) {
        return editions[_editionId].roots;
    }

    /**
     * @notice Verify an author signature off-chain without state changes.
     */
    function verifySignature(
        bytes32 _editionRoot,
        bytes calldata _signature
    ) external view returns (bool valid, address signer) {
        bytes32 ethSignedHash = ECDSA.toEthSignedMessageHash(_editionRoot);
        signer = ECDSA.recover(ethSignedHash, _signature);
        valid = (signer == author);
    }
}
