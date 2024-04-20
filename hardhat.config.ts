import '@openzeppelin/hardhat-upgrades'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomicfoundation/hardhat-ethers'
import '@nomicfoundation/hardhat-verify'
import '@typechain/hardhat'
import 'hardhat-abi-exporter'
import 'hardhat-gas-reporter'
import { HardhatUserConfig } from 'hardhat/config'

import * as dotenv from 'dotenv'
dotenv.config({ path: './.env.dev' })

const config: HardhatUserConfig = {
  abiExporter: {
    path: './abi',
    clear: true,
    flat: false,
    except: ['@openzeppelin'],
    spacing: 2,
    runOnCompile: true,
    pretty: false
  },
  gasReporter: {
    coinmarketcap: process.env.CMC_API_KEY,
    enabled: !!process.env.REPORT_GAS,
    showTimeSpent: true
  },
  defender: {
    apiKey: process.env.DEFENDER_API_KEY as string,
    apiSecret: process.env.DEFENDER_API_SECRET as string
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: 'https://rpc2.sepolia.org',
      chainId: 11155111
    },
    baseSepolia: {
      url: 'https://sepolia.base.org',
      chainId: 84532
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_APIKEY as string,
      baseSepolia: process.env.BASE_APIKEY as string
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org'
        }
      }
    ]
  },
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          metadata: {
            // do not include the metadata hash, since this is machine dependent
            // and we want all generated code to be deterministic
            // https://docs.soliditylang.org/en/v0.8.24/metadata.html
            bytecodeHash: 'none'
          }
        }
      }
    ]
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  }
}

export default config
