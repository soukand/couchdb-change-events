[![Build Status](https://travis-ci.org/soukand/couchdb-change-events.svg?branch=master)](https://travis-ci.org/soukand/couchdb-change-events) [![Code Climate](https://codeclimate.com/github/soukand/couchdb-change-events/badges/gpa.svg)](https://codeclimate.com/github/soukand/couchdb-change-events) [![Issue Count](https://codeclimate.com/github/soukand/couchdb-change-events/badges/issue_count.svg)](https://codeclimate.com/github/soukand/couchdb-change-events) [![Test Coverage](https://codeclimate.com/github/soukand/couchdb-change-events/badges/coverage.svg)](https://codeclimate.com/github/soukand/couchdb-change-events/coverage)

Easy interface to get object changes from CouchDb. This library is basically event emitter that emits changed objects, connection status and errors. If something happens with connection, it will be established again. Library checks also heartbeat and if new heartbeat is not received, connection will be reconnected. So **Sit back and Relax**, everything is taken care for you.

Key reasons why to choose this package are:
* Follows CouchDb philosophy - Easy to use, bulletproof and you can sit back and relax.
* When CouchDb is unreachable and comes back online, changes will be emitted again.
* **No dependencies**.
* Reports connection status.
* Reconnects on connection fail or heartbeats are not received anymore.
* Always will be 100% test code coverage.

## CouchdbChangeEvents(options)
Options for initializing library.

* `database`: Name of the database to use for this connection. (Mandatory)
* `host`: The hostname of the database you are connecting to. (Default:
  `localhost`)
* `port`: The port number to connect to. (Default: `5984`)
* `protocol`: Protocol used to connect to CouchDb. `http/https` (Default: `http`)
* `includeDocs`: Include the associated document with each result. (Default: `true`)
* `heartbeat`: Period in milliseconds after which an empty line is sent in the results. (Default: `2000`)
* `lastEventId`: ID of the last events received by the server on a previous connection.
* `autoConnect`: If it's true then connection is started on initializing, otherwise connect function has to be called. (Default: `true`)
* `user`: The CouchDb user to authenticate as.
* `password`: The password of that CouchDb user.
* `view`: Allows to use view functions as filters. Documents counted as “passed” for view filter in case if map function emits at least one record for them
* `style`: Specifies how many revisions are returned in the changes array. The default, `main_only`, will only return the current “winning” revision; `all_docs` will return all leaf revisions (including conflicts and deleted former conflicts).
* `conflicts`: Includes conflicts information in response. Ignored if `include_docs` isn’t true. Default is `false`.




## Usage
#### Quick start
```javascript
const CouchdbChangeEvents = require('couchdb-change-events');

const couchdbEvents = new CouchdbChangeEvents({
  database: 'my_database'
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

#### Authentication
```javascript
const CouchdbChangeEvents = require('couchdb-change-events');

const couchdbEvents = new CouchdbChangeEvents({
  database: 'my_database',
  host: '127.0.0.1',
  user: 'username',
  password: 'secret'
});

couchdbEvents.on('data', (data) => {
  console.log(data);
});

```
