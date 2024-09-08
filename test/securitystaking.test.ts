import { deployProxy } from '../scripts/utils'
import hre, { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ILSecurityStaking, InterlockNetwork } from '../typechain-types'
import { expect } from 'chai'
import { ilockSettings, securityStakingSettings } from './constants'
import { signStakeMessage } from './utils'

const contractName = securityStakingSettings.name

const getEIP712Domain = (verifyingContract: string) => ({
  name: securityStakingSettings.name,
  version: securityStakingSettings.version,
  chainId: hre.network.config.chainId,
  verifyingContract
})

describe(`${contractName}`, () => {
  let ilock: InterlockNetwork
  let securityStaking: ILSecurityStaking
  let deployer: SignerWithAddress
  let initialOwner: SignerWithAddress
  let defaultAdmin: SignerWithAddress
  let signer: SignerWithAddress
  let staker: SignerWithAddress

  let snapshot: number
  let securtyStakingDomain: ReturnType<typeof getEIP712Domain>

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE'))
  const SIGNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SIGNER_ROLE'))
  const STAKE_AMOUNT = ethers.parseEther('100')

  let ilockToken: any
  let stakingPool: SignerWithAddress

  before(async () => {
    ;[deployer, initialOwner, defaultAdmin, signer, staker, stakingPool] = await ethers.getSigners()
    ilock = await deployProxy(ilockSettings.name, deployer, [initialOwner.address])
    ilockToken = await ethers.getContractAt('InterlockNetwork', await ilock.getAddress())
    securityStaking = await deployProxy(contractName, deployer, [
      await ilockToken.getAddress(),
      stakingPool.address,
      initialOwner.address
    ])

    securtyStakingDomain = getEIP712Domain(await securityStaking.getAddress())

    // Mint some tokens to the staker
    await ilockToken.connect(initialOwner).mint(staker.address, ethers.parseEther('1000'))
    await ilockToken.connect(staker).approve(await securityStaking.getAddress(), ethers.parseEther('1000'))
  })

  // Snapshot and revert blockchain state before and after each test
  beforeEach(async () => {
    snapshot = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshot])
  })

  context('Initial settings', async function () {
    it('should have DEFAULT_ADMIN role', async function () {
      expect(await securityStaking.hasRole(await securityStaking.DEFAULT_ADMIN_ROLE(), initialOwner.address)).to.equal(
        true
      )
    })
  })

  context('Initialization', async function () {
    it('should initialize with correct parameters', async function () {
      expect(await securityStaking.ilockToken()).to.equal(await ilockToken.getAddress())
      expect(await securityStaking.stakingPool()).to.equal(stakingPool.address)
    })

    it('should assign admin roles correctly', async function () {
      expect(await securityStaking.hasRole(await securityStaking.DEFAULT_ADMIN_ROLE(), initialOwner.address)).to.be.true
      expect(await securityStaking.hasRole(ADMIN_ROLE, initialOwner.address)).to.be.true
      expect(await securityStaking.hasRole(SIGNER_ROLE, initialOwner.address)).to.be.true
    })
  })

  context('Staking functionality', async function () {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('test data'))

    it('should allow staking on malicious data', async function () {
      const signature = await signStakeMessage(initialOwner, STAKE_AMOUNT, dataHash, true, securtyStakingDomain)
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, signature))
        .to.emit(securityStaking, 'StakedOnMalicious')
        .withArgs(staker.address, dataHash, STAKE_AMOUNT)
    })

    it('should allow staking on non-malicious data', async function () {
      const signature = await signStakeMessage(initialOwner, STAKE_AMOUNT, dataHash, false, securtyStakingDomain)
      await expect(securityStaking.connect(staker).stakeOnNonMalicious(STAKE_AMOUNT, dataHash, signature))
        .to.emit(securityStaking, 'StakedOnNonMalicious')
        .withArgs(staker.address, dataHash, STAKE_AMOUNT)
    })

    it('should emit correct events when staking', async function () {
      const signature = await signStakeMessage(initialOwner, STAKE_AMOUNT, dataHash, true, securtyStakingDomain)
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, signature))
        .to.emit(securityStaking, 'StakedOnMalicious')
        .withArgs(staker.address, dataHash, STAKE_AMOUNT)
    })

    it('should record stake correctly', async function () {
      const signature = await signStakeMessage(initialOwner, STAKE_AMOUNT, dataHash, true, securtyStakingDomain)
      await securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, signature)

      const stake = await securityStaking.getStake(dataHash, true)
      expect(stake.staker).to.equal(staker.address)
      expect(stake.amount).to.equal(STAKE_AMOUNT)
    })
  })

  context('Signature verification', async function () {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('test data'))

    it('should accept valid signatures', async function () {
      const signature = await initialOwner.signTypedData(
        securtyStakingDomain,
        {
          Stake: [
            { name: 'amount', type: 'uint256' },
            { name: 'dataHash', type: 'bytes32' },
            { name: 'isMalicious', type: 'bool' }
          ]
        },
        { amount: STAKE_AMOUNT, dataHash, isMalicious: true }
      )
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, signature)).to.not.be
        .reverted
    })

    it('should reject invalid signatures', async function () {
      const invalidSignature = ethers.hexlify(ethers.randomBytes(65))
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, invalidSignature)).to.be
        .reverted
    })

    it('should reject signatures from non-authorized signers', async function () {
      const signature = await staker.signTypedData(
        securtyStakingDomain,
        {
          Stake: [
            { name: 'amount', type: 'uint256' },
            { name: 'dataHash', type: 'bytes32' },
            { name: 'isMalicious', type: 'bool' }
          ]
        },
        { amount: STAKE_AMOUNT, dataHash, isMalicious: true }
      )
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, signature)).to.be.reverted
    })
  })

  context('Admin functions', async function () {
    it('should allow setting a new staking pool', async function () {
      const newStakingPool = defaultAdmin.address
      await securityStaking.connect(initialOwner).setStakingPool(newStakingPool)
      expect(await securityStaking.stakingPool()).to.equal(newStakingPool)
    })
  })

  context('Error cases', async function () {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('malicious.com'))

    it('should revert when staking with zero amount', async function () {
      const signature = await initialOwner.signTypedData(
        securtyStakingDomain,
        {
          Stake: [
            { name: 'amount', type: 'uint256' },
            { name: 'dataHash', type: 'bytes32' },
            { name: 'isMalicious', type: 'bool' }
          ]
        },
        { amount: 0, dataHash, isMalicious: true }
      )
      await expect(
        securityStaking.connect(staker).stakeOnMalicious(0, dataHash, signature)
      ).to.be.revertedWithCustomError(securityStaking, 'ZeroStakeAmount')
    })
  })
})
