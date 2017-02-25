const proxyquire = require('proxyquire').noCallThru(),
	should = require('should');

describe('index', () => {
	it('exposes CouchdbChangeEvents class to outside world', () => {
		const CouchdbChangeEvents = proxyquire('../index', {
			'./src/couchdb-change-events': 'CouchdbChangeEvents'
		});

		should.equal(CouchdbChangeEvents, 'CouchdbChangeEvents');
	});
});
