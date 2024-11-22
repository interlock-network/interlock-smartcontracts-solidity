import { arbitrumSepoliaAddresses, baseSepoliaAddresses, sepoliaAddresses } from './addresses'

const sepoliaArgs = {
  InterlockNetwork: {
    params: {
      initialOwner: '0x43c93bE08B1D2C3f6c29B3caE7fE67F74ccf3ad8'
    },
    initialProxyOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F',
    salt: 'HelloWorldILOCK'
  },
  ILSecurityStaking: {
    params: {
      _ilockToken: sepoliaAddresses['InterlockNetwork'],
      _stakingPool: '0x43c93bE08B1D2C3f6c29B3caE7fE67F74ccf3ad8',
      _admin: '0x43c93bE08B1D2C3f6c29B3caE7fE67F74ccf3ad8'
    }
  }
}

const baseSepoliaArgs = {
  InterlockNetwork: {
    params: {
      initialOwner: '0x43c93bE08B1D2C3f6c29B3caE7fE67F74ccf3ad8'
    },
    initialProxyOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F',
    salt: 'HelloWorldILOCK'
  },
  ILSecurityStaking: {
    params: {
      _ilockToken: baseSepoliaAddresses['InterlockNetwork'],
      _stakingPool: '0x43c93bE08B1D2C3f6c29B3caE7fE67F74ccf3ad8',
      _admin: '0x43c93bE08B1D2C3f6c29B3caE7fE67F74ccf3ad8'
    }
  }
}

const arbitrumSepoliaArgs = {
  InterlockNetwork: {
    params: {
      initialOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F'
    },
    proxyAdminOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F',
    salt: 'InterlockNetworkOwnsYou'
  },
  ILSecurityStaking: {
    params: {
      _ilockToken: arbitrumSepoliaAddresses['InterlockNetwork'],
      _stakingPool: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F',
      _admin: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F'
    }
  }
}

export const contractsArgs: Record<string, Record<'InterlockNetwork' | 'ILSecurityStaking', any>> = {
  sepolia: sepoliaArgs,
  baseSepolia: baseSepoliaArgs,
  arbitrumSepolia: arbitrumSepoliaArgs
}
