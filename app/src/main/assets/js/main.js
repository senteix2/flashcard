window.addEventListener('load', (event) => {
  console.log('page is fully loaded');
  showStore();
  move(0);
});

try{
    if ((nativeService) && typeof nativeService.getBackup === "function") {
        nativeService["external"]= true ;
    }

}catch{
    this.nativeService = [] ;
    nativeService["external"] = false ;
    nativeService["getBackup"] = getBackup ;
}



function getBackup(url){
    return backup;
}

function proccessBackup(){
    let realBackup = {} ;
    console.log("nativeservice: "+nativeService.external) ;
    let url = getStringFrom("sheet");
    if(nativeService.external&&!(url===application.defaultUrl)){

        let jsonBackup = nativeService.getBackup(url);
        console.log("jsonBackup ",jsonBackup.length);
        realBackup = JSON.parse(jsonBackup) ;

    }else{
        realBackup = backup ;
    }
    return realBackup ;
}

const restoreButton = document.querySelector("#restore");
restoreButton.addEventListener('click', restoreBackup);
const cleanButton = document.querySelector('#clean');
cleanButton.addEventListener('click', cleanDatabase);
const inOrderButton = document.querySelector('#inorder');
inOrderButton.addEventListener('click', inOrder); 
const shuffleButton = document.querySelector('#shuffle');
shuffleButton.addEventListener('click', shuffle); 
const configButton = document.querySelector('#config');
configButton.addEventListener('click', showhide);


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

const B2display = document.querySelector('#B2');
B2display.addEventListener("keypress", goto);



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
async function restoreBackup(){

   // addDiv("responsiveTable", "loader" , "Loading")
    await changeOpacity("loader");
    await doBackup();
    await changeOpacity("loader");
    //removeDiv("loader") ;
    move(0);
}

 async function doBackup(){


    console.log("changing opacity of :"+loader);


    let dataBackup = proccessBackup();
	let sheetconfig =  dataBackup.config.name
		.reduce((o, k, i) => ({...o, [k]: dataBackup.config.value[i]} ), {});
	// let newconfig =  dataBackup.config.name.reduce((o, k, i) => ([...o, {name:k ,value: dataBackup.config.value[i]}] ), []);

	console.log("sheetconfig to save: "+JSON.stringify(sheetconfig));
	
	let originalData  = dataBackup[sheetconfig.sheet] ;
	let data  =  originalData[Object.keys(originalData)[0]] 
			.reduce((acc, value, index, array) => { 
				let partial = Object.keys(originalData)
						    .reduce((columns, column, i) => 
							({...columns, [column]: originalData[column][index] } ), {});			
				acc.push(partial)
			  	return acc;
				}, [] );

	sheetconfig.sheeturl = getStringFrom("sheet");
	sheetconfig.current = 0 ;
	
	service("flashcard").saveOrUpdateList(data); 
	service("config").saveOrUpdateList([sheetconfig]); 
	showStore();
	await inOrder() ;

    console.log("changing again opacity of  :"+loader);
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

function getValueFrom(id){
	var element = document.querySelector("#"+id);
	return parseInt(element.innerHTML);
}

function getStringFrom(id){
	var element = document.querySelector("#"+id);
	return element.innerHTML;
}

function changeClass(id, value){
	var element = document.querySelector("#"+id);
	element.className = value ; 
}
function getClassFrom(id){
	var element = document.querySelector("#"+id);
	return element.className ;
}


async function showStore(){  
 	var size = await service("flashcard").getStoreSize();
	displayOn("totalCards",size)
	let configs  = await service("config").getAllFromStore();
    let config = configs[0];
    let sheeturl = "";
    if(config&&config.sheeturl){
        sheeturl = config.sheeturl ;
        console.log("IT WORKED config.sheeturl:"+config.sheeturl)
    }else{
        sheeturl = application.defaultUrl ;
        console.log("IT DIDNT WORKED config.sheeturl: "+config)
    }
    displayOn("sheet",sheeturl);
}

function getStatusDescription(value){
  var status = [ "hard", "normal","new" ,"easy" , "learned" ] ;
  return  status[value] ;     
};

async function inOrder() {
  var data =  await service("flashcard").getAllFromStore(); 

  for(var i = 0;i<data.length; i++) {    
    data[i].order = i;
  }

  service("flashcard").saveOrUpdateList(data); 
  return true;
};

async function shuffle() {
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

  if(config){
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
  }else{
    changeClass("A3","question")
  }

  return true;
};

async function displayFlashCard(data , config , current){   
  let currentRow =  data[current].order
  let showStatus = data[currentRow].status; 
  let showing = data[currentRow][config.showing]

  if("answer" === config.showing ){
    showing = "<b>"+data[currentRow][config.hidding]+"</b><br>"+showing ;
  }

  displayOn(config.display, showing); 
  displayOn(config.local, current + 1); 
  displayOn(config.global, currentRow + 1); 
  
  if (!(!isNaN(parseFloat(showStatus)) && isFinite(showStatus))){
    showStatus = 2;
  }

  displayOn(config.showStatus, getStatusDescription(showStatus)); 
  data[currentRow].status = showStatus ;

  let style = config.showing ;
  changeClass(config.display,style)
  
  service("flashcard").saveOrUpdateList([data[currentRow]]); 
  return true ;
}

async function changeStatus (increament ){ 
  let configs  = await service("config").getAllFromStore();
  let config = configs[0];
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

async function goto (event){
  event = event || window.event;
  var charCode = event.which || event.keyCode;
  if(charCode == 13)
  {
      let configs  = await service("config").getAllFromStore();
      let config = configs[0] ;
      let newValue = getValueFrom(config.local)-1;
      let difference = newValue -  config.current ;
       move(difference);
  }
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
    config.hidding = "question" ;
  }else{
    config.showing = "question" ;
    config.hidding = "answer" ;
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

function showhide(){
    blockNone("sheet")
    blockNone("restore")
    blockNone("clean")
    blockNone("inorder")
    blockNone("shuffle")
}

function blockNone(id ){
 var x = document.querySelector("#"+id);
 //alert(x.id+" "+x.style+"  "+x.style.display)
 if (x.style.display === "none" || x.style.display === "") {
    x.style.display = "block";
 } else {
    x.style.display = "none";
 }
}


async function changeOpacity(id){
    var displayDiv = document.querySelector("#"+id);
    displayDiv.classList.toggle('block');
    reflow(displayDiv);
    displayDiv.classList.toggle('fade-in');
    const waitFor = delay => new Promise(resolve => setTimeout(resolve, delay));
    await waitFor(1500);
}


function reflow(elt){
    console.log(elt.offsetHeight);
}

function addDiv (target , temporal, message) {
  var displayDiv = document.querySelector("#"+target);
  var div = document.createElement('div');
  div.id = temporal;
  div.innerHTML = message
  displayDiv.appendChild(div);
}

function removeDiv (temporal) {
  var element = document.getElementById(temporal);
  element.parentNode.removeChild(element);
}
