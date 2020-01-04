const config = require('config');
const bodyParser = require('body-parser');
const express = require('express');
const logger = require('./logger');
const inventory = require('./inventory');

const app = express();

const shop1 = config.get('shop1');
const shop2 = config.get('shop1');

app.use(bodyParser.json());

app.post('/webhook/inventory_level/update', async (req, res) => {
  const { 'x-shopify-shop-domain': shop, 'x-shopify-topic': topic } = req.headers;
  const { inventory_item_id: inventoryItemId, available } = req.body;

  if (topic === 'inventory_levels/update') {
    const source = shop === shop1.host ? shop1.host : shop2.host;
    const dest = shop === shop1.host ? shop2.host : shop1.host;
    await inventory.sync(source, dest, { inventoryItemId, available });
  }

  res.end();
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).send(err);
})

app.listen(3000, () => logger.info('listening on port 3000'));
