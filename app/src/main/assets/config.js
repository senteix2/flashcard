application={
	database: "flashcardApp", 
	flashcard: {store:"flashcard", index: { column: "question" , unique: true }},
	config: {store:"config", index: { column: "sheet" , unique: true }},
	defaultUrl :"http://sheet-link.com" ,
	voice: { volume:1 , rate: 1, pitch: 1 ,  voiceURI: "native" , lang:  "en-US"  }
}
