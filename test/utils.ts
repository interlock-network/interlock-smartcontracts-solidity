import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

export async function signStakeMessage(
  signer: SignerWithAddress,
  amount: bigint,
  dataHash: string,
  isMalicious: boolean,
  domain: any
) {
  const types = {
    Stake: [
      { name: 'amount', type: 'uint256' },
      { name: 'dataHash', type: 'bytes32' },
      { name: 'isMalicious', type: 'bool' }
    ]
  }
  const value = { amount, dataHash, isMalicious }
  return signer.signTypedData(domain, types, value)
}
