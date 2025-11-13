const cds = require('@sap/cds');
const con2app = require('@cap-js-community/odata-v2-adapter');

// Increase payload size limit
cds.on('bootstrap', app => {
    app.use(con2app());
    app.use(require('express').json({ limit: '50mb' })); // can adjust to 50MB
    app.use(require('express').urlencoded({ extended: true, limit: '50mb' }));
});

module.exports = cds.server;