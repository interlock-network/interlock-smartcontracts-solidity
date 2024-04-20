import contractsArgs from '../contractsArgs'
import { network } from 'hardhat'
import { deployProxyWithDefenderInteractive } from '../utils'

const contractName = 'InterlockNetwork'

async function main() {
  const { proxyAdminOwner, params, salt } = contractsArgs[network.name][contractName]

  if (!params.initialOwner) {
    throw new Error(`Contract Owner address is not set for the ${contractName} on ${network.name} network`)
  }

  await deployProxyWithDefenderInteractive(contractName, params, { proxyAdminOwner, salt })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
