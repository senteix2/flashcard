application={
	database: "flashcardApp", 
	flashcard: {store:"flashcard", index: { column: "question" , unique: true }},
	config: {store:"config", index: { column: "sheet" , unique: true }},
	defaultUrl :"http://sheet-link.com"
}
