import { expect } from 'chai'

/* Imports: External */
import { Contract, ContractFactory, Wallet, utils } from 'ethers'

/* Imports: Internal */
import { OptimismEnv } from './shared/env'
import { fundUser } from './shared/utils'
import {
  executeRepeatedL1ToL2Transactions,
  executeRepeatedL2ToL1Transactions,
  executeRepeatedL2Transactions,
  executeRepeatedL1ToL2TransactionsParallel,
  executeRepeatedL2ToL1TransactionsParallel,
  executeRepeatedL2TransactionsParallel,
  createWallets
} from './shared/stress-test-helpers'

/* Imports: Artifacts */
import simpleStorageJson from '../artifacts/contracts/SimpleStorage.sol/SimpleStorage.json'

// Need a big timeout to allow for all transactions to be processed.
// For some reason I can't figure out how to set the timeout on a per-suite basis
// so I'm instead setting it for every test.
const STRESS_TEST_TIMEOUT = 300_000

describe('stress tests', () => {
  let env: OptimismEnv
  const walletCount = 5
  let wallets: Array<Wallet> = []

  before(async () => {
    env = await OptimismEnv.new()
  })

  let L2SimpleStorage: Contract
  let L1SimpleStorage: Contract
  beforeEach(async () => {
    const factory__L1SimpleStorage = new ContractFactory(
      simpleStorageJson.abi,
      simpleStorageJson.bytecode,
      env.l1Wallet
    )
    const factory__L2SimpleStorage = new ContractFactory(
      simpleStorageJson.abi,
      simpleStorageJson.bytecode,
      env.l2Wallet
    )
    L1SimpleStorage = await factory__L1SimpleStorage.deploy()
    await L1SimpleStorage.deployTransaction.wait()
    L2SimpleStorage = await factory__L2SimpleStorage.deploy()
    await L2SimpleStorage.deployTransaction.wait()

    wallets = createWallets(walletCount)
    for (const wallet of wallets) {
      await fundUser(env.watcher, env.l1Bridge, utils.parseEther('3'))
    }
  })

  describe('L1 => L2 stress tests', () => {
    it(`${walletCount} L1 => L2 transactions (serial)`, async () => {
      await executeRepeatedL1ToL2Transactions(
        env,
        {
          contract: L2SimpleStorage,
          functionName: 'setValue',
          functionParams: [`0x${'42'.repeat(32)}`],
        },
        wallets
      )

      expect((await L2SimpleStorage.totalCount()).toNumber()).to.equal(
        wallets.length
      )
    }).timeout(STRESS_TEST_TIMEOUT)

    it(`${walletCount} L1 => L2 transactions (parallel)`, async () => {
      await executeRepeatedL1ToL2TransactionsParallel(
        env,
        {
          contract: L2SimpleStorage,
          functionName: 'setValue',
          functionParams: [`0x${'42'.repeat(32)}`],
        },
        wallets
      )

      expect((await L2SimpleStorage.totalCount()).toNumber()).to.equal(
        wallets.length
      )
    }).timeout(STRESS_TEST_TIMEOUT)
  })

  describe('L2 => L1 stress tests', () => {
    it(`${walletCount} L2 => L1 transactions (serial)`, async () => {
      await executeRepeatedL2ToL1Transactions(
        env,
        {
          contract: L1SimpleStorage,
          functionName: 'setValue',
          functionParams: [`0x${'42'.repeat(32)}`],
        },
        wallets
      )

      expect((await L1SimpleStorage.totalCount()).toNumber()).to.equal(
        wallets.length
      )
    }).timeout(STRESS_TEST_TIMEOUT)

    it(`${walletCount} L2 => L1 transactions (parallel)`, async () => {
      await executeRepeatedL2ToL1TransactionsParallel(
        env,
        {
          contract: L1SimpleStorage,
          functionName: 'setValue',
          functionParams: [`0x${'42'.repeat(32)}`],
        },
        wallets
      )

      expect((await L1SimpleStorage.totalCount()).toNumber()).to.equal(
        wallets.length
      )
    }).timeout(STRESS_TEST_TIMEOUT)
  })

  describe('L2 transaction stress tests', () => {
    it(`${walletCount} L2 transactions (serial)`, async () => {
      await executeRepeatedL2Transactions(
        env,
        {
          contract: L2SimpleStorage,
          functionName: 'setValueNotXDomain',
          functionParams: [`0x${'42'.repeat(32)}`],
        },
        wallets
      )

      expect((await L2SimpleStorage.totalCount()).toNumber()).to.equal(
        wallets.length
      )
    }).timeout(STRESS_TEST_TIMEOUT)

    it(`${walletCount} L2 transactions (parallel)`, async () => {
      await executeRepeatedL2TransactionsParallel(
        env,
        {
          contract: L2SimpleStorage,
          functionName: 'setValueNotXDomain',
          functionParams: [`0x${'42'.repeat(32)}`],
        },
        wallets
      )

      expect((await L2SimpleStorage.totalCount()).toNumber()).to.equal(
        wallets.length
      )
    }).timeout(STRESS_TEST_TIMEOUT)
  })

  // SKIP: needs message passing PR
  // This needs to be updated to generate a set of wallets for each
  // so they can truly send transactions in parallel
  describe.skip('C-C-C-Combo breakers', () => {
    const numTransactions = 10

    it(`${numTransactions} L2 transactions, L1 => L2 transactions, L2 => L1 transactions (txs serial, suites parallel)`, async () => {
      await Promise.all([
        executeRepeatedL1ToL2Transactions(
          env,
          {
            contract: L2SimpleStorage,
            functionName: 'setValue',
            functionParams: [`0x${'42'.repeat(32)}`],
          },
          wallets
        ),
        executeRepeatedL2ToL1Transactions(
          env,
          {
            contract: L1SimpleStorage,
            functionName: 'setValue',
            functionParams: [`0x${'42'.repeat(32)}`],
          },
          wallets
        ),
        executeRepeatedL2Transactions(
          env,
          {
            contract: L2SimpleStorage,
            functionName: 'setValueNotXDomain',
            functionParams: [`0x${'42'.repeat(32)}`],
          },
          wallets
        ),
      ])

      expect((await L2SimpleStorage.totalCount()).toNumber()).to.equal(
        numTransactions * 2
      )

      expect((await L1SimpleStorage.totalCount()).toNumber()).to.equal(
        numTransactions
      )
    }).timeout(STRESS_TEST_TIMEOUT)

    it(`${numTransactions} L2 transactions, L1 => L2 transactions, L2 => L1 transactions (all parallel)`, async () => {
      await Promise.all([
        executeRepeatedL1ToL2TransactionsParallel(
          env,
          {
            contract: L2SimpleStorage,
            functionName: 'setValue',
            functionParams: [`0x${'42'.repeat(32)}`],
          },
          wallets
        ),
        executeRepeatedL2ToL1TransactionsParallel(
          env,
          {
            contract: L1SimpleStorage,
            functionName: 'setValue',
            functionParams: [`0x${'42'.repeat(32)}`],
          },
          wallets
        ),
        executeRepeatedL2TransactionsParallel(
          env,
          {
            contract: L2SimpleStorage,
            functionName: 'setValueNotXDomain',
            functionParams: [`0x${'42'.repeat(32)}`],
          },
          wallets
        ),
      ])

      expect((await L2SimpleStorage.totalCount()).toNumber()).to.equal(
        numTransactions * 2
      )

      expect((await L1SimpleStorage.totalCount()).toNumber()).to.equal(
        numTransactions
      )
    }).timeout(STRESS_TEST_TIMEOUT)
  })
})
