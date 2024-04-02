import hre, { defender, ethers, network, upgrades } from 'hardhat'
import readline from 'readline'
import { getImplementationAddress } from '@openzeppelin/upgrades-core'
import { type BaseContract, Signer } from 'ethers'

export async function verifyContract(address: string, constructorArguments: any[] = []) {
  await hre.run('verify:verify', {
    address,
    constructorArguments
  })
}

export async function deployProxy<T extends BaseContract>(
  contractName: string,
  signer: Signer,
  parameters: Array<any>
) {
  const contractFactory = await ethers.getContractFactory(contractName, signer)
  const contract = await upgrades.deployProxy(contractFactory, [...parameters])
  return (await contract.waitForDeployment()) as unknown as T
}

export async function deployWithDefender(contractName: string, params: Array<any>) {
  const contractFactory = await ethers.getContractFactory(contractName)
  const contract = await defender.deployContract(contractFactory, params)
  return contract.waitForDeployment()
}

export async function deployProxyWithDefender(
  contractName: string,
  params: Array<any>,
  options: {
    proxyAdminOwner?: `0x${string}`
    initializerName?: string
    salt?: string
  }
) {
  const contractFactory = await ethers.getContractFactory(contractName)
  const contract = await defender.deployProxy(contractFactory, params, {
    initializer: options.initializerName,
    initialOwner: options.proxyAdminOwner,
    salt: options.salt
  })
  // need to connect to local provider to use waitForDeployment
  return contract.connect(ethers.provider).waitForDeployment()
}

export async function proposeUpgradeWithDefender(contractName: string, proxyAddress: string) {
  const contractFactory = await ethers.getContractFactory(contractName)
  return await defender.proposeUpgradeWithApproval(proxyAddress, contractFactory)
}

export async function deployWithDefenderInteractive(contractName: string, params: any = {}) {
  console.log(`Contract ${contractName} will be deployed from Defender to the ${network.name} network with parameters:`)
  Object.keys(params).map((key) => {
    console.log(`${key} : ${params[key]}`)
  })

  if (await confirm('\nDo you want to continue? [y/N] ')) {
    console.log('Deploying contract...')

    const contract = await deployWithDefender(contractName, Object.values(params))
    const contractAddress = await contract.getAddress()
    console.log(`${contractName} deployed to: ${contractAddress}`)

    if (await confirm('\nDo you want to verify contract implementation? [y/N] ')) {
      await verifyContract(contractAddress, Object.values(params))
    }

    return contract
  } else {
    console.log('Aborted.')
  }
}

export async function deployProxyWithDefenderInteractive(
  contractName: string,
  params: any = {},
  options: {
    proxyAdminOwner?: `0x${string}`
    initializerName?: string
    salt?: string
  }
) {
  console.log(
    `Contract ${contractName}\noptions: ${JSON.stringify(options)}\nwill be deployed from Defender to the ${network.name} network with parameters:`
  )
  Object.keys(params).map((key) => {
    console.log(`${key} : ${params[key]}`)
  })

  if (await confirm('\nDo you want to continue? [y/N] ')) {
    console.log('Deploying contract...')

    const contract = await deployProxyWithDefender(contractName, Object.values(params), options)
    const contractAddress = await contract.getAddress()
    console.log(`${contractName} deployed to: ${contractAddress}`)

    if (await confirm('\nDo you want to verify contract implementation? [y/N] ')) {
      const implementationAddress = await getImplementationAddress(ethers.provider, contractAddress)
      console.log('Implementation address: ', implementationAddress)
      await verifyContract(implementationAddress)
    }

    return contract
  } else {
    console.log('Aborted.')
  }
}

export async function proposeUpgradeWithDefenderInteractive(contractName: string, proxyAddress: string) {
  console.log(
    `Upgrade proposal of ${contractName} on ${proxyAddress} address will be sent to Defender along with new implementation deployment on ${network.name} network`
  )

  if (await confirm('\nDo you want to continue? [y/N] ')) {
    console.log('Upgrading contract...')

    const upgradeProposal = await proposeUpgradeWithDefender(contractName, proxyAddress)
    console.log(`${contractName} upgrade proposal:\n${upgradeProposal}`)

    if (await confirm('\nDo you want to verify contract implementation? [y/N] ')) {
      const implementationAddress = await getImplementationAddress(ethers.provider, proxyAddress)
      console.log('Implementation address: ', implementationAddress)
      await verifyContract(implementationAddress)
    }
  } else {
    console.log('Aborted.')
  }
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) =>
    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer)
    })
  )
}

async function confirm(question: string): Promise<boolean> {
  const answer: string = await ask(question)
  return ['y', 'yes'].includes(answer.toLowerCase())
}
