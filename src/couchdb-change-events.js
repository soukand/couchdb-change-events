const http = require('http'),
	https = require('https'),
	EventEmitter = require('events');

class CouchdbChangeEvents extends EventEmitter {
	constructor({
		host = 'localhost',
		port = 5984,
		protocol = 'http',
		heartbeat = 2000,
		includeDocs = true,
		lastEventId,
		db
	}) {
		super();

		this.COUCHDB_STATUS_CONNECTED = 'connected';
		this.COUCHDB_STATUS_DISCONNECTED = 'disconnected';

		if (!db) {
			let noDbError = new Error('db parameter should be defined');

			noDbError.error_type = 'EMPTY_DB_PARAMETER';

			throw noDbError;
		}

		this.host = host;
		this.port = port;
		this.protocol = protocol;
		this.db = db;

		this.includeDocs = includeDocs;
		this.lastEventId = lastEventId;

		this.heartbeat = parseInt(heartbeat, 10) || 2000;

		this.connect();

		this.lastHeartBeat = new Date().getTime();

		this.setCouchdbStatus(this.COUCHDB_STATUS_DISCONNECTED);

		setInterval(this.checkHeartbeat.bind(this), 1000);
	}

	checkHeartbeat() {
		const currentTime = new Date().getTime();

		if (currentTime - this.lastHeartBeat > 15000) {
			if (this.couchDbConnection) {
				this.couchDbConnection.destroy();
			}
		}
	}

	connect() {
		let client = http;

		if (this.protocol === 'https') {
			client = https;
		}

		const requestOptions = this.getRequestOptions();

		this.lastHeartBeat = new Date().getTime();

		client.request(requestOptions, (response) => {
			this.couchDbConnection = response;

			this.couchDbConnection.on('data', (data) => {
				this.setCouchdbStatus(this.COUCHDB_STATUS_CONNECTED);

				const messages = data.toString().split('\n').filter((value) => {
					return value !== '';
				});

				if (messages.length > 0) {
					for (let change of messages) {
						let couchdbChange = JSON.parse(change);

						this.lastEventId = couchdbChange.seq;

						this.emit('data', couchdbChange);
					}
				} else {
					this.lastHeartBeat = new Date().getTime();
				}
			});

			this.couchDbConnection.on('end', () => {
				this.reconnect();
			});
		}).on('error', (error) => {
			this.emit('couchdb_error', error);
			this.reconnect('end');
		}).end();
	}

	reconnect() {
		this.setCouchdbStatus(this.COUCHDB_STATUS_DISCONNECTED);

		setTimeout(this.connect.bind(this), 1000);
	}

	setCouchdbStatus(status) {
		if (this.couchdbStatus !== status) {
			this.couchdbStatus = status;

			this.emit('couchdb_status', status);
		}
	}

	getRequestOptions() {
		let couchDbPath = `/${encodeURIComponent(this.db)}`;

		couchDbPath += `/_changes`;
		couchDbPath += `?feed=continuous`;
		couchDbPath += `&heartbeat=${this.heartbeat}`;

		if (this.includeDocs) {
			couchDbPath += '&include_docs=true';
		}

		if (this.lastEventId) {
			let lastEventId = encodeURIComponent(this.lastEventId);

			couchDbPath += `&last-event-id=${lastEventId}`;
		}

		return {
			host: this.host,
			port: this.port,
			path: couchDbPath,
			method: 'get'
		};
	}
}

module.exports = CouchdbChangeEvents;
