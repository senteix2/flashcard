window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || 
window.msIndexedDB;
 
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || 
window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || 
window.webkitIDBKeyRange || window.msIDBKeyRange
IDBTransaction.READ_WRITE="readwrite"
IDBTransaction.READ_ONLY="readonly"
 
if (!window.indexedDB) {
   window.alert("Your browser doesn't support a stable version of IndexedDB.")
}


async function getStoreSize(){
	this.action = "trying to open database for "+this.database+" to get size of store "+this.target.store; 
	this.mode = IDBTransaction.READ_ONLY;
	this.dataoperation = async (db, store) =>  { 
	return await new Promise( (resolve,reject) => {
		var total  =store.count() ;
		total.addEventListener("success" , () => resolve(total.result) )
		total.addEventListener("error" , () => { reject("could not perform store.count: "+this.action) ;} ) ;
		  
	});
	};
	this.errorfunction =  genericErrorDatabase.bind(this);
	this.upgradefunction = genericUpgradeCreation.bind(this);
	this.genericoperation =  genericDatabaseOperation.bind(this);
	this.successfunction = genericExecuteOperation.bind(this);
	
	let result = await this.genericoperation() ;
	return result ;
}



async function getAllFromStore(){
	this.action = "trying to open database for "+this.database+" to retrieve all elements from store "+this.target.store;
	this.mode = IDBTransaction.READ_ONLY ;
	this.dataoperation  = async (db, store) =>  { 
	return await new Promise( (resolve,reject) => {
				let request = store.getAll(); 
				request.addEventListener("success" , (event) => resolve(event.target.result) );
				request.addEventListener("error" , (event) => { reject("could not perform store.count: "+this.action) ;} ) ;
	});
	}
	
	this.errorfunction =  genericErrorDatabase.bind(this);
	this.upgradefunction = genericUpgradeCreation.bind(this);
	this.genericoperation = genericDatabaseOperation.bind(this);
	this.successfunction = genericExecuteOperation.bind(this);
	let result = await this.genericoperation() ; 
	return result ;
}

function saveOrUpdateFromIndex(db,store){
		let index = store.index(this.target.index.column);
		for(const element of this.data) {
			let countRequest = index.count(element[this.target.index.column]);
			countRequest.addEventListener("success" , () => { 
				if(countRequest.result>0){
					let cursorRequest = index.openCursor(element[this.target.index.column]);
					cursorRequest.addEventListener("success" , (event)=>{
						let cursor = event.target.result ; 
						if(cursor){ 
							const updateData = cursor.value ;
							for(property in element){
								updateData[property] = element[property];							
							}
							let requestUpdate = cursor.update(updateData);
							requestUpdate.addEventListener("success" , () => {  
								 console.log('success on updating '+element[this.target.index.column]+" in the database"); 
							});
						}else {
						      console.log('no more result in cursor for key '+element[this.target.index.column]+" in the database");    
						}
			
					} );
				}else{
					const info =  JSON.stringify(element[this.target.index.column], null, 4);
					console.log(this.target.store+" adding new : "+info);
					var result = store.add(element);
					result.addEventListener("success" , () => console.log("added: "+info) ) ; 
					result.addEventListener("error" , (event) => {  console.log("could not: "+info); genericErrorDatabase(event); } ) ;
				}

			});
	
		}

}



function saveOrUpdateList(data){ 
	this.action = "trying to open database for "+this.database+" to save or update on store "+this.target.store; 
	this.mode = IDBTransaction.READ_WRITE ; 
	this.data = data ;
	this.dataoperation = saveOrUpdateFromIndex.bind(this) ;
	this.errorfunction =  genericErrorDatabase.bind(this),
	this.upgradefunction = genericUpgradeCreation.bind(this),
	this.successfunction = genericExecuteOperation.bind(this), 
	this.genericoperation = genericDatabaseOperation.bind(this)
	this.genericoperation() ; 
}

function saveList(data){
	this.action = "trying to open database for "+this.database+" to persist on store "+this.target.store; 
	this.mode = IDBTransaction.READ_WRITE ;
	this.dataoperation = (db, store) => {
		for(var element of data ) {
			const info =  JSON.stringify(element[this.target.index.column], null, 4);
			console.log(this.target.store+" adding : "+info);
			var result = store.add(element);
			result.addEventListener("success" , () => console.log("added: "+info) ) ; 
			result.addEventListener("error" , (event) => {  console.log("could not: "+info); genericErrorDatabase(event); } ) ;
		}
	}

	this.errorfunction =  genericErrorDatabase.bind(this),
	this.upgradefunction = genericUpgradeCreation.bind(this),
	this.successfunction = genericExecuteOperation.bind(this), 
	this.genericoperation = genericDatabaseOperation.bind(this)
	this.genericoperation() ; 
}



async function genericErrorDatabase(event) {
       console.log("error: "+event.target.error.message+" when "+this.action);
};

async function genericUpgradeCreation(event) {
	 let db = event.target.result; 
	 let operation = event.target.operation ; 
	 if(!db.objectStoreNames.contains(this.target.store)) {
		var objectStore =db.createObjectStore(this.target.store, { keyPath: "id" , autoIncrement:true  });   
		objectStore.createIndex(this.target.index.column, this.target.index.column, { unique: this.target.index.unique });	
	 } 
}; 

async function genericUpgradeDeletion(event) {
	let db = event.target.result; 
	if(db.objectStoreNames.contains(this.target.store)) {
		db.deleteObjectStore(this.target.store);
	}
}; 

async function genericDatabaseOperation(){
	return await new Promise( (resolve,reject) => {
		var request= window.indexedDB.open(this.database, new Date().getTime());
		request.addEventListener("error", this.errorfunction);
		request.addEventListener("upgradeneeded", this.upgradefunction);
		request.addEventListener("success", (event) => {  resolve(this.successfunction(event)); } );
	});
}

async function genericExecuteOperation(event) {
	let db = event.target.result; 
	console.log("opening database version: "+ db.version+" and store:"+this.target.store);
	let tx = db.transaction( this.target.store, this.mode);
	let store = tx.objectStore(this.target.store);

	db.addEventListener("error", this.errorfunction );	
	let result = await this.dataoperation(db, store);
	tx.addEventListener("complete", () => console.log("transaction complete ")); 
	tx.addEventListener("error", () => console.log("error in transaction.. rolling back  ")); 
	db.close() ;
	return result;
};


async function cleanStore(){
	this.action = "trying to open database for "+this.database+" to clear store "+this.target.store; 
	this.errorfunction = genericErrorDatabase.bind(this);
	this.upgradefunction = genericUpgradeDeletion.bind(this);
	this.successfunction = async (event) => { 
	return await new Promise( (resolve,reject) => {
					resolve(true);
					event.target.result.close();	
			 });				
			 };
	this.genericoperation = genericDatabaseOperation.bind(this); 
	this.genericoperation() ;
}


