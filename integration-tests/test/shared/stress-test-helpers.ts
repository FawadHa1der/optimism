/* Imports: External */
import { ethers } from 'ethers'

/* Imports: Internal */
import { OptimismEnv } from './env'
import { Direction } from './watcher-utils'

interface TransactionParams {
  contract: ethers.Contract
  functionName: string
  functionParams: any[]
}

// TxRequest holds a wallet and tx
// params that the wallet will send
interface TxRequest {
  tx: TransactionParams
  wallet: ethers.Wallet
}

// Arbitrary big amount of gas for the L1<>L2 messages.
const MESSAGE_GAS = 8_000_000

export const createWallets = (count: number): Array<ethers.Wallet> => {
  const wallets = []
  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom()
    wallets.push(wallet)
  }
  return wallets
}

const pairSigners = (
  wallets: ethers.Wallet[],
  tx: TransactionParams
): TxRequest[] => {
  const pairs: Array<TxRequest> = []
  for (const wallet of wallets) {
    pairs.push({ wallet, tx })
  }
  return pairs
}

export const executeL1ToL2Transactions = async (
  env: OptimismEnv,
  requests: TxRequest[]
) => {
  for (const request of requests) {
    const signer = request.wallet.connect(env.l1Wallet.provider)
    const tx = request.tx
    const receipt = await env.l1Messenger
      .connect(signer)
      .sendMessage(
        tx.contract.address,
        tx.contract.interface.encodeFunctionData(
          tx.functionName,
          tx.functionParams
        ),
        MESSAGE_GAS,
        {
          gasPrice: 0,
        }
      )

    await env.waitForXDomainTransaction(receipt, Direction.L1ToL2)
  }
}

export const executeL2ToL1Transactions = async (
  env: OptimismEnv,
  requests: TxRequest[]
) => {
  for (const request of requests) {
    const signer = request.wallet.connect(env.l2Wallet.provider)
    const tx = request.tx
    const receipt = await env.l2Messenger
      .connect(signer)
      .sendMessage(
        tx.contract.address,
        tx.contract.interface.encodeFunctionData(
          tx.functionName,
          tx.functionParams
        ),
        MESSAGE_GAS,
        {
          gasPrice: 0,
        }
      )

    await env.relayXDomainMessages(receipt)
    await env.waitForXDomainTransaction(receipt, Direction.L2ToL1)
  }
}

export const executeL2Transactions = async (
  env: OptimismEnv,
  requests: TxRequest[]
) => {
  for (const request of requests) {
    const tx = request.tx
    const signer = request.wallet.connect(env.l2Wallet.provider)
    const result = await tx.contract
      .connect(signer)
      .functions[tx.functionName](...tx.functionParams, {
        gasPrice: 0,
      })
    await result.wait()
  }
}

export const executeRepeatedL1ToL2Transactions = async (
  env: OptimismEnv,
  tx: TransactionParams,
  wallets: ethers.Wallet[]
) => {
  const pairs: TxRequest[] = pairSigners(wallets, tx)
  await executeL1ToL2Transactions(env, pairs)
}

export const executeRepeatedL2ToL1Transactions = async (
  env: OptimismEnv,
  tx: TransactionParams,
  wallets: ethers.Wallet[]
) => {
  const pairs: TxRequest[] = pairSigners(wallets, tx)
  await executeL2ToL1Transactions(env, pairs)
}

export const executeRepeatedL2Transactions = async (
  env: OptimismEnv,
  tx: TransactionParams,
  wallets: ethers.Wallet[]
) => {
  const pairs: TxRequest[] = pairSigners(wallets, tx)
  await executeL2Transactions(env, pairs)
}

export const executeL1ToL2TransactionsParallel = async (
  env: OptimismEnv,
  requests: TxRequest[]
) => {
  await Promise.all(
    requests.map(async (request) => {
      const signer = request.wallet.connect(env.l1Wallet.provider)
      const tx = request.tx
      const receipt = await env.l1Messenger
        .connect(signer)
        .sendMessage(
          tx.contract.address,
          tx.contract.interface.encodeFunctionData(
            tx.functionName,
            tx.functionParams
          ),
          MESSAGE_GAS,
          {
            gasPrice: 0,
          }
        )

      await env.waitForXDomainTransaction(receipt, Direction.L1ToL2)
    })
  )
}

export const executeL2ToL1TransactionsParallel = async (
  env: OptimismEnv,
  requests: TxRequest[]
) => {
  await Promise.all(
    requests.map(async (request) => {
      const tx = request.tx
      const signer = request.wallet.connect(env.l2Wallet.provider)
      const receipt = await env.l2Messenger
        .connect(signer)
        .sendMessage(
          tx.contract.address,
          tx.contract.interface.encodeFunctionData(
            tx.functionName,
            tx.functionParams
          ),
          MESSAGE_GAS,
          {
            gasPrice: 0,
          }
        )

      await env.relayXDomainMessages(receipt)
      await env.waitForXDomainTransaction(receipt, Direction.L2ToL1)
    })
  )
}

export const executeL2TransactionsParallel = async (
  env: OptimismEnv,
  requests: TxRequest[]
) => {
  await Promise.all(
    requests.map(async (request) => {
      const tx = request.tx
      const signer = request.wallet.connect(env.l2Wallet.provider)
      const result = await tx.contract
        .connect(signer)
        .functions[tx.functionName](...tx.functionParams, {
          gasPrice: 0,
        })
      await result.wait()
    })
  )
}

export const executeRepeatedL1ToL2TransactionsParallel = async (
  env: OptimismEnv,
  tx: TransactionParams,
  wallets: ethers.Wallet[]
) => {
  const pairs: TxRequest[] = pairSigners(wallets, tx)
  await executeL1ToL2TransactionsParallel(env, pairs)
}

export const executeRepeatedL2ToL1TransactionsParallel = async (
  env: OptimismEnv,
  tx: TransactionParams,
  wallets: ethers.Wallet[]
) => {
  const pairs: TxRequest[] = pairSigners(wallets, tx)
  await executeL2ToL1TransactionsParallel(env, pairs)
}

export const executeRepeatedL2TransactionsParallel = async (
  env: OptimismEnv,
  tx: TransactionParams,
  wallets: ethers.Wallet[]
) => {
  const pairs: TxRequest[] = pairSigners(wallets, tx)
  await executeL2TransactionsParallel(env, pairs)
}
