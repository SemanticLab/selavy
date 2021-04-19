


function remove_all_line_breaks(text){
	
	text = text.replace(/\n/g,' ')
	text = text.replace(/  +/g, ' ')

	return text

}