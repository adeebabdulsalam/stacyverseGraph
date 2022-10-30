import { ipfs } from '@graphprotocol/graph-ts'
import { JSONValue, Value } from '@graphprotocol/graph-ts'
import { TransferBatch, TransferSingle, CreateERC1155_v1, URI } from "../generated/Stacy/Stacy"
import { BigInt, ethereum, store } from '@graphprotocol/graph-ts'
import { Account, Collection, Transaction, Transfer, Token } from "../generated/schema"
import { fetchAccount, fetchBalance, fetchCollection, fetchToken, events, transactions, constants} from './utils/contract'

export function processItem(value: JSONValue, userData: Value): void {
  // See the JSONValue documentation for details on dealing
  // with JSON values
  let metadata = value.toString()

  if (!metadata) {
    return
  }else{
    let tokenEntity = Token.load(userData.toString())
    if(tokenEntity!=null){
        if((!metadata.includes("XX") && !metadata.includes("Edition")))
          tokenEntity.isHalloweenTradeable = true
        tokenEntity.metadata = metadata
        tokenEntity.save()
    }
  }

}

export function handleCreateERC1155_v1(event: CreateERC1155_v1): void {
  let collectionEntity:Collection = fetchCollection(event.address)
  collectionEntity.name = event.params.name
  collectionEntity.symbol = event.params.symbol
  collectionEntity.creator = event.params.creator.toHexString()
  collectionEntity.save()
}

export function handleURI(event: URI): void {
  let collectionEntity: Collection = fetchCollection(event.address)
  let tokenEntity:Token = fetchToken(collectionEntity, event.params._id)
  tokenEntity.uri = event.params._value
  tokenEntity.save()
  collectionEntity.save()
  if(event.params._value){
    let hash = event.params._value.replace("/ipfs/","")
    ipfs.mapJSON(hash, 'processItem', Value.fromString(tokenEntity.id))
  }
}

function registerTransfer(
    event: ethereum.Event,
    suffix: string,
    collectionEntity: Collection,
    operator: Account,
    from: Account,
    to: Account,
    id: BigInt,
    value: BigInt
    ): void{

    let tokenEntity = fetchToken(collectionEntity, id)
    let transferEntity = new Transfer(events.id(event).concat(suffix))

    transferEntity.transaction = transactions.log(event).id
    transferEntity.collection = collectionEntity.id
    transferEntity.token = tokenEntity.id
    transferEntity.operator = operator.id
    transferEntity.senderAddress = from.id
    transferEntity.receiverAddress = to.id
    transferEntity.value = value
    
    if(from.id != constants.ADDRESS_ZERO){
        let balanceEntity1 = fetchBalance(tokenEntity, from)
        balanceEntity1.value =  balanceEntity1.value==constants.BIGINT_ZERO ? constants.BIGINT_ZERO : balanceEntity1.value.minus(transferEntity.value)
        balanceEntity1.save()
        if(balanceEntity1.value == constants.BIGINT_ZERO){
            // remove entity from store if balance reach zero
            store.remove("Balance", balanceEntity1.id)
        }
    }

    if(to.id != constants.ADDRESS_ZERO){
        let balanceEntity2 = fetchBalance(tokenEntity, to)
        balanceEntity2.value = balanceEntity2.value.plus(transferEntity.value)
        balanceEntity2.save()
    }else{
        // if burned after blockNumber: 15830458 : block just after announced in discord
        if(event.block.number.ge(BigInt.fromI32(15830458)) && tokenEntity.isHalloweenTradeable){
            from.isHalloweenTraded = true
            from.save()
        }
        // isHalloweenTradeable
    }
    
      // saving transfers to transaction manually instead of deriving
      let txEntity = Transaction.load(event.transaction.hash.toHexString())
      if(txEntity != null){
        let transferArray = txEntity.transfers
        transferArray.push(transferEntity.id)
        txEntity.transfers = transferArray
        txEntity.save()
      }

      
    transferEntity.save()
    tokenEntity.save()
    collectionEntity.save()
}

export function handleTransferSingle(event: TransferSingle): void{
    let collectionEntity = fetchCollection(event.address)
    let operator = fetchAccount(event.params._operator)
    let from = fetchAccount(event.params._from)
    let to = fetchAccount(event.params._to)
   
    collectionEntity.save()
    operator.save()
    from.save()
    to.save()
    registerTransfer(
       event,
       "",
       collectionEntity,
       operator,
       from,
       to,
       event.params._id,
       event.params._value
    )
   
   }


   export function handleTransferBatch(event: TransferBatch): void{
    let collectionEntity = fetchCollection(event.address)
    let operator = fetchAccount(event.params._operator)
    let from = fetchAccount(event.params._from)
    let to = fetchAccount(event.params._to)

    collectionEntity.save()
    operator.save()
    from.save()
    to.save()

    let ids = event.params._ids
    let values = event.params._values
    for(let i = 0; i< ids.length; i++){
        registerTransfer(
            event,
            "-".concat(i.toString()),
            collectionEntity,
            operator,
            from,
            to,
            ids[i],
            values[i]
        )
    }
}