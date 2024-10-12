export const sepoliaAddresses = {
  InterlockNetwork: '0xeF75DBdCc16416F534Cd710251a1Ed930aa849e8',
  ILSecurityStaking: '0x0000000000000000000000000000000000000000'
}

export const baseSepoliaAddresses = {
  InterlockNetwork: '0xeF75DBdCc16416F534Cd710251a1Ed930aa849e8',
  ILSecurityStaking: '0x0000000000000000000000000000000000000000'
}

export const arbitrumSepoliaAddresses = {
  InterlockNetwork: '0xeF75DBdCc16416F534Cd710251a1Ed930aa849e8',
  ILSecurityStaking: '0xfc454e79FfF7455b84145B44007a13e33a7e3571'
}

export const contractsAddresses: Record<string, Record<'InterlockNetwork' | 'ILSecurityStaking', string>> = {
  sepolia: sepoliaAddresses,
  baseSepolia: baseSepoliaAddresses,
  arbitrumSepolia: arbitrumSepoliaAddresses
}
