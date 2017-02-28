const proxyquire = require('proxyquire').noCallThru(),
	sinon = require('sinon'),
	should = require('should');

describe('CouchdbChangeEvents', () => {
	let CouchdbChangeEvents,
		httpResponse,
		http,
		proxy;

	beforeEach(() => {
		proxy = {};

		httpResponse = {
			on: sinon.stub().callsArg(1)
		};

		http = {
			on: sinon.stub().returns(http).callsArgWith(1, 'error'),
			end: sinon.spy()
		};

		proxy.http = {
			request: sinon.stub().returns(http).callsArgWith(1, httpResponse)
		};

		proxy.https = {
			request: sinon.stub().returns(http).callsArgWith(1, httpResponse)
		};

		global.setTimeout = sinon.spy();

		CouchdbChangeEvents = proxyquire('../src/couchdb-change-events', proxy);
	});

	describe('.constructor()', () => {
		let changeEvents;

		beforeEach(() => {
			CouchdbChangeEvents.prototype.connect = sinon.spy();
			CouchdbChangeEvents.prototype.checkHeartbeat = sinon.spy();
			CouchdbChangeEvents.prototype.setCouchdbStatus = sinon.spy();

			changeEvents = new CouchdbChangeEvents({
				db: 'my_database'
			});
		});

		it('exposes COUCHDB_STATUS_CONNECTED constant', () => {
			should.equal(changeEvents.COUCHDB_STATUS_CONNECTED, 'connected');
		});

		it('exposes COUCHDB_STATUS_DISCONNECTED constant', () => {
			should.equal(
				changeEvents.COUCHDB_STATUS_DISCONNECTED, 'disconnected'
			);
		});

		it('has default value for config "host": localhost', () => {
			should.equal(changeEvents.host, 'localhost');
		});

		it('has default value for config "port": 5984', () => {
			should.equal(changeEvents.port, 5984);
		});

		it('has default value for config "protocol": http', () => {
			should.equal(changeEvents.protocol, 'http');
		});

		it('has default value for config "heartbeat": 2000', () => {
			should.equal(changeEvents.heartbeat, 2000);
		});

		it('uses parameter "db" from provided config', () => {
			should.equal(changeEvents.db, 'my_database');
		});

		it('uses default heartbeat, if empty heartbeat is provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false,
				heartbeat: null
			});

			should.equal(changeEvents.heartbeat, 2000);
		});

		it('uses parameter "lastEventId" from provided config', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				lastEventId: '127-eb534549c61b48f28c753ea95c64f02b',
				autoConnect: false
			});

			should.equal(
				changeEvents.lastEventId,
				'127-eb534549c61b48f28c753ea95c64f02b'
			);
		});

		it('uses custom config parameter "host" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				host: '127.0.0.1'
			});

			should.equal(changeEvents.host, '127.0.0.1');
		});

		it('uses custom config parameter "port" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				port: 3000
			});

			should.equal(changeEvents.port, 3000);
		});

		it('uses custom config parameter "protocol" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				protocol: 'https'
			});

			should.equal(changeEvents.protocol, 'https');
		});

		it('uses custom config parameter "heartbeat" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				heartbeat: 4000
			});

			should.equal(changeEvents.heartbeat, 4000);
		});

		it('uses custom config parameter "includeDocs" instead of default, if provided', () => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				includeDocs: false
			});

			should.equal(changeEvents.includeDocs, false);
		});

		it('throws an error, if db is not provided ', () => {
			try {
				new CouchdbChangeEvents({});
			} catch (error) {
				should.equal(error.message, 'db parameter missing from config');
				should.equal(error.error_type, 'EMPTY_DB_PARAMETER');
			}
		});

		it('sets last heartbeats time to current time', () => {
			const timeDelta = new Date().getTime() - changeEvents.lastHeartBeat;

			should.equal(timeDelta < 15, true);
			should.equal(timeDelta >= 0, true);
		});

		it('sets couchdb connection status to disconnected', () => {
			should.equal(
				changeEvents.setCouchdbStatus.firstCall.args[0],
				'disconnected'
			);
		});

		it('initializes heartbeat check loop', () => {
			should.equal(changeEvents.checkHeartbeat.callCount, 1);
		});

		it('tries to connect to couchdb changes', () => {
			should.equal(changeEvents.connect.callCount, 1);
		});

		it('does not connect, if autoConnect is false', () => {
			changeEvents.connect.reset();

			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			should.equal(changeEvents.connect.callCount, 0);
		});
	});

	describe('.checkHeartbeat()', () => {
		let changeEvents;

		beforeEach(() => {
			CouchdbChangeEvents.prototype.connect = sinon.spy();

			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			global.setTimeout.reset();
		});

		it('checks heartbeat after every second', () => {
			changeEvents.checkHeartbeat();

			should.equal(
				global.setTimeout.firstCall.args[0].name,
				'bound checkHeartbeat'
			);

			should.equal(global.setTimeout.firstCall.args[1], 1000);
		});

		it('kills http connection, if there has not been heartbeat for atleast 10s', () => {
			changeEvents.lastHeartBeat = new Date().getTime() - 11000;

			changeEvents.couchDbConnection = {
				destroy: sinon.spy()
			};

			changeEvents.checkHeartbeat();

			should.equal(changeEvents.couchDbConnection.destroy.callCount, 1);
		});

		it('does nothing when connection does not exist and heartbeat time is exceeded', () => {
			changeEvents.lastHeartBeat = new Date().getTime() - 11000;
			changeEvents.checkHeartbeat();

			should.equal(changeEvents.couchDbConnection, null);
		});
	});


	describe('.connect()', () => {
		let changeEvents;

		beforeEach(() => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			changeEvents.getRequestOptions = sinon.stub().returns({
				request: 'options'
			});

			changeEvents.emitError = sinon.spy();
			changeEvents.onCouchdbChange = sinon.spy();
			changeEvents.reconnect = sinon.spy();
		});

		it('uses http protocol, if protocol is not https', () => {
			changeEvents.connect();

			should.equal(proxy.http.request.callCount, 1);
		});

		it('uses https protocol, if protocol is https', () => {
			changeEvents.protocol = 'https';
			changeEvents.connect();

			should.equal(proxy.https.request.callCount, 1);
		});

		it('gets request options for http request', () => {
			changeEvents.connect();

			should.equal(changeEvents.getRequestOptions.callCount, 1);
		});

		it('updates lastHeartBeat to current time', () => {
			changeEvents.lastHeartBeat = null;
			changeEvents.connect();

			const timeDelta = new Date().getTime() - changeEvents.lastHeartBeat;

			should.equal(timeDelta < 15, true);
			should.equal(timeDelta >= 0, true);
		});

		it('sets http response to couchDbConnection', () => {
			changeEvents.connect();

			should.deepEqual(changeEvents.couchDbConnection, httpResponse);
		});

		it('emits error, if request fails', () => {
			proxy.http.request = sinon.stub().returns(http);

			changeEvents.connect();

			should.equal(changeEvents.emitError.firstCall.args[0], 'error');
		});

		it('reconnects, if request fails', () => {
			proxy.http.request = sinon.stub().returns(http);

			changeEvents.connect();

			should.equal(changeEvents.reconnect.callCount, 1);
		});

		it('calls onCouchdbChange when data is received from couchdb', () => {
			changeEvents.connect();

			should.equal(httpResponse.on.firstCall.args[0], 'data');
			should.equal(changeEvents.onCouchdbChange.callCount, 1);
		});

		it('reconnects on couchdb connection end', () => {
			changeEvents.connect();

			should.equal(httpResponse.on.secondCall.args[0], 'end');
			should.equal(changeEvents.reconnect.callCount, 2);
		});
	});

	describe('.onCouchdbChange()', () => {
		let changeEvents;

		beforeEach(() => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			changeEvents.lastHeartBeat = null;

			changeEvents.setCouchdbStatus = sinon.spy();
			changeEvents.emit = sinon.spy();
		});

		it('sets couchdb status to connected, if its not already', () => {
			changeEvents.onCouchdbChange('');

			should.equal(
				changeEvents.setCouchdbStatus.firstCall.args[0],
				'connected'
			);
		});

		it('updates last heartbeat time', () => {
			changeEvents.onCouchdbChange('');

			const timeDelta = new Date().getTime() - changeEvents.lastHeartBeat;

			should.equal(timeDelta < 15, true);
			should.equal(timeDelta >= 0, true);
		});

		it('updates lastEventId, if real change is received', () => {
			changeEvents.onCouchdbChange('{"seq": 32}');

			should.equal(changeEvents.lastEventId, 32);
		});

		it('emits received event', () => {
			changeEvents.onCouchdbChange('{"seq": 32}\n{"seq": 33}\n');

			should.equal(changeEvents.emit.callCount, 2);

			should.deepEqual(changeEvents.emit.firstCall.args, [
				'data', { seq: 32 }
			]);

			should.deepEqual(changeEvents.emit.secondCall.args, [
				'data', { seq: 33 }
			]);
		});
	});

	describe('.emitError()', () => {
		let changeEvents;

		beforeEach(() => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			changeEvents.emit = sinon.spy();
		});

		it('emits error', () => {
			changeEvents.emitError('couch-error');

			should.deepEqual(changeEvents.emit.firstCall.args, [
				'couchdb_error', 'couch-error'
			]);
		});
	});

	describe('.reconnect()', () => {
		let changeEvents;

		beforeEach(() => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			global.setTimeout.reset();
			changeEvents.setCouchdbStatus = sinon.spy();
		});

		it('sets couchdb status to disconnected, if its not already', () => {
			changeEvents.reconnect();

			should.equal(
				changeEvents.setCouchdbStatus.firstCall.args[0],
				'disconnected'
			);
		});

		it('tries to reconnect in 1 second', () => {
			changeEvents.reconnect();

			should.equal(
				global.setTimeout.firstCall.args[0].name, 'bound connect'
			);

			should.equal(global.setTimeout.firstCall.args[1], 1000);
		});
	});

	describe('.setCouchdbStatus()', () => {
		let changeEvents;

		beforeEach(() => {
			changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			changeEvents.emit = sinon.spy();
		});

		it('sets new status, if status is different', () => {
			changeEvents.couchdbStatus = 'disconnected';

			changeEvents.setCouchdbStatus('connected');

			should.equal(changeEvents.couchdbStatus, 'connected');
		});

		it('emits couchdb status, if status is different', () => {
			changeEvents.couchdbStatus = 'disconnected';

			changeEvents.setCouchdbStatus('connected');

			should.deepEqual(changeEvents.emit.firstCall.args, [
				'couchdb_status', 'connected'
			]);
		});

		it('does not emit couchdb status, if status is the same', () => {
			changeEvents.couchdbStatus = 'connected';

			changeEvents.setCouchdbStatus('connected');

			should.equal(changeEvents.emit.callCount, 0);
		});
	});

	describe('.getRequestOptions()', () => {
		it('returns a host in options', () => {
			const changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false,
				host: '127.0.0.1'
			});

			should.equal(
				changeEvents.getRequestOptions().host,
				'127.0.0.1'
			);
		});

		it('returns a port in options', () => {
			const changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false,
				port: 1234
			});

			should.equal(
				changeEvents.getRequestOptions().port,
				1234
			);
		});

		it('returns get method in options', () => {
			const changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			should.equal(
				changeEvents.getRequestOptions().method,
				'get'
			);
		});

		it('returns correct path in options without extra parameters', () => {
			const changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false
			});

			should.equal(
				changeEvents.getRequestOptions().path,
				`/my_database/_changes?feed=continuous&heartbeat=2000` +
				`&include_docs=true`
			);
		});

		it('returns correct path in options with lastEventId', () => {
			const changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false,
				lastEventId: '32-dsjfa'
			});

			should.equal(
				changeEvents.getRequestOptions().path,
				`/my_database/_changes?feed=continuous&heartbeat=2000` +
				`&include_docs=true&last-event-id=32-dsjfa`
			);
		});

		it('returns correct path in options, includeDocs is false', () => {
			const changeEvents = new CouchdbChangeEvents({
				db: 'my_database',
				autoConnect: false,
				includeDocs: false
			});

			should.equal(
				changeEvents.getRequestOptions().path,
				`/my_database/_changes?feed=continuous&heartbeat=2000`
			);
		});

		it('encodes uri components', () => {
			const changeEvents = new CouchdbChangeEvents({
				db: 'my_database/',
				autoConnect: false,
				lastEventId: '82-/'
			});

			should.equal(
				changeEvents.getRequestOptions().path,
				`/my_database%2F/_changes?feed=continuous&heartbeat=2000` +
				`&include_docs=true&last-event-id=82-%2F`
			);
		});
	});
});
