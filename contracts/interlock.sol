// INTERLOCK NETWORK ILOCK SOLIDITY CONTRACT
// Version v2

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0

pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract InterlockNetwork is
    Initializable,
    ERC20Upgradeable,
    ERC20CappedUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    ERC20PermitUpgradeable
{
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

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

    function initialize(address owner) public initializer {
        __ERC20_init("InterlockNetwork", "ILOCK");
        __ERC20Capped_init(1_000_000_000 ether);
        __ERC20Pausable_init();
        __AccessControl_init();
        __ERC20Permit_init("InterlockNetwork");

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(BURNER_ROLE, owner);

        transferCooldownDuration = 1 days;
        transferCooldownThreshold = 7_000_000 ether;
    }

    modifier verifyCooldown(address from) {
        if (_transferCooldowns[from] >= block.timestamp) {
            revert InterlockTransferCooldown(from);
        }
        _;
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setUpCooldown(
        uint256 duration,
        uint256 threshold
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        transferCooldownDuration = duration;
        transferCooldownThreshold = threshold;
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address from,
        address to,
        uint256 value
    )
        internal
        override(
            ERC20CappedUpgradeable,
            ERC20Upgradeable,
            ERC20PausableUpgradeable
        )
        verifyCooldown(from)
    {
        if (from != address(0) && to != address(0) && !hasRole(DEFAULT_ADMIN_ROLE, from)) {
            _evaluateCooldown(from, value);
        }
        super._update(from, to, value);
    }

    function _evaluateCooldown(address from, uint256 value) private {
        uint256 cooldown = transferCooldownDuration;
        uint256 threshold = transferCooldownThreshold;
        if (
            cooldown > 0 &&
            threshold > 0 &&
            value >= threshold
        ) {
            _transferCooldowns[from] = block.timestamp + cooldown;
        }
    }

    uint256[100] public __gap;
}
