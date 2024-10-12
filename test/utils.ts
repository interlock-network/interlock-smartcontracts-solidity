import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

export const securityStakingTypes = {
  Stake: [
    { name: 'amount', type: 'uint256' },
    { name: 'dataHash', type: 'bytes32' },
    { name: 'isMalicious', type: 'bool' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
}

export const signStakeMessage = async (
  signer: SignerWithAddress,
  domain: any,
  amount: bigint,
  dataHash: string,
  isMalicious: boolean,
  nonce: bigint,
  deadline: number
) => {
  const message = {
    amount,
    dataHash,
    isMalicious,
    nonce,
    deadline
  }
  return signer.signTypedData(domain, securityStakingTypes, message)
}
