# Run tests
```
1) npm run ganache
2) truffle test
```

# if Router-Hash-test failed
```
Make sure You updated PairHash in config.js and test/contracts/dex/libraries/UniswapV2Library.sol
```

# Description
```
Fetch/Sale/LD manager

1) Fetch split ETH input with SALE and DEX (% of split can be changed in splitFormula).

2) White list for sale (users can not use sale)

3) Sale split ETH with LDManager

4) LDManager add additional LD in each tx

5) Add finish (burn remains tokens) in sale and LD manager

6) Add migrate() to sale and LDmanager and vice versa, or to new versions of sale or LD manager

7) Add convertFor for case deposit without stake



Safemoon token

1) We have SF based based token, we only add ExcludedFromTransferLimit for manage stake limit and allow stake transfer to user more than max limit.

For case if user gained more than max limit transfer in stake duration.

```
