import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'

export const securityStakingTypes = {
  Stake: [
    { name: 'amount', type: 'uint256' },
    { name: 'urlHash', type: 'bytes32' },
    { name: 'isMalicious', type: 'bool' },
    { name: 'deadline', type: 'uint256' }
  ]
}

export async function signStakeMessage(
  signer: SignerWithAddress,
  domain: any,
  amount: bigint,
  urlHash: string,
  isMalicious: boolean,
  deadline: number
) {
  return signer.signTypedData(domain, securityStakingTypes, { amount, urlHash, isMalicious, deadline })
}
