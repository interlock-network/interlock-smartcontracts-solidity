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
  ILSecurityStaking: '0x10b9Dae08a712477bdEB7716E40D01085fe65981'
}

export const contractsAddresses: Record<string, Record<'InterlockNetwork' | 'ILSecurityStaking', string>> = {
  sepolia: sepoliaAddresses,
  baseSepolia: baseSepoliaAddresses,
  arbitrumSepolia: arbitrumSepoliaAddresses
}
