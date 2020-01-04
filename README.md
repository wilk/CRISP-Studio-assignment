# CRISP Studio - Home Assignment
This repository is the implementation of the CRISP Studio's Home Assignment.

## Install
Start with the same Node.js version using `nvm`:

```
$ nvm use
```

Then install the Node.js deps:

```
$ npm i
```

Then add the `development` configuration, under the `config` folder, calling it `development.js`.
It needs to have both the `password` and `secret` of your private app created on your Shopify store.

Then start the `ngrok` proxy:

```
$ npm run proxy
```

Finally start the application:

```
$ npm start
```

Now you need to go to `https://YOUR_SHOPIFY_STORE.myshopify.com/admin/settings/notifications` and add a new webhook, pointing to the `ngrok` HTTPS url: `https://YOUR_NGROK_ID.ngrok.io/webhook/inventory_level/update`, with the `Inventory Update` event.

## Testing
Start testing using `mocha`:

```
$ npm test
```
