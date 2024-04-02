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
  let testAccount: SignerWithAddress
  let snapshot: number

  before(async () => {
    ;[deployer, initialOwner, testAccount] = await ethers.getSigners()
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
    it('should have the correct initial owner', async function () {
      expect(await ilock.owner()).to.equal(initialOwner.address)
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

    it('should have the correct balance for the treasury', async function () {
      expect(await ilock.balanceOf(await ilock.getAddress())).to.equal(ilockSettings.initialSupply)
    })

    it('should have the correct allowance for the initial owner', async function () {
      expect(await ilock.allowance(await ilock.getAddress(), initialOwner.address)).to.equal(ilockSettings.cap)
    })

    it('should be paused', async function () {
      expect(await ilock.paused()).to.equal(true)
    })

    it('should have the correct cooldown duration', async function () {
      expect(await ilock.transferCooldownDuration()).to.be.equal(ilockSettings.cooldownDuration)
    })

    it('should have the correct cooldown threshold', async function () {
      expect(await ilock.transferCooldownThreshold()).to.be.equal(ilockSettings.cooldownThreshold)
    })
  })

  context('Treasury', async function () {
    beforeEach(async function () {
      await ilock.connect(initialOwner).unpause()
    })

    it('should approve treasury', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).treasuryApprove(testAccount.address, amount)
      expect(await ilock.allowance(await ilock.getAddress(), testAccount.address)).to.equal(amount)
    })

    it('should transfer from treasury', async function () {
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).treasuryApprove(testAccount.address, amount)
      await ilock.connect(testAccount).transferFrom(await ilock.getAddress(), testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(amount)
    })

    it('should revert treasury approve if not the owner', async function () {
      const amount = ethers.parseEther('1')
      await expect(
        ilock.connect(testAccount).treasuryApprove(testAccount.address, amount)
      ).to.be.revertedWithCustomError(ilock, 'OwnableUnauthorizedAccount')
    })

    it('should revert transfer from treasury if not enough allowance', async function () {
      const amount = ethers.parseEther('1')
      await expect(
        ilock.connect(testAccount).transferFrom(await ilock.getAddress(), testAccount.address, amount)
      ).to.be.revertedWithCustomError(ilock, 'ERC20InsufficientAllowance')
    })

    it('should revert transfer from treasury if paused', async function () {
      await ilock.connect(initialOwner).pause()
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).treasuryApprove(testAccount.address, amount)
      await expect(
        ilock.connect(testAccount).transferFrom(await ilock.getAddress(), testAccount.address, amount)
      ).to.be.revertedWithCustomError(ilock, 'EnforcedPause')
    })
  })

  context('Ownership', async function () {
    it('should transfer ownership', async function () {
      await ilock.connect(initialOwner).transferOwnership(testAccount.address)
      expect(await ilock.owner()).to.equal(testAccount.address)
    })

    it('should renounce ownership', async function () {
      await ilock.connect(initialOwner).renounceOwnership()
      expect(await ilock.owner()).to.equal(ethers.ZeroAddress)
    })

    it('should revert transfer ownership if not the owner', async function () {
      await expect(ilock.connect(testAccount).renounceOwnership()).to.be.revertedWithCustomError(
        ilock,
        'OwnableUnauthorizedAccount'
      )
    })
  })

  context('Pausing', async function () {
    it('should unpause', async function () {
      await ilock.connect(initialOwner).unpause()
      expect(await ilock.paused()).to.equal(false)
    })

    it('should pause', async function () {
      await ilock.connect(initialOwner).unpause()
      await ilock.connect(initialOwner).pause()
      expect(await ilock.paused()).to.equal(true)
    })

    it('should transfer if not paused', async function () {
      await ilock.connect(initialOwner).unpause()
      const amount = ethers.parseEther('1')
      await ilock.connect(initialOwner).transferFrom(await ilock.getAddress(), testAccount.address, amount)
      expect(await ilock.balanceOf(testAccount.address)).to.equal(amount)
    })

    it('should revert pause if not the owner', async function () {
      await expect(ilock.connect(testAccount).pause()).to.be.revertedWithCustomError(
        ilock,
        'OwnableUnauthorizedAccount'
      )
    })

    it('should revert unpause if not the owner', async function () {
      await expect(ilock.connect(testAccount).unpause()).to.be.revertedWithCustomError(
        ilock,
        'OwnableUnauthorizedAccount'
      )
    })

    it('should revert transferFrom if paused', async function () {
      const amount = ethers.parseEther('1')
      await expect(
        ilock.connect(initialOwner).transferFrom(await ilock.getAddress(), testAccount.address, amount)
      ).to.be.revertedWithCustomError(ilock, 'EnforcedPause')
    })

    it('should revert transfer if paused', async function () {
      const amount = ethers.parseEther('1')
      await expect(ilock.connect(initialOwner).transfer(testAccount.address, amount)).to.be.revertedWithCustomError(
        ilock,
        'EnforcedPause'
      )
    })
  })

  context('Transfer', async function () {
    beforeEach(async function () {
      await ilock.connect(initialOwner).unpause()
      await ilock
        .connect(initialOwner)
        .transferFrom(await ilock.getAddress(), initialOwner.address, ethers.parseEther('100'))
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
    beforeEach(async function () {
      await ilock.connect(initialOwner).unpause()
      await ilock
        .connect(initialOwner)
        .transferFrom(await ilock.getAddress(), initialOwner.address, ilockSettings.cooldownThreshold * BigInt(3))
      await ilock
        .connect(initialOwner)
        .transferFrom(await ilock.getAddress(), testAccount.address, ilockSettings.cooldownThreshold * BigInt(3))
    })

    context('setup', async function () {
      it('should revert setup cooldown if not the owner', async function () {
        await expect(ilock.connect(testAccount).setUpCooldown(0, 0)).to.be.revertedWithCustomError(
          ilock,
          'OwnableUnauthorizedAccount'
        )
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
