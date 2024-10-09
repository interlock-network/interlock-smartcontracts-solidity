// INTERLOCK NETWORK SECURITY STAKING SOLIDITY CONTRACT

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0

pragma solidity 0.8.20;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract ILSecurityStaking is
    Initializable,
    AccessControlUpgradeable,
    EIP712Upgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    bytes32 private constant STAKE_TYPEHASH =
        keccak256(
            "Stake(uint256 amount,bytes32 urlHash,bool isMalicious,uint256 deadline)"
        );

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
        bytes32 indexed urlHash,
        uint256 amount
    );
    event StakedOnNonMalicious(
        address indexed staker,
        bytes32 indexed urlHash,
        uint256 amount
    );

    error ZeroStakeAmount();
    error UnauthorizedSigner();
    error SignatureExpired();

    modifier onlyNotZeroStake(uint256 _amount) {
        if (_amount == 0) revert ZeroStakeAmount();
        _;
    }

    modifier onlyBeforeDeadline(uint256 _deadline) {
        if (block.timestamp > _deadline) revert SignatureExpired();
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
        __EIP712_init("ILSecurityStaking", "1");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(SIGNER_ROLE, _admin);

        ilockToken = IERC20(_ilockToken);
        stakingPool = _stakingPool;
    }

    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view virtual returns (bytes32) {
        return _domainSeparatorV4();
    }

    function hashStakeData(
        uint256 _amount,
        bytes32 _urlHash,
        bool _isMalicious,
        uint256 _deadline
    ) external pure returns (bytes32) {
        return _hashStakeData(_amount, _urlHash, _isMalicious, _deadline);
    }

    function stakeOnMalicious(
        uint256 _amount,
        bytes32 _urlHash,
        uint256 _deadline,
        bytes calldata _signature
    ) external onlyNotZeroStake(_amount) onlyBeforeDeadline(_deadline) {
        _verifySignature(
            _hashStakeData(_amount, _urlHash, true, _deadline),
            _signature
        );
        _stake(_amount, _urlHash, true);
    }

    function stakeOnNonMalicious(
        uint256 _amount,
        bytes32 _urlHash,
        uint256 _deadline,
        bytes calldata _signature
    ) external onlyNotZeroStake(_amount) onlyBeforeDeadline(_deadline) {
        _verifySignature(
            _hashStakeData(_amount, _urlHash, false, _deadline),
            _signature
        );
        _stake(_amount, _urlHash, false);
    }

    function setStakingPool(
        address _newStakingPool
    ) external onlyRole(ADMIN_ROLE) {
        stakingPool = _newStakingPool;
    }

    function getStake(
        bytes32 _urlHash,
        bool _isMalicious
    ) public view returns (Stake memory) {
        return
            _isMalicious
                ? stakesOnMalicious[_urlHash]
                : stakesOnNonMalicious[_urlHash];
    }

    function _stake(
        uint256 _amount,
        bytes32 _urlHash,
        bool _isMalicious
    ) private {
        ilockToken.transferFrom(msg.sender, stakingPool, _amount);

        Stake memory newStake = Stake({staker: msg.sender, amount: _amount});

        if (_isMalicious) {
            stakesOnMalicious[_urlHash] = newStake;
            emit StakedOnMalicious(msg.sender, _urlHash, _amount);
        } else {
            stakesOnNonMalicious[_urlHash] = newStake;
            emit StakedOnNonMalicious(msg.sender, _urlHash, _amount);
        }
    }

    function _verifySignature(
        bytes32 structHash,
        bytes calldata _signature
    ) private view {
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, _signature);

        if (!hasRole(SIGNER_ROLE, signer)) {
            revert UnauthorizedSigner();
        }
    }

    function _hashStakeData(
        uint256 _amount,
        bytes32 _urlHash,
        bool _isMalicious,
        uint256 _deadline
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    STAKE_TYPEHASH,
                    _amount,
                    _urlHash,
                    _isMalicious,
                    _deadline
                )
            );
    }

    uint256[50] private __gap;
}
