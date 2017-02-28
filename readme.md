[![Build Status](https://travis-ci.org/soukand/couchdb-change-events.svg?branch=master)](https://travis-ci.org/soukand/couchdb-change-events) [![Code Climate](https://codeclimate.com/github/soukand/couchdb-change-events/badges/gpa.svg)](https://codeclimate.com/github/soukand/couchdb-change-events) [![Issue Count](https://codeclimate.com/github/soukand/couchdb-change-events/badges/issue_count.svg)](https://codeclimate.com/github/soukand/couchdb-change-events) [![Test Coverage](https://codeclimate.com/github/soukand/couchdb-change-events/badges/coverage.svg)](https://codeclimate.com/github/soukand/couchdb-change-events/coverage)

The library is still in progress. It works, but it is missing some features.

I will provide simple example how to use it. Full documentation will come soon.

### Usage
```javascript
const CouchdbChangeEvents = require('couchdb-change-events');

const couchdbEvents = new CouchdbChangeEvents({
  host: 'localhost',
  db: 'my_database'
});

couchdbEvents.on('data', (data) => {
  console.log('data', data);
});

couchdbEvents.on('couchdb_status', (status) => {
  console.log(`couchdb status: ${status}`);
});

couchdbEvents.on('couchdb_error', (error) => {
  console.log('error', error);
});

```
