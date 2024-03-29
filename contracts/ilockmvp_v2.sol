// INTERLOCK NETWORK ILOCK SOLIDITY CONTRACT
// Version v2

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0

pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract InterlockNetwork is
    Initializable,
    ERC20Upgradeable,
    ERC20PausableUpgradeable,
    ERC20CappedUpgradeable,
    OwnableUpgradeable
{
    uint256 public transferCooldownDuration;
    uint256 public transferCooldownThreshold;
    mapping(address => uint256) private _transferCooldowns;

    /**
     * @dev Emitted when a transfer is attempted while the sender is on cooldown.
     */
    error InterlockTransferCooldown(address receiver);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    modifier verifyCooldown(address from) {
        if (_transferCooldowns[from] >= block.timestamp) {
            revert InterlockTransferCooldown(from);
        }
        _;
    }

    function initialize(address initialOwner) public initializer {
        uint256 CAP = 1_000_000_000 ether;
        uint256 ARBITRUM_MINT = 700_000_000 ether;
        uint256 INITIAL_COOLDOWN_DURATION = 1 days;
        uint256 INITIAL_COOLDOWN_THRESHOLD = 7_000_000 ether;

        __ERC20_init("InterlockNetwork", "ILOCK");
        __ERC20Pausable_init();
        __ERC20Capped_init(CAP);
        __Ownable_init(initialOwner);

        _mint(address(this), ARBITRUM_MINT);
        _approve(address(this), initialOwner, CAP);
        _pause();

        transferCooldownDuration = INITIAL_COOLDOWN_DURATION;
        transferCooldownThreshold = INITIAL_COOLDOWN_THRESHOLD;
    }

    function treasuryApprove(address spender, uint256 value) public onlyOwner {
        _approve(address(this), spender, value);
    }

    function setUpCooldown(
        uint256 duration,
        uint256 threshold
    ) public onlyOwner {
        transferCooldownDuration = duration;
        transferCooldownThreshold = threshold;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(
        address from,
        address to,
        uint256 value
    )
        internal
        override(
            ERC20Upgradeable,
            ERC20PausableUpgradeable,
            ERC20CappedUpgradeable
        )
        verifyCooldown(from)
    {
        _evaluateCooldown(from, value);
        super._update(from, to, value);
    }

    function _evaluateCooldown(address from, uint256 value) private {
        uint256 cooldown = transferCooldownDuration;
        uint256 threshold = transferCooldownThreshold;
        if (
            cooldown > 0 &&
            threshold > 0 &&
            value >= threshold &&
            from != owner() &&
            from != address(this)
        ) {
            _transferCooldowns[from] = block.timestamp + cooldown;
        }
    }

    /// @dev Gap for upgradeable storage. */
    /// v2 - minus 32 bytes for transferCooldownDuration slot
    /// v2 - minus 32 bytes for transferCooldownThreshold slot
    /// v2 - minus 32 bytes for _transferCooldowns slot
    uint256[97] public __gap;
}
