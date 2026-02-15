// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RoyaltyRouter
 * @author Kevan Burns (Kidd James) / FTH Trading
 * @notice Literary Protocol Standard v1 (LPS-1) - Programmable Revenue Splits
 *
 * Accepts incoming funds and distributes them according to configurable
 * percentage splits. Supports:
 *   - Multiple payees (author, illustrator, editor, protocol treasury)
 *   - Recoupment waterfall (advance recovery before standard splits)
 *   - Edition-linked splits (different editions can have different terms)
 *   - Pull-based withdrawal pattern for gas efficiency
 *   - Emergency sweep by owner
 *
 * Designed to be deployed per-edition or per-license and referenced
 * by PublishingKernel's license registry.
 *
 * @dev Author Identity
 *      Real name:  Kevan Burns
 *      Nickname:   Burnzy
 *      Pseudonym:  Kidd James (pen name)
 *      Org:        FTH Trading
 *      Wallet:     0xC91668184736BF75C4ecE37473D694efb2A43978
 *      Domain:     unykorn.org
 */
contract RoyaltyRouter {

    // ══════════════════════════════════════════════════════════════════════
    //  STRUCTS
    // ══════════════════════════════════════════════════════════════════════

    struct Payee {
        address payable wallet;
        string  role;            // "author", "illustrator", "editor", "treasury"
        uint256 basisPoints;     // share in basis points (100 = 1%, 10000 = 100%)
        bool    active;
    }

    struct Recoupment {
        address payable recipient;   // who gets recouped (e.g., publisher who paid advance)
        uint256 totalOwed;           // total advance to recoup
        uint256 recouped;            // amount already recouped
        uint256 recoupBasisPoints;   // % of incoming funds directed to recoupment (e.g., 7000 = 70%)
        bool    completed;           // true when totalOwed fully recouped
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════════════════════════════════

    address public immutable owner;      // the author / deployer
    string  public editionRef;           // human-readable reference (e.g., "edition-2")

    Payee[] public payees;
    Recoupment public recoupment;
    bool public hasRecoupment;

    // Pull-based balances
    mapping(address => uint256) public balances;

    uint256 public totalReceived;
    uint256 public totalDistributed;
    uint256 public totalWithdrawn;

    // ══════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════════════════════════════════

    event FundsReceived(address indexed from, uint256 amount, uint256 timestamp);
    event FundsDistributed(uint256 amount, uint256 timestamp);
    event RecoupmentPayment(address indexed recipient, uint256 amount, uint256 remaining);
    event RecoupmentCompleted(address indexed recipient, uint256 totalRecouped);
    event PayeeAdded(address indexed wallet, string role, uint256 basisPoints);
    event PayeeRemoved(address indexed wallet);
    event Withdrawal(address indexed payee, uint256 amount);
    event EmergencySweep(address indexed to, uint256 amount);

    // ══════════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "RoyaltyRouter: caller is not the owner");
        _;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Deploy a RoyaltyRouter with initial payees.
     * @param _editionRef     Human-readable edition reference
     * @param _wallets        Array of payee wallet addresses
     * @param _roles          Array of payee role strings
     * @param _basisPoints    Array of basis point shares (must sum to 10000)
     */
    constructor(
        string memory _editionRef,
        address payable[] memory _wallets,
        string[] memory _roles,
        uint256[] memory _basisPoints
    ) {
        require(_wallets.length == _roles.length && _roles.length == _basisPoints.length,
            "RoyaltyRouter: array length mismatch");

        owner = msg.sender;
        editionRef = _editionRef;

        uint256 totalBps = 0;
        for (uint256 i = 0; i < _wallets.length; i++) {
            require(_wallets[i] != address(0), "RoyaltyRouter: zero address");
            require(_basisPoints[i] > 0, "RoyaltyRouter: zero basis points");

            payees.push(Payee({
                wallet: _wallets[i],
                role: _roles[i],
                basisPoints: _basisPoints[i],
                active: true
            }));

            totalBps += _basisPoints[i];
            emit PayeeAdded(_wallets[i], _roles[i], _basisPoints[i]);
        }

        require(totalBps == 10000, "RoyaltyRouter: basis points must sum to 10000");
    }

    // ══════════════════════════════════════════════════════════════════════
    //  RECEIVE / DISTRIBUTE
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Accept incoming funds and distribute immediately to balances.
     */
    receive() external payable {
        require(msg.value > 0, "RoyaltyRouter: zero value");
        totalReceived += msg.value;
        emit FundsReceived(msg.sender, msg.value, block.timestamp);
        _distribute(msg.value);
    }

    /**
     * @notice Explicit deposit function (same as receive).
     */
    function deposit() external payable {
        require(msg.value > 0, "RoyaltyRouter: zero value");
        totalReceived += msg.value;
        emit FundsReceived(msg.sender, msg.value, block.timestamp);
        _distribute(msg.value);
    }

    /**
     * @notice Internal distribution logic with recoupment waterfall.
     */
    function _distribute(uint256 amount) internal {
        uint256 distributable = amount;

        // ── Phase 1: Recoupment waterfall ──────────────────────────────
        if (hasRecoupment && !recoupment.completed) {
            uint256 recoupShare = (amount * recoupment.recoupBasisPoints) / 10000;
            uint256 remaining = recoupment.totalOwed - recoupment.recouped;

            if (recoupShare >= remaining) {
                // Final recoupment payment
                recoupShare = remaining;
                recoupment.recouped = recoupment.totalOwed;
                recoupment.completed = true;
                emit RecoupmentCompleted(recoupment.recipient, recoupment.totalOwed);
            } else {
                recoupment.recouped += recoupShare;
            }

            balances[recoupment.recipient] += recoupShare;
            distributable -= recoupShare;
            emit RecoupmentPayment(recoupment.recipient, recoupShare,
                recoupment.totalOwed - recoupment.recouped);
        }

        // ── Phase 2: Standard splits on remaining amount ───────────────
        if (distributable > 0) {
            uint256 distributed = 0;
            for (uint256 i = 0; i < payees.length; i++) {
                if (!payees[i].active) continue;

                uint256 share;
                if (i == payees.length - 1) {
                    // Last payee gets remainder to avoid dust
                    share = distributable - distributed;
                } else {
                    share = (distributable * payees[i].basisPoints) / 10000;
                }

                balances[payees[i].wallet] += share;
                distributed += share;
            }
        }

        totalDistributed += amount;
        emit FundsDistributed(amount, block.timestamp);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  WITHDRAWAL (Pull pattern)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Withdraw accumulated balance.
     */
    function withdraw() external {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "RoyaltyRouter: no balance");

        balances[msg.sender] = 0;
        totalWithdrawn += amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "RoyaltyRouter: transfer failed");

        emit Withdrawal(msg.sender, amount);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  RECOUPMENT MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Set up a recoupment waterfall (advance recovery).
     * @param _recipient       Who receives the recoupment payments
     * @param _totalOwed       Total advance amount to recover
     * @param _recoupBasisPoints  % of each incoming payment for recoupment (e.g., 7000 = 70%)
     */
    function setRecoupment(
        address payable _recipient,
        uint256 _totalOwed,
        uint256 _recoupBasisPoints
    ) external onlyOwner {
        require(!hasRecoupment || recoupment.completed,
            "RoyaltyRouter: active recoupment exists");
        require(_recipient != address(0), "RoyaltyRouter: zero address");
        require(_totalOwed > 0, "RoyaltyRouter: zero owed");
        require(_recoupBasisPoints > 0 && _recoupBasisPoints <= 10000,
            "RoyaltyRouter: invalid basis points");

        recoupment = Recoupment({
            recipient: _recipient,
            totalOwed: _totalOwed,
            recouped: 0,
            recoupBasisPoints: _recoupBasisPoints,
            completed: false
        });
        hasRecoupment = true;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  PAYEE MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Deactivate a payee (sets active = false, does not remove).
     */
    function deactivatePayee(uint256 _index) external onlyOwner {
        require(_index < payees.length, "RoyaltyRouter: invalid index");
        require(payees[_index].active, "RoyaltyRouter: already inactive");
        payees[_index].active = false;
        emit PayeeRemoved(payees[_index].wallet);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  EMERGENCY
    // ══════════════════════════════════════════════════════════════════════

    /**
     * @notice Emergency sweep of all contract funds to owner.
     *         Only use if the contract is in an unrecoverable state.
     */
    function emergencySweep() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "RoyaltyRouter: no balance");

        (bool success, ) = payable(owner).call{value: bal}("");
        require(success, "RoyaltyRouter: sweep failed");

        emit EmergencySweep(owner, bal);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  VIEWS
    // ══════════════════════════════════════════════════════════════════════

    function payeeCount() external view returns (uint256) {
        return payees.length;
    }

    function getPayee(uint256 _index) external view returns (Payee memory) {
        require(_index < payees.length, "RoyaltyRouter: invalid index");
        return payees[_index];
    }

    function getRecoupment() external view returns (Recoupment memory) {
        return recoupment;
    }

    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
