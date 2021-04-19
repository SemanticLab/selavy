


function remove_block_break_text(text){
	
	text = text.replace(/~BLOCKBREAK~\n/g,'')
	text = text.replace(/~BLOCKBREAK~/g,'')
	
	return text

}