import {itemShopMode,itemShopStock,itemBuyStatus,buyItem,
  itemSellStatus,sellItem,itemInitialSaleOffer} from './item-shop.js';

// Confirm the live, source-backed shop selection before moving money or items.
// The earlier UI offer is a quote, not authority to trade an arbitrary item.
// This is browser-native state consistency, not a newly decoded DOS rule.
const hold=reason=>({allowed:false,quantity:0,reason});
const uint=n=>Number.isSafeInteger(n)&&n>=0;
const open=slot=>['day','secret'].includes(itemShopMode(slot));

export function confirmNativeItemPurchase(slot,quote){
  if(!quote||!uint(quote.id)||!uint(quote.price)||
     !open(slot)||quote.mode!==itemShopMode(slot))
    return hold('native-shop-quote-invalid');
  const stock=itemShopStock(slot);
  // The quote must still be listed in the CURRENT original-port inventory.
  // Re-loading a save, entering another port or crossing a shop opening
  // boundary may not silently purchase a different definition.
  const listed=stock.items.some(item=>item.id===quote.id&&
    item.price===quote.price);
  if(!listed)return hold('native-shop-stock-changed');
  const status=itemBuyStatus(slot,quote.id);
  if(!status.allowed)return {...status,quantity:0};
  if(status.price!==quote.price)return hold('native-shop-price-changed');
  return buyItem(slot,quote.id);
}

export function confirmNativeItemSale(slot,quote,price=null){
  if(!quote||!uint(quote.inventorySlot)||!uint(quote.id)||
     !uint(quote.offer)||quote.offer===0||
     !open(slot)||quote.mode!==itemShopMode(slot))
    return hold('native-shop-quote-invalid');
  if(!Array.isArray(slot?.inventory)||
     slot.inventory[quote.inventorySlot]!==quote.id)
    return hold('native-shop-held-item-changed');
  const status=itemSellStatus(slot,quote.inventorySlot);
  if(!status.allowed)return {...status,quantity:0};
  // Definition and original offer must agree with the quote at acceptance.
  if(status.item?.id!==quote.id||status.offer!==quote.offer||
     itemInitialSaleOffer(status.item)!==quote.offer)
    return hold('native-shop-offer-changed');
  const requested=price===null?quote.offer:price;
  // Negotiated offers are bounded by the existing source-stat Charm formula.
  // This refuses a stale/forged inflated offer rather than minting gold.
  const charm=slot?.charm;
  if(!uint(requested)||requested===0||
     (requested!==quote.offer&&
      (!uint(charm)||charm>255||
       requested!==quote.offer+Math.floor(quote.offer*charm/200))))
    return hold('native-shop-negotiation-invalid');
  return sellItem(slot,quote.inventorySlot,requested);
}
