const config = require('config');
const { GraphQLClient } = require('graphql-request');
const logger = require('./logger');

const shop1 = config.get('shop1');
const shop2 = config.get('shop1');

const shop1Client = new GraphQLClient('https://crisp-shop-wilk1.myshopify.com/admin/api/2020-01/graphql.json', {
  headers: {
    'X-Shopify-Access-Token': shop1.password
  }
});
const shop2Client = new GraphQLClient('https://crisp-shop-wilk2.myshopify.com/admin/api/2020-01/graphql.json', {
  headers: {
    'X-Shopify-Access-Token': shop2.password
  }
});

const getInventoryItemById = `
query getInventoryItemByID($inventoryItemId: ID!) {
  inventoryItem(id: $inventoryItemId) {
    id
    sku
  }
}
`;

const getInventoryItemBySku = `
query getInventoryItemBySku($inventoryItemSku: String) {
  inventoryItems(first: 1, query: $inventoryItemSku) {
    edges {
      node {
        id
        inventoryLevels(first: 1) {
          edges {
            node {
              id
              available
            }
          }
        }
      }
    }
  }
}
`;

const adjustInventory = `
mutation adjustInventoryLevelQuantity($inventoryAdjustQuantityInput: InventoryAdjustQuantityInput!) {
  inventoryAdjustQuantity(input: $inventoryAdjustQuantityInput) {
    inventoryLevel {
      available
    }
  }
}
`;

const sync = async (sourceShopHost, destShopHost, payload) => {
  logger.info(`Checking inventory diffs between ${sourceShopHost} and ${destShopHost}`);
  let result;

  const sourceClient = sourceShopHost === shop1.host ? shop1Client : shop2Client;
  const destClient = destShopHost === shop1.host ? shop1Client : shop2Client;

  // fetching item sku from source inventory
  const inventoryItemGid = `gid://shopify/InventoryItem/${payload.inventoryItemId}`;
  result = await sourceClient.request(getInventoryItemById, { inventoryItemId: inventoryItemGid });
  if (!result.inventoryItem) throw new Error(`Missing inventory item ${inventoryItemGid} on ${sourceShopHost}`);

  // fetching item and inventory level from dest inventory
  const inventoryItemSku = result.inventoryItem.sku;
  result = await destClient.request(getInventoryItemBySku, { inventoryItemSku: `sku:${inventoryItemSku}` });
  if (!result.inventoryItems || !result.inventoryItems.edges) throw new Error(`Missing inventory item SKU ${inventoryItemSku} on ${destShopHost}`);
  if (!result.inventoryItems.edges[0].node.inventoryLevels || !result.inventoryItems.edges[0].node.inventoryLevels.edges) throw new Error(`Missing inventory level with SKU ${inventoryItemSku} on ${destShopHost}`);

  // calculating available delta
  const destInventoryLevel = result.inventoryItems.edges[0].node.inventoryLevels.edges[0].node;
  const availableDelta = payload.available - destInventoryLevel.available;
  if (availableDelta === 0) return;

  const inventoryPayload = {
    inventoryLevelId: destInventoryLevel.id,
    availableDelta
  };

  // synching dest inventory
  logger.info(`Adjusting the inventory...`);
  result = await destClient.request(adjustInventory, { inventoryAdjustQuantityInput: inventoryPayload });
  logger.info(`Inventory synched successfully!`);

  return result.inventoryLevel.available;
};

module.exports = {
  sync
};
