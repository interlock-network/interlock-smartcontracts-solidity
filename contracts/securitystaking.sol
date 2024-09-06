// INTERLOCK NETWORK SECURITY STAKING SOLIDITY CONTRACT

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0

pragma solidity 0.8.20;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract ILSecurityStaking is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    EIP712Upgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    bytes32 private constant STAKE_TYPEHASH =
        keccak256("Stake(uint256 amount,bytes32 dataHash,bool isMalicious)");

    IERC20 public ilockToken;
    address public stakingPool;

    struct Stake {
        address staker;
        uint256 amount;
    }

    mapping(bytes32 => Stake) public stakesOnMalicious;
    mapping(bytes32 => Stake) public stakesOnNonMalicious;

    event StakedOnMalicious(
        address indexed staker,
        bytes32 indexed dataHash,
        uint256 amount
    );
    event StakedOnNonMalicious(
        address indexed staker,
        bytes32 indexed dataHash,
        uint256 amount
    );

    error ZeroStakeAmount();
    error UnauthorizedSigner();

    modifier onlyNotZeroStake(uint256 _amount) {
        if (_amount == 0) revert ZeroStakeAmount();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _ilockToken,
        address _stakingPool,
        address _admin
    ) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __EIP712_init("ILSecurityStaking", "1");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(SIGNER_ROLE, _admin);

        ilockToken = IERC20(_ilockToken);
        stakingPool = _stakingPool;
    }

    function getStake(
        bytes32 _dataHash,
        bool _isMalicious
    ) public view returns (Stake memory) {
        return
            _isMalicious
                ? stakesOnMalicious[_dataHash]
                : stakesOnNonMalicious[_dataHash];
    }

    function stakeOnMalicious(
        uint256 _amount,
        bytes32 _urlHash,
        bytes memory _signature
    ) external nonReentrant onlyNotZeroStake(_amount) {
        _verifySignature(_amount, _urlHash, true, _signature);
        _stake(_amount, _urlHash, true);
    }

    function stakeOnNonMalicious(
        uint256 _amount,
        bytes32 _dataHash,
        bytes memory _signature
    ) external nonReentrant onlyNotZeroStake(_amount) {
        _verifySignature(_amount, _dataHash, false, _signature);
        _stake(_amount, _dataHash, false);
    }

    function setStakingPool(
        address _newStakingPool
    ) external onlyRole(ADMIN_ROLE) {
        stakingPool = _newStakingPool;
    }

    function _stake(
        uint256 _amount,
        bytes32 _dataHash,
        bool _isMalicious
    ) private {
        ilockToken.safeTransferFrom(msg.sender, stakingPool, _amount);

        Stake memory newStake = Stake({staker: msg.sender, amount: _amount});

        if (_isMalicious) {
            stakesOnMalicious[_dataHash] = newStake;
            emit StakedOnMalicious(msg.sender, _dataHash, _amount);
        } else {
            stakesOnNonMalicious[_dataHash] = newStake;
            emit StakedOnNonMalicious(msg.sender, _dataHash, _amount);
        }
    }

    function _verifySignature(
        uint256 _amount,
        bytes32 _dataHash,
        bool _isMalicious,
        bytes memory _signature
    ) private view {
        bytes32 structHash = keccak256(
            abi.encode(STAKE_TYPEHASH, _amount, _dataHash, _isMalicious)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, _signature);

        if (!hasRole(SIGNER_ROLE, signer)) {
            revert UnauthorizedSigner();
        }
    }

    uint256[50] private __gap;
}
