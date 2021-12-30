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
Fetch/Sale

1) Fetch with split SALE and DEX (can be changed in splitFormula).

2) White list for sale and stake (users can not use sale or stake directly)

3) Split sale with LDManager

4) Add finish (burn remains tokens) in sale and LD manager

5) Add migrate() to sale and LDmanager and vice versa, or to new versions of sale or LD manager

6) Add convertFor for case deposit without stake



Safemoon token

1) We have SF based based token, we only add ExcludedFromTransferLimit for manage stake limit and allow stake transfer to user more than max limit.

For case if user gained more than max limit transfer in stake duration.

```
