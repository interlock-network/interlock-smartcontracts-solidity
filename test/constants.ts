import { ethers } from 'ethers'

export const ilockSettings = {
  name: 'InterlockNetwork',
  symbol: 'ILOCK',
  decimals: 18,
  initialSupply: ethers.parseUnits((0).toString(), 18),
  cap: ethers.parseUnits((1_000_000_000).toString(), 18),
  cooldownDuration: 60 * 60 * 24, // 1 day
  cooldownThreshold: ethers.parseUnits((10_000_000).toString(), 18)
}

export const securityStakingSettings = {
  name: 'ILSecurityStaking',
  version: '1'
}
