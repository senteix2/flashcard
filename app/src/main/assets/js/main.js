window.addEventListener('load', (event) => {
  console.log('page is fully loaded');
  showStore();
   move(0);  
});

const restoreButton = document.querySelector("#restore");
restoreButton.addEventListener('click', restoreBackup);
const cleanButton = document.querySelector('#clean');
cleanButton.addEventListener('click', cleanDatabase);
const getconfigButton = document.querySelector('#getconfig');
getconfigButton.addEventListener('click', getConfigFromDatabase);
const getdataButton = document.querySelector('#getdata');
getdataButton.addEventListener('click', getDataFromDatabase); 
const inOrderButton = document.querySelector('#inorder');
inOrderButton.addEventListener('click', inOrder); 
const shuffleButton = document.querySelector('#shuffle');
shuffleButton.addEventListener('click', shuffle); 



const nextButton = document.querySelector('#next');
nextButton.addEventListener('click', next); 
const previousButton = document.querySelector('#previous');
previousButton.addEventListener('click', previous); 
const flipcardButton = document.querySelector('#A3');
flipcardButton.addEventListener('click', flipcard); 
const easyButton = document.querySelector('#easy');
easyButton.addEventListener('click', easy); 
const hardButton = document.querySelector('#hard');
hardButton.addEventListener('click', hard); 

async function getConfigFromDatabase(){
	let data = await service("config").getAllFromStore(); 
	dataCallback(data);
}

async function getDataFromDatabase(){
	let data = await service("flashcard").getAllFromStore();
	dataCallback(data);  
}

function dataCallback(data){
         console.log(data.length) ;
}

function restoreBackup(){

	let sheetconfig =  backup.config.name
		.reduce((o, k, i) => ({...o, [k]: backup.config.value[i]} ), {});
	let newconfig =  backup.config.name
		.reduce((o, k, i) => ([...o, {name:k ,value: backup.config.value[i]}] ), []);
	
	let originalData  = backup[sheetconfig.sheet] ;
	let data  =  originalData[Object.keys(originalData)[0]] 
			.reduce((acc, value, index, array) => { 
				let partial = Object.keys(originalData)
						    .reduce((columns, column, i) => 
							({...columns, [column]: originalData[column][index] } ), {});			
				acc.push(partial)
			  	return acc;
				}, [] ); 
	
	service("flashcard").saveOrUpdateList(data); 
	service("config").saveOrUpdateList([sheetconfig]); 
	showStore(); 
}

function cleanDatabase(){
	service("flashcard").cleanStore(); 
	service("config").cleanStore(); 
	showStore();
}

function displayOn(id, value){
	var element = document.querySelector("#"+id);
	element.innerHTML = value ; 
}

function changeClass(id, value){
	var element = document.querySelector("#"+id);
	element.className = value ; 
}

async function showStore(){  
 	var size = await service("flashcard").getStoreSize();
	displayOn("totalCards",size)
}

function getStatusDescription(value){
  var status = ["new", "hard", "normal" ,"easy" , "learned" , "hard"] ; 
  return  status[value] ;     
};

async function inOrder() {
  var config  = await service("config").getAllFromStore(); 
  var data =  await service("flashcard").getAllFromStore(); 

  for(var i = 0;i<data.length; i++) {    
    data[i].order = i;
  }

  service("flashcard").saveOrUpdateList(data); 
  return true;
};

async function shuffle() {
  var config  = await service("config").getAllFromStore(); 
  var data = await service("flashcard").getAllFromStore(); 
  var total = data.length ;
 
  var done = [] ;
  for(var i = 0;i< total; i++) {    
    done[i]= i; 
  }
  
  for(var i = 0;i< total;i++) {  
    var random =Math.floor( Math.random() * (done.length))  ;
    data[i].order=done[random] ; 
    done.splice(random,1) ;  
   } 
   service("flashcard").saveOrUpdateList(data); 
  return true;
};


async function move(movement){
  let configs  = await service("config").getAllFromStore();   
  let config = configs[0];
  var data =  await service("flashcard").getAllFromStore(); 
  var current =  config.current;
  var total = data.length ; 
  if (!(!isNaN(parseFloat(current)) && isFinite(current))){
    current = 0;
  }
  current= current+ movement; 
  
  if(current>=total){
     current = 0;
  }
  
  if(current<0){
    current = total - 1;
  }

  let currentRow = data[current].order ;   
  await displayFlashCard(data,config , current); 

  config.current = current; 
  service("config").saveOrUpdateList([config]); 
  return true;
};

async function displayFlashCard(data , config , current){   
  let currentRow =  data[current].order
  let showStatus = data[currentRow].status; 
  let showing = data[currentRow][config.showing]
  displayOn(config.display, showing); 
  displayOn(config.local, current + 1); 
  displayOn(config.global, currentRow + 1); 
  
  if (!(!isNaN(parseFloat(showStatus)) && isFinite(showStatus))){
    showStatus = 0;
  }

  displayOn(config.showStatus, getStatusDescription(showStatus)); 
  data[currentRow].status = showStatus ;
  
  let style = "question" ;
  if(showing.length>50){ 
      style = "answer" ;
  }
  changeClass(config.display,style)
  
  service("flashcard").saveOrUpdateList([data[currentRow]]); 
  return true ;
}

async function changeStatus (increament ){ 
  var config  = await service("config").getAllFromStore();  
  var current =  config.current;
  var data =  await service("flashcard").getAllFromStore(); 
  
  if (!(!isNaN(parseFloat(current)) && isFinite(current))){
    current = 0;
  }
    
  var currentRow = data[current].order ;
  var showStatus = data[currentRow].status ;
  showStatus = showStatus + increament; 
  if(showStatus<0){
    showStatus = 0;
  }
  if(showStatus>4){
    showStatus = 4;
  }
  data[currentRow].status = showStatus ; 
  service("flashcard").saveOrUpdateList([data[currentRow]]); 
  displayOn(config.showStatus, getStatusDescription(showStatus)); 
  return true ;
}

function hard (){ 
  changeStatus(-1);
}
function easy (){ 
  changeStatus(+1);
}


async function next (){
  let configs  = await service("config").getAllFromStore();  
  let config = configs[0] ;
  config.showing = "question" ;
  service("config").saveOrUpdateList([config]); 
  move(1);
}

async function previous (){
  let configs  = await service("config").getAllFromStore();  
  let config = configs[0] ; 
  config.showing = "question" ;
  service("config").saveOrUpdateList([config]); 
  move(-1);
}

async function flipcard(){
  let configs  = await service("config").getAllFromStore();  
  let config = configs[0] ;
  if("question" === config.showing ){
    config.showing = "answer" ;
  }else{
    config.showing = "question" ;
  }
  service("config").saveOrUpdateList([config]); 
  move(0);  
}

function service(targetName){
	let serviceobj = {getStoreSize: getTarget(targetName,getStoreSize),
			   cleanStore: getTarget(targetName,cleanStore) ,
			   saveOrUpdateList : getTarget(targetName, saveOrUpdateList) ,
			   getAllFromStore : getTarget(targetName, getAllFromStore)  } ; 
	return serviceobj
       
}

function getTarget(targetName,method){
	let target = {database : application.database , target : application[targetName] } ;
	let instance = method.bind(target)
	return instance;
}

async function facade(targetName, method ,data){
	let target = {database : application.database , target : application[targetName] } ;
	let instance = method.bind(target,data)
	return await instance();
}
