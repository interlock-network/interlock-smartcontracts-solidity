import { deployProxy } from '../scripts/utils'
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { InterlockNetwork } from '../typechain-types'
import { expect } from 'chai'
import { ilockSettings } from './constants'

const contractName = 'InterlockNetwork'

describe(`${contractName}`, () => {
  let ilock: InterlockNetwork
  let deployer: SignerWithAddress
  let initialOwner: SignerWithAddress
  let pauser: SignerWithAddress
  let minter: SignerWithAddress
  let burner: SignerWithAddress
  let testAccount: SignerWithAddress
  let snapshot: number

  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('PAUSER_ROLE'))
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('BURNER_ROLE'))

  before(async () => {
    ;[deployer, initialOwner, pauser, minter, burner, testAccount] = await ethers.getSigners()
    ilock = await deployProxy(contractName, deployer, [initialOwner.address])
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
      expect(await ilock.hasRole(await ilock.DEFAULT_ADMIN_ROLE(), initialOwner.address)).to.equal(true)
    })

    it('should have PAUSER role', async function () {
      expect(await ilock.hasRole(PAUSER_ROLE, initialOwner.address)).to.equal(true)
    })

    it('should have MINTER role', async function () {
      expect(await ilock.hasRole(MINTER_ROLE, initialOwner.address)).to.equal(true)
    })

    it('should have BURNER role', async function () {
      expect(await ilock.hasRole(BURNER_ROLE, initialOwner.address)).to.equal(true)
    })

    it('should have the correct name', async function () {
      expect(await ilock.name()).to.equal(ilockSettings.name)
    })

    it('should have the correct symbol', async function () {
      expect(await ilock.symbol()).to.equal(ilockSettings.symbol)
    })

    it('should have the correct decimals', async function () {
      expect(await ilock.decimals()).to.equal(ilockSettings.decimals)
    })

    it('should have the correct total supply', async function () {
      expect(await ilock.totalSupply()).to.equal(ilockSettings.initialSupply)
    })

    it('should have the correct cap', async function () {
      expect(await ilock.cap()).to.equal(ilockSettings.cap)
    })

    it('should not be paused', async function () {
      expect(await ilock.paused()).to.equal(false)
    })

    it('should have the correct cooldown duration', async function () {
      expect(await ilock.transferCooldownDuration()).to.be.equal(ilockSettings.cooldownDuration)
    })

    it('should have the correct cooldown threshold', async function () {
      expect(await ilock.transferCooldownThreshold()).to.be.equal(ilockSettings.cooldownThreshold)
    })
  })

  context('Minting', async function () {
    beforeEach(async () => {
      await ilock.connect(initialOwner).grantRole(MINTER_ROLE, minter.address)
    })

    it('should mint', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(minter).mint(testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(amount)
    })

    it('should revert mint if not the minter', async function () {
      const amount = ethers.parseEther('1')
      await expect(ilock.connect(testAccount).mint(testAccount.address, amount))
        .to.be.revertedWithCustomError(ilock, 'AccessControlUnauthorizedAccount')
        .withArgs(testAccount.address, MINTER_ROLE)
    })

    it('should revert mint if supply exceeds cap', async function () {
      const amount = ilockSettings.cap + BigInt(1)
      await expect(ilock.connect(minter).mint(testAccount.address, amount))
        .to.be.revertedWithCustomError(ilock, 'ERC20ExceededCap')
        .withArgs(amount, ilockSettings.cap)
    })
  })

  context('Burning', async function () {
    beforeEach(async () => {
      await ilock.connect(initialOwner).grantRole(BURNER_ROLE, burner.address)
      await ilock.connect(initialOwner).mint(testAccount.address, ethers.parseEther('100'))
    })

    it('should burn', async function () {
      const initialBalance = await ilock.balanceOf(testAccount.address)
      const amount = ethers.parseEther('1')
      await ilock.connect(burner).burn(testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(initialBalance - amount)
    })

    it('should revert burn if not the burner', async function () {
      const amount = ethers.parseEther('1')
      await expect(ilock.connect(testAccount).burn(testAccount.address, amount))
        .to.be.revertedWithCustomError(ilock, 'AccessControlUnauthorizedAccount')
        .withArgs(testAccount.address, BURNER_ROLE)
    })

    it('should revert burn if not enough balance', async function () {
      const initialBalance = await ilock.balanceOf(testAccount.address)
      const amount = initialBalance + BigInt(1)
      await expect(ilock.connect(burner).burn(testAccount.address, amount))
        .to.be.revertedWithCustomError(ilock, 'ERC20InsufficientBalance')
        .withArgs(testAccount.address, initialBalance, amount)
    })
  })

  // context('Ownership', async function () {
  //   it('should transfer ownership', async function () {
  //     await ilock.connect(initialOwner).transferOwnership(testAccount.address)
  //     expect(await ilock.owner()).to.equal(testAccount.address)
  //   })
  //
  //   it('should renounce ownership', async function () {
  //     await ilock.connect(initialOwner).renounceOwnership()
  //     expect(await ilock.owner()).to.equal(ethers.ZeroAddress)
  //   })
  //
  //   it('should revert transfer ownership if not the owner', async function () {
  //     await expect(ilock.connect(testAccount).renounceOwnership()).to.be.revertedWithCustomError(
  //       ilock,
  //       'OwnableUnauthorizedAccount'
  //     )
  //   })
  // })

  context('Pausing', async function () {
    beforeEach(async () => {
      await ilock.connect(initialOwner).grantRole(PAUSER_ROLE, pauser.address)
      await ilock.connect(initialOwner).grantRole(MINTER_ROLE, minter.address)
      await ilock.connect(minter).mint(initialOwner.address, ethers.parseEther('100'))
      await ilock.connect(minter).mint(minter.address, ethers.parseEther('100'))
      await ilock.connect(minter).approve(initialOwner.address, ethers.parseEther('100'))
    })

    it('should unpause', async function () {
      await ilock.connect(pauser).pause()
      await ilock.connect(pauser).unpause()
      expect(await ilock.paused()).to.equal(false)
    })

    it('should pause', async function () {
      await ilock.connect(pauser).pause()
      expect(await ilock.paused()).to.equal(true)
    })

    it('should transfer if not paused', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).transfer(testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(amount)
    })

    it('should transferFrom if not paused', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).transferFrom(minter.address, testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(amount)
    })

    it('should revert pause if not the pauser', async function () {
      await expect(ilock.connect(testAccount).pause())
        .to.be.revertedWithCustomError(ilock, 'AccessControlUnauthorizedAccount')
        .withArgs(testAccount.address, PAUSER_ROLE)
    })

    it('should revert unpause if not the pauser', async function () {
      await expect(ilock.connect(testAccount).unpause())
        .to.be.revertedWithCustomError(ilock, 'AccessControlUnauthorizedAccount')
        .withArgs(testAccount.address, PAUSER_ROLE)
    })

    it('should revert transferFrom if paused', async function () {
      await ilock.connect(minter).mint(initialOwner.address, ethers.parseEther('100'))
      await ilock.connect(pauser).pause()
      const amount = ethers.parseEther('1')
      await expect(
        ilock.connect(initialOwner).transferFrom(minter.address, testAccount.address, amount)
      ).to.be.revertedWithCustomError(ilock, 'EnforcedPause')
    })

    it('should revert transfer if paused', async function () {
      await ilock.connect(pauser).pause()
      const amount = ethers.parseEther('1')
      await expect(ilock.connect(initialOwner).transfer(testAccount.address, amount)).to.be.revertedWithCustomError(
        ilock,
        'EnforcedPause'
      )
    })
  })

  context('Transfer', async function () {
    beforeEach(async function () {
      await ilock.connect(initialOwner).mint(initialOwner.address, ethers.parseEther('100'))
    })

    it('should transfer', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).transfer(testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(amount)
    })

    it('should transfer from', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).approve(testAccount.address, amount)
      await ilock.connect(testAccount).transferFrom(initialOwner, testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(amount)
    })

    it('should revert transfer if not enough balance', async function () {
      const amount = ethers.parseEther('1')
      await expect(ilock.connect(testAccount).transfer(initialOwner.address, amount)).to.be.revertedWithCustomError(
        ilock,
        'ERC20InsufficientBalance'
      )
    })

    it('should revert transfer from if not enough allowance', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).approve(testAccount.address, amount)
      await expect(
        ilock.connect(testAccount).transferFrom(initialOwner, testAccount.address, ethers.parseEther('2'))
      ).to.be.revertedWithCustomError(ilock, 'ERC20InsufficientAllowance')
    })
  })

  context('Cooldown', async function () {
    let DEFAULT_ADMIN: string

    beforeEach(async function () {
      await ilock.connect(initialOwner).mint(initialOwner.address, ilockSettings.cooldownThreshold * BigInt(3))
      await ilock.connect(initialOwner).mint(testAccount.address, ilockSettings.cooldownThreshold * BigInt(3))
    })

    context('setup', async function () {
      it('should revert setup cooldown if does not have DEFAULT_ADMIN role', async function () {
        const DEFAULT_ADMIN = await ilock.DEFAULT_ADMIN_ROLE()
        await expect(ilock.connect(testAccount).setUpCooldown(0, 0))
          .to.be.revertedWithCustomError(ilock, 'AccessControlUnauthorizedAccount')
          .withArgs(testAccount.address, DEFAULT_ADMIN)
      })

      it('should setup cooldown', async function () {
        const cooldown = ilockSettings.cooldownDuration * 2
        const threshold = ilockSettings.cooldownThreshold * BigInt(2)
        await ilock.connect(initialOwner).setUpCooldown(cooldown, threshold)
        expect(await ilock.transferCooldownDuration()).to.be.equal(cooldown)
        expect(await ilock.transferCooldownThreshold()).to.be.equal(threshold)
      })
    })

    context('turned off', async function () {
      beforeEach(async function () {
        await ilock.connect(initialOwner).setUpCooldown(0, 0) // turn off cooldown
      })

      it('should have the correct cooldown duration', async function () {
        expect(await ilock.transferCooldownDuration()).to.be.equal(0)
      })

      it('should have the correct cooldown threshold', async function () {
        expect(await ilock.transferCooldownThreshold()).to.be.equal(0)
      })

      it('should not be on cooldown right after big transfer', async function () {
        const amount = ilockSettings.cooldownThreshold
        await ilock.connect(testAccount).transfer(initialOwner.address, amount)
        await expect(ilock.connect(testAccount).transfer(initialOwner.address, amount)).to.not.be.reverted
      })
    })

    context('turned on', async function () {
      beforeEach(async function () {
        await ilock.connect(initialOwner).setUpCooldown(ilockSettings.cooldownDuration, ilockSettings.cooldownThreshold)
      })

      it('should have the correct cooldown duration', async function () {
        expect(await ilock.transferCooldownDuration()).to.be.equal(ilockSettings.cooldownDuration)
      })

      it('should have the correct cooldown threshold', async function () {
        expect(await ilock.transferCooldownThreshold()).to.be.equal(ilockSettings.cooldownThreshold)
      })

      it('should be on cooldown right after big transfer', async function () {
        const amount = ilockSettings.cooldownThreshold
        await ilock.connect(testAccount).transfer(initialOwner.address, amount)
        await expect(ilock.connect(testAccount).transfer(initialOwner.address, amount)).to.be.revertedWithCustomError(
          ilock,
          'InterlockTransferCooldown'
        )
      })

      it('should be on transfer cooldown after exactly 24 hours', async function () {
        const amount = ilockSettings.cooldownThreshold

        const latestTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0
        await ilock.connect(testAccount).transfer(initialOwner.address, amount)

        await ethers.provider.send('evm_setNextBlockTimestamp', [latestTimestamp + ilockSettings.cooldownDuration])
        await ethers.provider.send('evm_mine')

        await expect(ilock.connect(testAccount).transfer(initialOwner.address, amount))
          .to.be.revertedWithCustomError(ilock, 'InterlockTransferCooldown')
          .withArgs(testAccount.address)
      })

      it('should be off cooldown after 24 hours + 1 second', async function () {
        const amount = ilockSettings.cooldownThreshold

        const latestTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp ?? 0
        await ilock.connect(testAccount).transfer(initialOwner.address, amount)

        await ethers.provider.send('evm_setNextBlockTimestamp', [latestTimestamp + ilockSettings.cooldownDuration + 1]) // cooldownDuration + 1 second
        await ethers.provider.send('evm_mine')

        await expect(ilock.connect(testAccount).transfer(initialOwner.address, amount))
          .to.be.emit(ilock, 'Transfer')
          .withArgs(testAccount.address, initialOwner.address, amount)
      })

      it('should not be on cooldown right after big transfer if the owner', async function () {
        const amount = ilockSettings.cooldownThreshold
        await ilock.connect(initialOwner).transfer(testAccount.address, amount)
        await expect(ilock.connect(initialOwner).transfer(testAccount.address, amount)).to.not.be.reverted
      })
    })
  })
})
