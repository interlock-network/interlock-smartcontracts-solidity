type InterlockNetworkArgs = {
  params: {
    initialOwner: `0x${string}`
  }
  proxyAdminOwner?: `0x${string}`
  salt?: string
}

const contractsArgs: Record<
  string,
  {
    InterlockNetwork: InterlockNetworkArgs
  }
> = {
  sepolia: {
    InterlockNetwork: {
      params: {
        initialOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F'
      },
      proxyAdminOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F',
      salt: 'InterlockNetworkOwnsYou'
    }
  },
  baseSepolia: {
    InterlockNetwork: {
      params: {
        initialOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F'
      },
      proxyAdminOwner: '0x4599Bb9B14e1bea536C175206cf878fe07dE390F',
      salt: 'InterlockNetworkOwnsYou'
    }
  }
}

export default contractsArgs
