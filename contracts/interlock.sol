// INTERLOCK NETWORK ILOCK SOLIDITY CONTRACT

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0

pragma solidity ^0.8.21;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IAntiBot.sol";

contract InterlockNetwork is
    Initializable,
    ERC20Upgradeable,
    ERC20CappedUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    ERC20PermitUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant COOLDOWN_WHITELISTED =
        keccak256("COOLDOWN_WHITELISTED");

    uint256 public transferCooldownDuration;
    uint256 public transferCooldownThreshold;
    mapping(address => uint256) private _transferCooldownExpiry;

    address public antiBotProtector;

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
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(COOLDOWN_WHITELISTED, owner);

        transferCooldownDuration = 1 days;
        transferCooldownThreshold = 10_000_000 ether;
    }

    modifier verifyCooldown(address from) {
        if (_transferCooldownExpiry[from] >= block.timestamp) {
            revert InterlockTransferCooldown(from);
        }
        _;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setUpCooldown(
        uint256 duration,
        uint256 threshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transferCooldownDuration = duration;
        transferCooldownThreshold = threshold;
    }

    function setAntiBotProtector(
        address _antiBotProtector
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        antiBotProtector = _antiBotProtector;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 value) public returns (bool) {
        address owner = _msgSender();
        _burn(owner, value);
        return true;
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
        if (
            from != address(0) &&
            to != address(0) &&
            !hasRole(COOLDOWN_WHITELISTED, from)
        ) {
            _evaluateCooldown(from, value);
        }

        if (antiBotProtector != address(0)) {
            IAntiBot(antiBotProtector).onPreTransferCheck(
                _msgSender(),
                from,
                to,
                value
            );
        }

        super._update(from, to, value);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    function _evaluateCooldown(address from, uint256 value) private {
        uint256 cooldown = transferCooldownDuration;
        if (cooldown == 0) {
            return;
        }
        uint256 threshold = transferCooldownThreshold;
        if (threshold > 0 && value >= threshold) {
            _transferCooldownExpiry[from] = block.timestamp + cooldown;
        }
    }

    uint256[100] public __gap;
}
