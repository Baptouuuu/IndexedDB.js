/**
	* This is a wrapper to IndexedDB databases
	*
	* Example object for the structure:
	* <code>
	*	{
	*		storeName: {
	*			options: {
	*				keyPath: 'object property used as keyPath',
	*				autoIncrement: true|false
	*			},
	*			indexes: [
	*				{
	*					name: 'index name',
	*					keyPath: 'object property used for the index',
	*					options: {unique: true|false}
	*				}
	*			],
	*			defaultValues: [
	*				{name: 'default object to insert by default'}
	*			]
	*		}
	*	}
	* </code>
	* Default values will be inserted only when the database is created with version number to 1
	*
	* @param	string		[database] Database name
	* @param	integer		[version] Database version number
	* @param	object		[structure] See description above
	* @param	function	[openingCallback] {fn: 'function to call', context: 'object'}
	* @param	object		[upgradeCallback] {fn: 'function to call', context: 'object'}
*/

var IndexedDB = function (database, version, structure, openingCallback, upgradeCallback) {

	this.connection = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
	this.transaction = window.IDBTransaction || window.webkitIDBTransaction;
	this.keyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
	this.transactionModes = {
		READ_ONLY: 'readonly',
		READ_WRITE: 'readwrite'
	};
	
	this.db = null;
	
	this.dbName = database || 'default';
	this.version = version || 1;
	this.structure = structure || {
		defaultStore: {
			options: {
				keyPath: 'id', 
				autoIncrement: true
			},
			indexes: {
				name: 'id', 
				keyPath: 'id', 
				options: {unique: false}
			},
			defaultValues: {}
		}
	};
	this.openingCallback = openingCallback;
	this.upgradeCallback = upgradeCallback;
	
	this.isReady = false;
	
	this.open();

};

IndexedDB.prototype = {

	open: function () {
	
		var self = this,
			request = self.connection.open(self.dbName, self.version);
		
		console.log('Opening the database "' + self.dbName + '"...');
		
		request.onupgradeneeded = function (event) {
			self.dbUpgrade.call(self, event, false);
		};
		
		request.onsuccess = function (event) {
			self.requestSuccess.call(self, event);
		};
		
		request.onerror = function (event) {
			console.log('***DATABASE ERROR***', event);
		};
		
		request.onblocked = function (event) {
			console.log('***DATABASE BLOCKED***', event);
		};
	
	},
	
	/**
		* Called when the db opening succeeded
	*/
	
	requestSuccess: function (event) {
	
		var self = this;
		
		self.db = event.target.result;
		
		self.db.onerror = function (event) {
			console.log('***DATABASE ERROR***', event);
		};
		
		//old way to update db until Google Chrome move to onupgradeneeded
		if (self.version !== self.db.version && typeof self.db.setVersion === 'function') {
		
			var versionRequest = self.db.setVersion(self.version);
			
			versionRequest.onsuccess = function (event) {
				self.dbUpgrade.call(self, event, true);
			};
		
		}
		
		self.isReady = true;
		
		console.log('Database opened!');
		
		/* execute callback here only if no database upgrade needed */
		if (self.openingCallback !== undefined && self.version === self.db.version) {
		
			self.openingCallback.fn.call(self.openingCallback.context);
		
		}
	
	},
	
	/**
		* Called if the database version number has been incremented
	*/
	
	dbUpgrade: function (event, chrome) {
	
		var self = this;
		
		self.isReady = false;
		
		console.log('Upgrading database...');
		
		if (chrome === true) {
		
			self.db = event.target.source;
		
		} else {
		
			self.db = event.target.result;
		
		}
		
		for (var storeName in self.structure) {
		
			if (!self.db.objectStoreNames.contains(storeName)) {
			
				var objectStore = self.db.createObjectStore(
					storeName,
					self.structure[storeName].options
				);
				
				if (self.structure[storeName].defaultValues !== undefined && self.version === 1) {
				
					var values = self.structure[storeName].defaultValues;
					
					if (values instanceof Array) {
						
						for (var i = 0, l = values.length; i < l; i++) {
						
							objectStore.put(values[i]);
						
						}
					
					} else if (values instanceof Object) {
					
						objectStore.put(values);
					
					}
				
				}
			
			}
		
			/* create indexes if there're not existing */
			if (self.structure[storeName].indexes !== undefined) {
			
				var indexes = self.structure[storeName].indexes,
					objectStore = event.target.transaction.objectStore(storeName);
				
				if (indexes instanceof Array) {
				
					for (var i = 0, l = indexes.length; i < l; i++) {
					
						if (!objectStore.indexNames.contains(indexes[i].name)) {
						
							objectStore.createIndex(indexes[i].name, indexes[i].keyPath, indexes[i].options);
						
						}
					
					}
				
				} else if (indexes instanceof Object && !objectStore.indexNames.contains(indexes.name)) {
				
					objectStore.createIndex(indexes.name, indexes.keyPath, indexes.options);
				
				}
			
			}
		
		}
		
		//deletion of stores non present in the database structure
		for (var i = 0, l = self.db.objectStoreNames.length; i < l; i++) {
		
			if (self.structure[self.db.objectStoreNames[i]] === undefined) {
			
				self.db.deleteObjectStore(self.db.objectStoreNames[i]);
			
			}
		
		}
		
		console.log('Database upgraded to version: ' + self.version + '!');
		
		self.isReady = true;
		
		/* same function as openingCallback but only for chrome; because chrome open the database before upgrading, the normal flow is upgrade then open the database */
		if (self.upgradeCallback !== undefined && chrome === true) {
		
			self.upgradeCallback.fn.call(self.openingCallback.context, event);
		
		}
	
	},
	
	/**
		* Create an object into the store
		* keyPath returned via event.target.result
	*/
	
	create: function (storeName, object, onSuccess, onError, context) {
	
		if (this.isReady === false || this.structure[storeName] === undefined) {
		
			return;
		
		}
		
		try {
		
			var transaction = this.db.transaction([storeName], this.transactionModes.READ_WRITE),
				store = transaction.objectStore(storeName),
				request = store.put(object),
				context = context || window;
			
			if (onSuccess !== undefined) {
			
				request.onsuccess = function (event) {
					onSuccess.call(context, event);
				};
			
			}
			
			if (onError !== undefined) {
			
				request.onerror = function (event) {
					onError.call(context, event);
				};
			
			}
		
		} catch (error) {
		
			if (onError !== undefined) {
			
				onError.call(context, error);
			
			}
		
		}
	
	},
	
	/**
		* Read an object from the store
		* object returned via event.target.result
	*/
	
	read: function (storeName, id, onSuccess, onError, context) {
	
		if (this.isReady === false || this.structure[storeName] === undefined) {
		
			return;
		
		}
		
		try {
		
			var transaction = this.db.transaction([storeName], this.transactionModes.READ_ONLY),
				store = transaction.objectStore(storeName),
				request = store.get(id),
				context = context || window;
				
			if (onSuccess !== undefined) {
			
				request.onsuccess = function(event) {
					onSuccess.call(context, event);
				};
			
			}
			
			if (onError !== undefined) {
			
				request.onerror = function(event) {
					onError.call(context, event);
				};
			
			}
		
		} catch (error) {
		
			if (onError !== undefined) {
			
				onError.call(context, error);
			
			}
		
		}
	
	},
	
	/**
		* Read all items of an object store
	*/
	
	readAll: function (storeName, onSuccess, onError, context) {
	
		if (this.isReady === false || this.structure[storeName] === undefined) {
		
			return;
		
		}
		
		try {
		
			var transaction = this.db.transaction([storeName], this.transactionModes.READ_ONLY),
				store = transaction.objectStore(storeName),
				keyRange = this.keyRange.lowerBound(0),
				request = store.openCursor(keyRange),
				context = context || window;
			
			if (onSuccess !== undefined) {
			
				request.onsuccess = function(event) {
					onSuccess.call(context, event);
				};
			
			}
			
			if (onError !== undefined) {
			
				request.onerror = function(event) {
					onError.call(context, event);
				};
			
			}
		
		} catch (error) {
		
			if (onError !== undefined) {
			
				onError.call(context, error);
			
			}
		
		}
	
	},
	
	/**
		* Update an object inside a store
	*/
	
	update: function (storeName, object, onSuccess, onError, context) {
	
		this.create(storeName, object, onSuccess, onError, context);
	
	},
	
	/**
		* Delete an object inside a store
	*/
	
	remove: function (storeName, id, onSuccess, onError, context) {
	
		if (this.isReady === false || this.structure[storeName] === undefined) {
		
			return;
		
		}
		
		try {
		
			var transaction = this.db.transaction([storeName], this.transactionModes.READ_WRITE),
				store = transaction.objectStore(storeName),
				request = store.delete(id),
				context = context || window;
			
			if (onSuccess !== undefined) {
			
				request.onsuccess = function (event) {
					onSuccess.call(context, event);
				};
			
			}
			
			if (onError !== undefined) {
			
				request.onerror = function (event) {
					onError.call(context, event);
				};
			
			}
		
		} catch (error) {
		
			if (onError !== undefined) {
			
				onError.call(context, error);
			
			}
		
		}
	
	},
	
	/**
		* Delete all objects inside an object store
	*/
	
	empty: function (storeName, onSuccess, onError, context) {
	
		if (this.isReady === false || this.structure[storeName] === undefined) {
		
			return;
		
		}
		
		try {
		
			var transaction = this.db.transaction([storeName], this.transactionModes.READ_WRITE),
				store = transaction.objectStore(storeName),
				request = store.clear(),
				context = context || window;
			
			if (onSuccess !== undefined) {
			
				request.onsuccess = function (event) {
					onSuccess.call(context, event);
				};
			
			}
			
			if (onError !== undefined) {
			
				request.onerror = function (event) {
					onError.call(context, event);
				};
			
			}
		
		} catch (error) {
		
			if (onError !== undefined) {
			
				onError.call(context, error);
			
			}
		
		}
	
	},
	
	/**
		* Search elements with a specific term, or an array of two bounds, on an index
	*/
	
	find: function (storeName, indexName, term, onSuccess, onError, context) {
	
		if (this.isReady === false || this.structure[storeName] === undefined) {
		
			return;
		
		}
		
		try {
		
			var transaction = this.db.transaction([storeName], this.transactionModes.READ_ONLY),
				store = transaction.objectStore(storeName),
				keyRange = null,
				index = store.index(indexName),
				request = null,
				context = context || window;
			
			if (term instanceof Array && term.length === 2) {
			
				if (term[0] === 0) {
				
					keyRange = this.keyRange.upperBound(term[1]);
				
				} else if (term[1] === 0) {
				
					keyRange = this.keyRange.lowerBound(term[0]);
				
				} else {
				
					keyRange = this.keyRange.bound(term[0], term[1]);
				
				}
			
			} else {
			
				keyRange = this.keyRange.only(term);
			
			}
			
			
			request = index.openCursor(keyRange);
			
			if (onSuccess !== undefined) {
			
				request.onsuccess = function (event) {
					onSuccess.call(context, event);
				};
			
			}
			
			if (onError !== undefined) {
			
				request.onerror = function (event) {
					onError.call(context, event);
				};
			
			}
		
		} catch (error) {
		
			if (onError !== undefined) {
			
				onError.call(context, error);
			
			}
		
		}
	
	},
	
	/**
		* Close database connection
	*/
	
	close: function() {
	
		this.db.close();
	
	},
	
	/**
		* Destroy whole database
	*/
	
	destroyDatabase: function() {
	
		this.connection.deleteDatabase(this.dbName);
	
	}

};