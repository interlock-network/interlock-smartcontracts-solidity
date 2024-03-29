import { ethers, network, upgrades } from 'hardhat'
import contractsAddresses from '../contractsAddresses'

const contractName = 'InterlockNetwork'

async function main() {
  const proxyAddress = contractsAddresses[network.name][contractName]
  const contractFactory = await ethers.getContractFactory(contractName)
  await upgrades.forceImport(proxyAddress, contractFactory)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
