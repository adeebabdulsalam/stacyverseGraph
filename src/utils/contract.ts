import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts"
import { 
  Account,
  Balance,
  Collection,
  Token,
  Transaction
 } from "../../generated/schema"
import { ethereum } from "@graphprotocol/graph-ts"

export namespace constants {
	export let   BIGINT_ZERO      = BigInt.fromI32(0)
	export let   BIGINT_ONE       = BigInt.fromI32(1)
	export let   BIGDECIMAL_ZERO  = new BigDecimal(constants.BIGINT_ZERO)
	export let   BIGDECIMAL_ONE   = new BigDecimal(constants.BIGINT_ONE)
	export const ADDRESS_ZERO     = '0x0000000000000000000000000000000000000000'
	export const BYTES32_ZERO     = '0x0000000000000000000000000000000000000000000000000000000000000000'
}

export namespace transactions {
	export function log(event: ethereum.Event): Transaction {
		
		let tx = Transaction.load(event.transaction.hash.toHexString())
		if (!tx) {
			
			tx = new Transaction(event.transaction.hash.toHexString())
			tx.timestamp   = event.block.timestamp.toI32()
			tx.blockNumber = event.block.number.toI32()
			tx.gasPrice = event.transaction.gasPrice
            let origin = fetchAccount(event.transaction.from)
			tx.transactionFrom = origin.id
			tx.transfers = new Array<string>()
            origin.save()
			tx.save()
			}

		return tx as Transaction
	}
	export type Tx = Transaction
}

export namespace events {
	export function id(event: ethereum.Event): string {
		return event.block.number.toString().concat('-').concat(event.logIndex.toString())
	}
}


export function fetchCollection(address: Address): Collection{
  let collectionEntity = Collection.load(address.toHexString())
  if(collectionEntity == null){
    collectionEntity = new Collection(address.toHexString())
  }
  return collectionEntity as Collection
}

export function fetchToken(collectionEntity: Collection, id: BigInt): Token{
    let tokenid = 'mainnet/'.concat(collectionEntity.id.concat('/').concat(id.toString()))
    let tokenEntity = Token.load(tokenid)
    if(tokenEntity == null){
        tokenEntity = new Token(tokenid)
        tokenEntity.collection  = collectionEntity.id
        tokenEntity.identifier = id
        tokenEntity.isHalloweenTradeable = false
    }
    return tokenEntity as Token
}

export function fetchBalance(tokenEntity: Token, accountEntity: Account): Balance{
    let balanceid = tokenEntity.id.concat('-').concat(accountEntity.id)
    let balanceEntity =  Balance.load(balanceid)
    if(balanceEntity == null){
        balanceEntity = new Balance(balanceid)
        balanceEntity.token = tokenEntity.id
        balanceEntity.account = accountEntity.id
        balanceEntity.value = constants.BIGINT_ZERO
    }
    return balanceEntity as Balance
}

export function fetchAccount(address: Address): Account{
    let accountEntity = Account.load(address.toHexString())
    if(accountEntity == null){
        accountEntity = new Account(address.toHexString())
        accountEntity.isHalloweenTraded = false
    }
    return accountEntity as Account
}