<img align="right" width="300" height="300" src="https://assets-global.website-files.com/64d9930f57641d176ab09b78/64dde3b1459a01ddf7b4a529_interlock-logo-large.webp">

# Interlock Network Solidity Smart Contracts

Welcome! This repo hosts development of all solidity smart contracts that actualize our [Interlock token model](https://github.com/interlock-network/interlock-models) and [DeSec](https://docs.interlock.network) infrastructure. It exists to be transparent about our contract development.

Contracts are written in solidity and are currently hosted on the [Arbitrum blockchain](https://arbitrum.io).

## Multichain:

Interlock Network has been and always will be, blockchain agnostic. The first phase of our web3 launch involves positioning for future security staking, as well as maximizing the likelihood of successful token value hike.

The ILOCK token will be deployed on Ethereum's Arbitrum layer 2 EVM. Vesting and rewards will be maintained on this network. Security staking will be implemented on Arbitrum, taking advantage of its improved transaction fees and throughput compared to the Ethereum mainnet.

## Contracts:

#### InterlockNetwork

This is our EVM (ERC20) token contract written for [Arbitrum](https://arbitrum.io). It implements the ILOCK token with the following features:
- Standard ERC20 functionality
- Pausable operations for emergency situations
- Role-based access control for administrative functions
- Cooldown mechanism for large transfers

The contract employs Solidity, drawing directly from the standard (audited) OpenZeppelin 5 contract suite.

#### ILSecurityStaking

This contract manages the security staking mechanism for the ThreatSlayer and ILOCK token. Key features include:
- Voting on malicious/non-malicious urls
- Locking ILOCK tokens for staking
- Reward distribution
- Slashing mechanism for misbehavior

Both contracts are designed to be upgradeable, allowing for future improvements and additions to functionality while maintaining contract addresses and state.

## Extra and other:

We have enabled [discussions](https://github.com/interlock-network/interlock-smartcontracts-solidity/discussions) and will be open to feedback throughout the development process. Please feel free to chime in on a discussion or open an [issue](https://github.com/interlock-network/interlock-smartcontracts-solidity/issues).

Likewise, feel free to comment on issues as they come up. We use an org-wide labeling system, but will have specific labels for this repository to denote contract type, client tooling, etc.

Enjoy!

# Contributing

We are open to contributions from the community. Please open an issue or pull request if you have any suggestions or improvements.

Packages are managed with [pnpm](https://pnpm.io/). To install dependencies, run:

```bash
pnpm install
```

## Development

To compile the contracts, run:

```bash
pnpm compile
```

To run the tests, run:

```bash
pnpm test
```

To deploy the contracts, run:

```bash
npx hardhat run --network NETWORK_NAME scripts/CONTRACT_NAME/deploy.ts
```

To upgrade the contracts, run:

```bash
npx hardhat run --network NETWORK_NAME scripts/CONTRACT_NAME/upgrade.ts
```

To verify the contracts, run:

```bash
pnpm verify --network NETWORK_NAME CONTRACT_ADDRESS
```