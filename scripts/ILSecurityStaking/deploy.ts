import { contractsArgs } from '../../contracts-data/args'
import { network } from 'hardhat'
import { deployProxyWithDefenderInteractive } from '../utils'

const contractName = 'ILSecurityStaking'

async function main() {
  const { params } = contractsArgs[network.name][contractName]

  if (!params._ilockToken) {
    throw new Error(`ILOCK token address is not set for the ${contractName} on ${network.name} network`)
  }
  if (!params._stakingPool) {
    throw new Error(`Staking pool address is not set for the ${contractName} on ${network.name} network`)
  }
  if (!params._admin) {
    throw new Error(`Admin address is not set for the ${contractName} on ${network.name} network`)
  }

  await deployProxyWithDefenderInteractive(contractName, params, { initializerName: 'initialize' })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
