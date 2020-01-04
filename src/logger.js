const bunyan = require('bunyan');
const config = require('config');
const logger = bunyan.createLogger({
  name: 'syncInventory',
  serializers: {
    err: bunyan.stdSerializers.err,
  },
  streams: [
    {
      stream: process.stdout,
      level: config.get('logger.stdout') || 'trace',
    },
  ],
});

module.exports = logger;
