export const sepoliaAddresses = {
  InterlockNetwork: '0x6557fc061BBFfC9BB0a5EeFC9656Bb22e4f8eF66',
  ILSecurityStaking: '0x0000000000000000000000000000000000000000'
}

export const baseSepoliaAddresses = {
  InterlockNetwork: '0x6557fc061BBFfC9BB0a5EeFC9656Bb22e4f8eF66',
  ILSecurityStaking: '0x0000000000000000000000000000000000000000'
}

export const arbitrumSepoliaAddresses = {
  InterlockNetwork: '0x6557fc061BBFfC9BB0a5EeFC9656Bb22e4f8eF66',
  ILSecurityStaking: '0x0000000000000000000000000000000000000000'
}

export const contractsAddresses: Record<string, Record<'InterlockNetwork' | 'ILSecurityStaking', string>> = {
  sepolia: sepoliaAddresses,
  baseSepolia: baseSepoliaAddresses,
  arbitrumSepolia: arbitrumSepoliaAddresses
}
