import { BN, fromWei, toWei } from 'web3-utils'
import ether from './helpers/ether'
import EVMRevert from './helpers/EVMRevert'
import { duration } from './helpers/duration'
import { PairHash } from '../config'
import BigNumber from 'bignumber.js'

const timeMachine = require('ganache-time-traveler')

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BN))
  .should()

const ETH_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// real contracts
const UniswapV2Factory = artifacts.require('./UniswapV2Factory.sol')
const UniswapV2Router = artifacts.require('./UniswapV2Router02.sol')
const UniswapV2Pair = artifacts.require('./UniswapV2Pair.sol')
const WETH = artifacts.require('./WETH9.sol')
const TOKEN = artifacts.require('./TOKEN.sol')
const Fetch = artifacts.require('./Fetch.sol')
const Sale = artifacts.require('./SaleWithLD.sol')
const SplitFormula = artifacts.require('./SplitFormula')
const LDManager = artifacts.require('./LDManager')
const DAI = artifacts.require('./DAI')

const url = "https://gateway.pinata.cloud/ipfs/QmNVZdcfwaadBzKkDFfGXtqNdKwEbMsQY5xZJxfSxNcK2i/1/"
const MINLDAmountInDAI = toWei("450")
const MAXLDAmountInDAI = toWei("1000")
const DAIRate = toWei(String(1000))
const antiDumpingDelay = duration.days(30)

let pancakeFactory,
    pancakeRouter,
    weth,
    token,
    pair,
    pancakePairAddress,
    fetch,
    sale,
    splitFormula,
    splitFormulaSecond,
    ldManager,
    dai


contract('Fetch-with-LD-test', function([userOne, userTwo, userThree]) {

  async function deployContracts(){
    // deploy contracts
    weth = await WETH.new()
    dai = await DAI.new(DAIRate)

    pancakeFactory = await UniswapV2Factory.new(userOne)
    pancakeRouter = await UniswapV2Router.new(pancakeFactory.address, weth.address)

    token = await TOKEN.new(pancakeRouter.address)

    const halfOfTotalSupply = BigNumber(BigNumber(BigNumber(await token.totalSupply()).dividedBy(2)).integerValue()).toString(10)

    // add token liquidity to Pancake
    await token.approve(pancakeRouter.address, halfOfTotalSupply)
    await pancakeRouter.addLiquidityETH(
      token.address,
      halfOfTotalSupply,
      1,
      1,
      userOne,
      "1111111111111111111111"
    , { from:userOne, value:toWei(String(500)) })

    pancakePairAddress = await pancakeFactory.allPairs(0)
    pair = await UniswapV2Pair.at(pancakePairAddress)

    // ADD DAI to LD
    await dai.approve(pancakeRouter.address, DAIRate)
    await pancakeRouter.addLiquidityETH(
      dai.address,
      DAIRate,
      1,
      1,
      userOne,
      "1111111111111111111111"
    , { from:userOne, value:toWei(String(1)) })

    const initialRate = await pancakeRouter.getAmountsOut(
      1000000000,
      [token.address, weth.address]
    )

    splitFormula = await SplitFormula.new(
      initialRate[1],
      MINLDAmountInDAI,
      MAXLDAmountInDAI,
      pancakeRouter.address,
      pair.address,
      token.address,
      dai.address
    )

    splitFormulaSecond = await SplitFormula.new(
      initialRate[1],
      MINLDAmountInDAI,
      MAXLDAmountInDAI,
      pancakeRouter.address,
      pair.address,
      token.address,
      dai.address
    )

    ldManager = await LDManager.new(
      pancakeRouter.address,
      token.address
    )

    sale = await Sale.new(
      token.address,
      userOne,
      pancakeRouter.address,
      ldManager.address
    )

    fetch = await Fetch.new(
      weth.address,
      pancakeRouter.address,
      token.address,
      sale.address,
      splitFormula.address
    )

    // exclude fetch from fee and balance limit
    await token.excludeFromFee(fetch.address)
    await token.excludeFromTransferLimit(fetch.address)

    // exclude sale from fee and balance limit
    await token.excludeFromFee(sale.address)
    await token.excludeFromTransferLimit(sale.address)

    // exclude ldManager from fee and balance limit
    await token.excludeFromFee(ldManager.address)
    await token.excludeFromTransferLimit(ldManager.address)

    // send all remains to sale and ld maanger
    const safeMoonRemains = await token.balanceOf(userOne)
    const halfOfRemains = BigNumber(safeMoonRemains).dividedBy(2)
    const saleAmount = halfOfRemains
    const ldManagerAmount = halfOfRemains

    // sell
    await token.transfer(sale.address, saleAmount)

    // ld manager
    await token.transfer(ldManager.address, ldManagerAmount)

    // update white list for fetch
    await sale.updateWhiteList(fetch.address, true)
  }

  beforeEach(async function() {
    await deployContracts()
  })


  describe('INIT', function() {

    it('PairHash correct', async function() {
      assert.equal(
        String(await pancakeFactory.pairCodeHash()).toLowerCase(),
        String(PairHash).toLowerCase(),
      )
    })

    it('Factory in Router correct', async function() {
      assert.equal(
        String(await pancakeRouter.factory()).toLowerCase(),
        String(pancakeFactory.address).toLowerCase(),
      )
    })

    it('WETH in Router correct', async function() {
      assert.equal(
        String(await pancakeRouter.WETH()).toLowerCase(),
        String(weth.address).toLowerCase(),
      )
    })

    it('Correct isExcluded status for user', async function() {
      assert.equal(await token.isExcludedFromFee(userTwo), false)
      assert.equal(await token.isExcludedFromTransferLimit(userTwo), false)
    })
})

 describe('Split formula', function() {
    it('Not owner can not update split formula', async function() {
      await fetch.updateSplitFormula(
        splitFormulaSecond.address,
        { from:userTwo }
      ).should.be.rejectedWith(EVMRevert)
    })

    it('Owner canupdate split formula', async function() {
      assert.equal(await fetch.splitFormula(), splitFormula.address)

      await fetch.updateSplitFormula(
        splitFormulaSecond.address
      )

      assert.equal(await fetch.splitFormula(), splitFormulaSecond.address)
    })
})


describe('Update DAO wallet', function() {
    it('Not owner can not call updateDAOWallet', async function() {
      await fetch.updateDAOWallet(
        "0x0000000000000000000000000000000000000000",
        { from:userTwo }
      ).should.be.rejectedWith(EVMRevert)
    })

    it('Owner can call updateDAOWallet', async function() {
      await fetch.updateDAOWallet("0x0000000000000000000000000000000000000000")
      assert.equal(
        await fetch.DAOWallet(),
        "0x0000000000000000000000000000000000000000"
      )
    })
})

describe('Update burn status', function() {
    it('Not owner can not call updateCutStatus', async function() {
      const statusBefore = await fetch.isCutActive()

      await fetch.updateCutStatus(
        false,
        { from:userTwo }
      ).should.be.rejectedWith(EVMRevert)

      assert.equal(statusBefore, await fetch.isCutActive())
    })

    it('Owner can call updateCutStatus', async function() {
      const statusBefore = await fetch.isCutActive()

      await fetch.updateCutStatus(false)

      assert.notEqual(statusBefore, await fetch.isCutActive())
      assert.equal(await fetch.isCutActive(), false)
    })
})


describe('DEPOSIT with LD from sale', function() {
  it('', async function() {
    // deposit
    console.log("Total LD before deposit ", Number(fromWei(await weth.balanceOf(pair.address))))
    await fetch.deposit({ from:userTwo, value:toWei(String(10)) })

    const initialRate = await pancakeRouter.getAmountsOut(
      1000000000,
      [token.address, weth.address]
    )

    console.log("Rate for 1 TOKEN with add LD", Number(initialRate[1]), "ETH wei")
    console.log("Total LD after ", Number(fromWei(await weth.balanceOf(pair.address))))
   })
  })
  //END
})
