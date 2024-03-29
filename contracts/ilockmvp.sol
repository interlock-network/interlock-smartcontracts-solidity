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
        if(_transferCooldowns[from] >= block.timestamp) {
            revert InterlockTransferCooldown(from);
        }
        _;
    }

    function initialize(address initialOwner) public initializer {
        uint256 CAP = 1_000_000_000 ether;
        uint256 ARBITRUM_MINT = 700_000_000 ether;

        __ERC20_init("InterlockNetwork", "ILOCK");
        __ERC20Pausable_init();
        __ERC20Capped_init(CAP);
        __Ownable_init(initialOwner);

        _mint(address(this), ARBITRUM_MINT);
        _approve(address(this), initialOwner, CAP);
        _pause();
    }

    function treasuryApprove(address spender, uint256 value) public onlyOwner {
        _approve(address(this), spender, value);
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
        verifyCooldown(from)
        internal
        override(
            ERC20Upgradeable,
            ERC20PausableUpgradeable,
            ERC20CappedUpgradeable
        )
    {
        _evaluateCooldown(from, value);
        super._update(from, to, value);
    }

    function _evaluateCooldown(address from, uint256 value) private {
        if (value >= 7_000_000 ether && from != owner()) {
            _transferCooldowns[from] = block.timestamp + 1 days;
        }
    }

    /// @dev Gap for upgradeable storage. */
    /// v2 - reduced by 32 bytes for _transferCooldowns slot
    uint256[99] public __gap;
}
