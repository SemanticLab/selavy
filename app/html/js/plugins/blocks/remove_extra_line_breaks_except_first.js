


function remove_extra_line_breaks_except_first(text){

	var text = text.split('\n')

	var first = text[0]
	// remove first line
	text.shift()	
	var rest = text.join(' ')
	
	text = first + '\n' + rest
	text = text.replace(/  +/g, ' ')
	

	return text

}