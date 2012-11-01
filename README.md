IndexedDB.js
============

IndexedDB.js let's you manipulate easily this database in your application. Before using it, make sure it's working properly on your targeted browsers.

It has been tested with Chrome 21+ and Firefox 15+.

You can open the test.html file to see it works on your browsers.

Usage
-----
The constructor can take up to 5 parameters:
```javascript
	database: database name
	version: version number (integer only)
	structure: object representing your database (example below)
	openingCallback: function called when the database is opened
	upgradeCallback: function called when the database is upgraded via the old way using setVersion() (like in chrome)
	
	opening and upgrade callbacks parameters are objects built like this:
	{
		fn: 'function to call',
		context: 'object'
	}
```
Structure object example:
```javascript
{
	storeName: {
		options: {
			keyPath: 'object property used as keyPath',
			autoIncrement: true|false
		},
		indexes: [	//can be an array or a single object
			{
				name: 'index name',
				keyPath: 'object property used for the index',
				options: {unique: true|false}
			}
		],
		defaultValues: [	//can be an array of objects or a single object
			{name: 'object inserted at the database creation only'}
		]
	}
}
```

The object provide a basic CRUD and some other functions such as readAll, empty, find and destroyDatabase.

### `IndexedDB.create()`
```javascript
	IndexedDB.create(
		'objectStoreName', 
		{object: 'to store'},	//do not specify the keyPath property
		function (event) {
			//will be called when the object is stored
			
			var keyPath = event.target.result;
		},
		function (event) {
			//will be called if indexeddb fails to create the object
		},
		contextObjectAppliedOnCallbacks
	);
```

### `IndexedDB.read()`
```javascript
	IndexedDB.read(
		'objectStoreName',
		'keyPathValue',
		function (event) {
			//will be called when the object is retrieved
			
			var wishedObject = event.target.result;
		},
		function (event) {
			//will be called if indexeddb fails to retrieve the object
		},
		contextObjectAppliedOnCallbacks
	);
```

### `IndexedDB.readAll()`
```javascript
	IndexedDB.readAll(
		'objectStoreName',
		function (event) {
			//will be called when objects are retrieved
			//all objects are not retrieved at once
			
			var result = event.target.result;
			
			if (!!result === false) {
			
				//no more object to retrieve
				return;
			
			}
			
			myObject = result.value;
			
			//continue to the next object (this will recall this function)
			result.continue();
		},
		function (event) {
			//will be called if indexeddb fails to retrieve objects
		},
		contextObjectAppliedOnCallbacks
	);
```

### `IndexedDB.update()`

Alias of the create method, but this time in the object parameter the keyPath property has to be specified (in order to match the object in the database)

### `IndexedDB.remove()`
```javascript
	IndexedDB.remove(
		'objectStoreName',
		'keyPathValue',
		function (event) {
			//will be called if the object is deleted
		},
		function (event) {
			//will be called if indexeddb fails to delete the object
		},
		contextObjectAppliedOnCallbacks
	);
```

### `IndexedDB.empty()`
```javascript
	IndexedDB.empty(
		'objectStoreName',
		function (event) {
			//will be called when the objectStore has been emptied
		},
		function (event) {
			//will be called if indexeddb fails to empty the objectStore
		},
		contextObjectAppliedOnCallbacks
	);
```

### `IndexedDB.find()`
```javascript
	IndexedDB.find(
		'objectStoreName',
		'indexName',
		'value to search'|[lowerBound, upperBound], //if array bounds are included in the search
		function (event) {
			//will be called when objects are retrieved
			//all objects are not retrieved at once
			
			var result = event.target.result;
			
			if (!!result === false) {
			
				//no more object to retrieve
				return;
			
			}
			
			myObject = result.value;
			
			//continue to the next object (this will recall this function)
			result.continue();
		},
		function (event) {
			//will be called if indexeddb fails to retrieve objects
		},
		contextObjectAppliedOnCallbacks
	);
```

### `IndexedDB.close()`
Close the connection to the database.

### `IndexedDB.destroyDatabase()`
Delete the whole database, no survivors.