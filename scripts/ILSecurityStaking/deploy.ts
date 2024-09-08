import { contractsArgs } from '../../contracts-data/args'
import { network } from 'hardhat'
import { deployProxyWithDefenderInteractive } from '../utils'

const contractName = 'ILSecurityStaking'

async function main() {
  const { proxyAdminOwner, params } = contractsArgs[network.name][contractName]

  if (!params.ilockToken) {
    throw new Error(`ILock token address is not set for the ${contractName} on ${network.name} network`)
  }
  if (!params.stakingPool) {
    throw new Error(`Staking pool address is not set for the ${contractName} on ${network.name} network`)
  }
  if (!params.admin) {
    throw new Error(`Admin address is not set for the ${contractName} on ${network.name} network`)
  }

  await deployProxyWithDefenderInteractive(contractName, params, { proxyAdminOwner })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
