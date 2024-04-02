import { proposeUpgradeWithDefenderInteractive } from '../utils'
import { network } from 'hardhat'
import contractsAddresses from '../contractsAddresses'

const contractName = 'InterlockNetwork'

async function main() {
  const proxyAddress = contractsAddresses[network.name][contractName]

  await proposeUpgradeWithDefenderInteractive(contractName, proxyAddress)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
