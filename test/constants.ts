import { ethers } from 'ethers'

export const ilock_settings = {
  name: 'InterlockNetwork',
  symbol: 'ILOCK',
  decimals: 18,
  initial_supply: ethers.parseUnits((700_000_000).toString(), 18),
  cap: ethers.parseUnits((1_000_000_000).toString(), 18)
}
