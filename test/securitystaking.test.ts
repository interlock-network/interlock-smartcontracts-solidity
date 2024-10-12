import { deployProxy } from '../scripts/utils'
import hre, { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { ILSecurityStaking, InterlockNetwork } from '../typechain-types'
import { expect } from 'chai'
import { ilockSettings, securityStakingSettings } from './constants'
import { securityStakingTypes, signStakeMessage } from './utils'
import { time } from '@nomicfoundation/hardhat-network-helpers'

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
  let securityStakingDomain: ReturnType<typeof getEIP712Domain>
  let deadline: number

  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE'))
  const SIGNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SIGNER_ROLE'))
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('UPGRADER_ROLE'))
  const STAKE_AMOUNT = ethers.parseEther('10')

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

    securityStakingDomain = getEIP712Domain(await securityStaking.getAddress())

    // Mint some tokens to the staker
    await ilockToken.connect(initialOwner).mint(staker.address, ethers.parseEther('1000'))
    await ilockToken.connect(staker).approve(await securityStaking.getAddress(), ethers.parseEther('100000'))

    // Grant the signer the SIGNER_ROLE
    await securityStaking.connect(initialOwner).grantRole(SIGNER_ROLE, signer.address)
  })

  // Snapshot and revert blockchain state before and after each test
  beforeEach(async () => {
    snapshot = await ethers.provider.send('evm_snapshot', [])
    deadline = (await time.latest()) + 3600 // 1 hour from now
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshot])
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
      expect(await securityStaking.hasRole(SIGNER_ROLE, signer.address)).to.be.true
      expect(await securityStaking.hasRole(UPGRADER_ROLE, initialOwner.address)).to.be.true
    })

    it('should return the correct DOMAIN_SEPARATOR', async function () {
      const expectedDomainSeparator = ethers.TypedDataEncoder.hashDomain(securityStakingDomain)
      const actualDomainSeparator = await securityStaking.DOMAIN_SEPARATOR()
      expect(actualDomainSeparator).to.equal(expectedDomainSeparator)
    })
  })

  context('Staking functionality', async function () {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('test data'))

    it('should allow staking on malicious data', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        nonce,
        deadline
      )
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature))
        .to.emit(securityStaking, 'StakedOnMalicious')
        .withArgs(staker.address, dataHash, nonce, STAKE_AMOUNT)
    })

    it('should allow staking on non-malicious data', async function () {
      const nonce = await securityStaking.getNonce(dataHash, false)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        false,
        nonce,
        deadline
      )
      await expect(
        securityStaking.connect(staker).stakeOnNonMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature)
      )
        .to.emit(securityStaking, 'StakedOnNonMalicious')
        .withArgs(staker.address, dataHash, nonce, STAKE_AMOUNT)
    })

    it('should emit correct events when staking', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        nonce,
        deadline
      )
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature))
        .to.emit(securityStaking, 'StakedOnMalicious')
        .withArgs(staker.address, dataHash, nonce, STAKE_AMOUNT)
    })

    it('should record stake correctly', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        nonce,
        deadline
      )
      await securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature)

      const stake = await securityStaking.getStake(dataHash, true)
      expect(stake.staker).to.equal(staker.address)
      expect(stake.amount).to.equal(STAKE_AMOUNT)
    })

    it('should reject expired signatures', async function () {
      const expiredDeadline = (await time.latest()) - 3600 // 1 hour ago
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        nonce,
        expiredDeadline
      )
      await expect(
        securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, expiredDeadline, signature)
      ).to.be.revertedWithCustomError(securityStaking, 'SignatureExpired')
    })

    it('should revert when staking with zero amount', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(signer, securityStakingDomain, 0n, dataHash, true, nonce, deadline)
      await expect(
        securityStaking.connect(staker).stakeOnMalicious(0, dataHash, nonce, deadline, signature)
      ).to.be.revertedWithCustomError(securityStaking, 'ZeroStakeAmount')
    })

    it('should allow staking on malicious data with correct nonce', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        nonce,
        deadline
      )
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature))
        .to.emit(securityStaking, 'StakedOnMalicious')
        .withArgs(staker.address, dataHash, nonce, STAKE_AMOUNT)
    })

    it('should allow staking on non-malicious data with correct nonce', async function () {
      const nonce = await securityStaking.getNonce(dataHash, false)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        false,
        nonce,
        deadline
      )
      await expect(
        securityStaking.connect(staker).stakeOnNonMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature)
      )
        .to.emit(securityStaking, 'StakedOnNonMalicious')
        .withArgs(staker.address, dataHash, nonce, STAKE_AMOUNT)
    })

    it('should reject staking with incorrect nonce', async function () {
      const correctNonce = await securityStaking.getNonce(dataHash, true)
      const incorrectNonce = correctNonce + 1n
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        incorrectNonce,
        deadline
      )
      await expect(
        securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, incorrectNonce, deadline, signature)
      ).to.be.revertedWithCustomError(securityStaking, 'InvalidNonce')
    })

    it('should increment nonce after successful stake', async function () {
      const initialNonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        initialNonce,
        deadline
      )
      await securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, initialNonce, deadline, signature)
      const newNonce = await securityStaking.getNonce(dataHash, true)
      expect(newNonce).to.equal(initialNonce + 1n)
    })
  })

  context('Signature verification', async function () {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('test data'))

    it('should accept valid signatures', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        nonce,
        deadline
      )
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature))
        .to.not.be.reverted
    })

    it('should reject invalid signatures', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const invalidSignature = ethers.hexlify(ethers.randomBytes(65))
      await expect(
        securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, invalidSignature)
      ).to.be.reverted
    })

    it('should reject signatures from non-authorized signers', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await staker.signTypedData(securityStakingDomain, securityStakingTypes, {
        amount: STAKE_AMOUNT,
        dataHash,
        isMalicious: true,
        deadline,
        nonce
      })
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature))
        .to.be.reverted
    })

    it('should accept valid signatures with correct nonce', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      const signature = await signStakeMessage(
        signer,
        securityStakingDomain,
        STAKE_AMOUNT,
        dataHash,
        true,
        nonce,
        deadline
      )
      await expect(securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature))
        .to.not.be.reverted
    })
  })

  context('Nonce functionality', async function () {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes('test data'))

    it('should return correct initial nonce', async function () {
      const nonce = await securityStaking.getNonce(dataHash, true)
      expect(nonce).to.equal(1)
    })

    it('should return correct nonce after multiple stakes', async function () {
      for (let i = 1; i <= 3; i++) {
        const nonce = await securityStaking.getNonce(dataHash, true)
        expect(nonce).to.equal(i)
        const signature = await signStakeMessage(
          signer,
          securityStakingDomain,
          STAKE_AMOUNT,
          dataHash,
          true,
          nonce,
          deadline
        )
        await securityStaking.connect(staker).stakeOnMalicious(STAKE_AMOUNT, dataHash, nonce, deadline, signature)
      }
      const finalNonce = await securityStaking.getNonce(dataHash, true)
      expect(finalNonce).to.equal(4)
    })
  })

  context('Admin functions', async function () {
    it('should allow setting a new staking pool', async function () {
      const newStakingPool = defaultAdmin.address
      await securityStaking.connect(initialOwner).setStakingPool(newStakingPool)
      expect(await securityStaking.stakingPool()).to.equal(newStakingPool)
    })
  })
})
