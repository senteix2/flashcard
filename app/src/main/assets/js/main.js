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
    nativeService["speak"] = speak ;
    nativeService["getHtml"] = getHtml ;
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
/*
const cleanButton = document.querySelector('#clean');
cleanButton.addEventListener('click', cleanDatabase); */

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

const restrictSelect= document.querySelector('#restrictFrom');
restrictSelect.addEventListener("change", changeRestrict);
const restrictDirection= document.querySelector('#restrictDirection');
restrictDirection.addEventListener("click", changeRestrictDirection);


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

    if(!(typeof config.curentRestrict === 'undefined' || config.curentRestrict === '')){
        restrictSelect.value = config.curentRestrict ;
    }else{
        let ev = {target: restrictSelect } ;
        changeRestrict(ev);
    }

    if(!(typeof config.curentDirection === 'undefined' || config.curentDirection === '')){
        restrictDirection.value = config.curentDirection ;
    }else{
        let ev = {target: restrictDirection } ;
        changeRestrictDirection(ev);
    }

}

const statusList = [ "hard", "normal","new" ,"easy" , "learned" ] ;
function getStatusDescription(value){
  return  statusList[value] ;
};

async function inOrder() {
  var data =  await service("flashcard").getAllFromStore(); 

  for(var i = 0;i<data.length; i++) {    
    data[i].order = i;
  }

  service("flashcard").saveOrUpdateList(data);
  move(0);
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
   move(0);
  return true;
};


async function move(movement){
  let configs  = await service("config").getAllFromStore();   
  let config = configs[0];
  var data =  await service("flashcard").getAllFromStore();
  let currentTarget = 0 ;

  if(config){
      var current =  config.current;
      var movementScale =  1 ;
      var total = data.length ;
      let stats = analyzeStatus(data) ;

      if (!(!isNaN(parseFloat(current)) && isFinite(current))){
        current = 0;
      }


      do{
            currentTarget = current+ (movement*movementScale) ;
            currentTarget = applyLimits(currentTarget,  total) ;
            let currentRow = data[currentTarget].order ;

            if(Math.abs(movement)>0){

               let real = verifyRestrictionMovement(config.curentRestrict, config.curentDirection,stats);

               if(real<2){
                  alert("No more cards with the restricted status selected");
                  return false ;
               }else{

                    let showStatus = data[currentRow].status;
                    showStatus = parseStatus(showStatus);
                    pass =!verifyRestriction( showStatus, config.curentRestrict, config.curentDirection,stats)
                    movementScale ++ ;
               }
            }else{ pass = false ;  }

      }while(pass)



      await displayFlashCard(data,config , currentTarget , stats);

      config.current = currentTarget;
      service("config").saveOrUpdateList([config]);
  }else{
    changeClass("A3","question")
  }
  return true;
};

function applyLimits(current , total){
      if(current>=total){
         current = current - total;
      }

      if(current<0){
        current = total - 1;
      }
      return current ;
}

function verifyRestrictionMovement(restriction, direction , stats ){
         let real = 0 ;
         if(direction==="="){
            real = real + stats[restriction];
         }
         if(direction===">="){
            Object.keys(stats).forEach( (item, index) => {
                                    if(restriction >= item){
                                        real = real +  stats[item]    ;
                                    }
                            });

         }
         if(direction==="<="){
                     console.log(stats)
                     Object.keys(stats).forEach( (item, index) => {
                                             if(restriction <= item){
                                                 real = real + stats[item]  ;
                                             }
                                     });

          }

          return real ;

}

function verifyRestriction(value , restriction, direction , stats ){
         let real = false ;
         if(direction==="="){
            real = value  ==  restriction;
         }
         if(direction===">="){
             real = restriction  >=  value;
         }
         if(direction==="<="){
             real = restriction <= value ;
          }

          return real ;

}

function analyzeStatus(data){
     let result = data.reduce( ( obj  ,element) => {
            let current = parseStatus(element.status);
              // alert("status:"+element.status+" current:"+ current);
          	 if (!obj[current]) {
                  obj[current] = 1;
              } else {
                  obj[current]++;
              }
              return obj;
           } , {0:0,1:0,2:0,3:0,4:0} );

     return result;
}

async function displayFlashCard(data , config , current, stats){
  let total = data.length ;
  let currentRow =  data[current].order
  let showStatus = data[currentRow].status; 
  let showing = data[currentRow][config.showing]
  let speakThis = showing ;
  if("answer" === config.showing ){
    let question = data[currentRow][config.hidding]
    showing = "<b>"+data[currentRow][config.hidding]+"</b><br>"+showing ;
    speakThis = question;

    let card = data[currentRow] ;
    let examplesText = "";

    if(typeof card.examples === 'undefined' || card.examples === ''){
       console.log("examples is not defined '"+card.examples+"'  "+( typeof card.examples === 'undefined')+" "+ (card.examples === ''));
       let examples = getUsageExamples(question) ;

       examples.forEach( (item, index) => {
                       examplesText = examplesText + "<br><br>" + item.content + "<br> <a href="+item.url + ">"+ item.label+"</a>" ;
                              });

        data[currentRow].examples = examplesText ;
        service("flashcard").saveOrUpdateList([data[currentRow]]);
    }else{
        console.log("examples is defined '"+card.examples+"'  "+( typeof card.examples === 'undefined')+" "+ (card.examples === ''));
        examplesText = card.examples ;
    }

    showing = showing + examplesText


  }

  displayOn(config.display, showing); 
  displayOn(config.local, current + 1); 
  displayOn(config.global, currentRow + 1); 
  

  showStatus = parseStatus(showStatus)


  displayOn(config.showStatus, getStatusDescription(showStatus)); 
  data[currentRow].status = showStatus ;

  let style = config.showing ;
  changeClass(config.display,style)

  speak(speakThis)
  
  service("flashcard").saveOrUpdateList([data[currentRow]]);

   statusList.forEach( (item, index) => {
              		 //document.getElementById("status"+index).innerHTML += index + ":" + result[index] ;
              		 displayOn("status"+index, stats[index]+" ("+( (stats[index]/total)*100 ).toFixed(0)+"%)" );
              });



  return true ;
}

function parseStatus(status){
   if (!(!isNaN(parseFloat(status)) && isFinite(status))){
    return 2;
   }
   if(!isNaN(status)){
    return status ;
   }
}


async function changeStatus (increament ){
  let configs  = await service("config").getAllFromStore();
  let config = configs[0];
  var current =  config.current;
  var data =  await service("flashcard").getAllFromStore();
  let total = data.length ;
  
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

  let stats = analyzeStatus(data) ;

  statusList.forEach( (item, index) => {
                		 //document.getElementById("status"+index).innerHTML += index + ":" + result[index] ;
                		 displayOn("status"+index, stats[index]+" ("+( (stats[index]/total)*100 ).toFixed(0)+"%)" );
                });
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
	return serviceobj ;
       
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
   // blockNone("clean")
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



function speak(speakThis){
   if(nativeService.external){
        let data =   application.voice ;
        data.text =  speakThis ;
        nativeService.speak(JSON.stringify(data)) ;
   }else{
        speechSynthesis.speak(createSpeech(removeTags(speakThis)));
   }
}


function getHtml(url){
   if(nativeService.external){
        return  nativeService.getHtml(url) ;
   }else{
        return "";
   }
}

function createSpeech(text){
    const msg = new SpeechSynthesisUtterance();
    msg.volume = application.voice.volume; // 0 to 1
    msg.rate = application.voice.rate; // 0.1 to 10
    msg.pitch = application.voice.pitch ; // 0 to 2
    msg.text  =  text;
    msg.voiceURI = application.voice.name;
    msg.lang = application.voice.lang   ;
    return msg ;
}

function removeTags(htmlText){
    var div = document.createElement("div");
    div.innerHTML = htmlText;
    var text = div.textContent || div.innerText || "";
    return text ;
}


function getUsageExamples(word){
        let example = application.example ;
        let url = example.url + word.toLowerCase();+ "&maxResults=" + example.maxResults + "&startOffset="+example.startOffset;
        let jsonData  = getHtml(url);
        console.log("jsonData:"+jsonData)
        let  result = jsonData===""? "" :JSON.parse(jsonData) ;

        let exampleData = [] ;
        if(!(result === "")){
            let sentences = result.result.sentences;
            for(let i=0; i<sentences.length; i++){
                example ={};
                example.label = sentences[i].volume.corpus.name ;
                example.url = sentences[i].volume.locator ;
                example.content = sentences[i].sentence ;
                exampleData.push(example) ;
            }

        }
        return exampleData ;
}

async function changeRestrict(event){
    let configs  = await service("config").getAllFromStore();
    let config = configs[0];
    config.curentRestrict = event.target.value ;
    service("config").saveOrUpdateList([config]);
}

async function changeRestrictDirection(event){
    let configs  = await service("config").getAllFromStore();
    let config = configs[0];
    let currentDirection =  event.target.value ;
    if(currentDirection === ">="){
        currentDirection = "<=" ;
    }else if(currentDirection === "<="){
        currentDirection = "=" ;
    }else{
        currentDirection = ">=" ;
    }

    event.target.value = currentDirection  ;
    config.curentDirection =currentDirection ;
    service("config").saveOrUpdateList([config]);
}