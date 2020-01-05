const nock = require('nock');
const config = require('config');
const chai = require('chai');
const chaiSpies = require('chai-spies');
const inventory = require('../src/inventory');

chai.use(chaiSpies);
const expect = chai.expect;

const shop1 = config.get('shop1');
const shop2 = config.get('shop2');

describe('Inventory', function () {
  it('should be able to sync between two stores', async () => {
    const getInventoryItemByID = chai.spy('getInventoryItemByID', (uri, body) => {
      expect(body.query).to.include('query getInventoryItemByID');
      expect(body.variables).to.have.property('inventoryItemId', 'gid://shopify/InventoryItem/custom_id');

      return [200, {
        data: {
          inventoryItem: {
            id: 'gid://shopify/InventoryItem/custom_id',
            sku: 'custom_sku'
          }
        }
      }];
    });
    const getInventoryItemBySku = chai.spy('getInventoryItemBySku', (uri, body) => {
      expect(body.query).to.include('query getInventoryItemBySku');
      expect(body.variables).to.have.property('inventoryItemSku', 'sku:custom_sku');

      return [200, {
        data: {
          inventoryItems: {
            edges: [{
              node: {
                id: 'gid://shopify/InventoryItem/custom_id',
                inventoryLevels: {
                  edges: [{
                    node: {
                      id: 'custom_dest_id',
                      available: 50
                    }
                  }]
                }
              }
            }]
          }
        }
      }];
    });
    const adjustInventoryLevelQuantity = chai.spy('adjustInventoryLevelQuantity', (uri, body) => {
      expect(body.query).to.include('mutation adjustInventoryLevelQuantity');
      expect(body.variables).to.have.property('inventoryAdjustQuantityInput');
      expect(body.variables.inventoryAdjustQuantityInput).to.have.property('inventoryLevelId', 'custom_dest_id');
      expect(body.variables.inventoryAdjustQuantityInput).to.have.property('availableDelta', -40);

      return [200, {
        data: {
          inventoryAdjustQuantity: {
            inventoryLevel: {
              available: 10
            }
          }
        }
      }];
    });
    nock(`https://${shop1.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(getInventoryItemByID);
    nock(`https://${shop2.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(getInventoryItemBySku);
    nock(`https://${shop2.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(adjustInventoryLevelQuantity);

    let error;
    let result;
    try {
      result = await inventory.sync(shop1.host, shop2.host, { inventoryItemId: 'custom_id', available: 10 });
    } catch (err) {
      error = err;
    }

    expect(error).to.be.undefined;
    expect(result).to.equal(10);
    expect(getInventoryItemByID).to.have.been.called.once;
    expect(getInventoryItemBySku).to.have.been.called.once;
    expect(adjustInventoryLevelQuantity).to.have.been.called.once;
  });

  it('should not be able to sync when a product does not exist', async () => {
    const getInventoryItemByID = chai.spy('getInventoryItemByID', (uri, body) => {
      expect(body.query).to.include('query getInventoryItemByID');
      expect(body.variables).to.have.property('inventoryItemId', 'gid://shopify/InventoryItem/custom_id');

      return [200, {
        data: {
          inventoryItem: null
        }
      }];
    });
    nock(`https://${shop1.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(getInventoryItemByID);

    let error;
    try {
      await inventory.sync(shop1.host, shop2.host, { inventoryItemId: 'custom_id', available: 10 });
    } catch (err) {
      error = err;
    }

    expect(error.message).to.equal(`Missing inventory item gid://shopify/InventoryItem/custom_id on ${shop1.host}`);
    expect(getInventoryItemByID).to.have.been.called.once;
  });

  it('should not be able to sync when a product does not exist on the destination store', async () => {
    const getInventoryItemByID = chai.spy('getInventoryItemByID', (uri, body) => {
      expect(body.query).to.include('query getInventoryItemByID');
      expect(body.variables).to.have.property('inventoryItemId', 'gid://shopify/InventoryItem/custom_id');

      return [200, {
        data: {
          inventoryItem: {
            id: 'gid://shopify/InventoryItem/custom_id',
            sku: 'custom_sku'
          }
        }
      }];
    });
    const getInventoryItemBySku = chai.spy('getInventoryItemBySku', (uri, body) => {
      expect(body.query).to.include('query getInventoryItemBySku');
      expect(body.variables).to.have.property('inventoryItemSku', 'sku:custom_sku');

      return [200, {
        data: {
          inventoryItems: null
        }
      }];
    });
    nock(`https://${shop1.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(getInventoryItemByID);
    nock(`https://${shop2.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(getInventoryItemBySku);

    let error;
    try {
      await inventory.sync(shop1.host, shop2.host, { inventoryItemId: 'custom_id', available: 10 });
    } catch (err) {
      error = err;
    }

    expect(error.message).to.equal(`Missing inventory item SKU custom_sku on ${shop2.host}`);
    expect(getInventoryItemByID).to.have.been.called.once;
    expect(getInventoryItemBySku).to.have.been.called.once;
  });

  it('should not be able to sync when the inventory level does not exist on destination store', async () => {
    const getInventoryItemByID = chai.spy('getInventoryItemByID', (uri, body) => {
      expect(body.query).to.include('query getInventoryItemByID');
      expect(body.variables).to.have.property('inventoryItemId', 'gid://shopify/InventoryItem/custom_id');

      return [200, {
        data: {
          inventoryItem: {
            id: 'gid://shopify/InventoryItem/custom_id',
            sku: 'custom_sku'
          }
        }
      }];
    });
    const getInventoryItemBySku = chai.spy('getInventoryItemBySku', (uri, body) => {
      expect(body.query).to.include('query getInventoryItemBySku');
      expect(body.variables).to.have.property('inventoryItemSku', 'sku:custom_sku');

      return [200, {
        data: {
          inventoryItems: {
            edges: [{
              node: {
                id: 'gid://shopify/InventoryItem/custom_id',
                inventoryLevels: null
              }
            }]
          }
        }
      }];
    });
    nock(`https://${shop1.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(getInventoryItemByID);
    nock(`https://${shop2.host}`)
      .post('/admin/api/2020-01/graphql.json')
      .once()
      .reply(getInventoryItemBySku);

    let error;
    try {
      await inventory.sync(shop1.host, shop2.host, { inventoryItemId: 'custom_id', available: 10 });
    } catch (err) {
      error = err;
    }

    expect(error.message).to.equal(`Missing inventory level with SKU custom_sku on ${shop2.host}`);
    expect(getInventoryItemByID).to.have.been.called.once;
    expect(getInventoryItemBySku).to.have.been.called.once;
  });
});
