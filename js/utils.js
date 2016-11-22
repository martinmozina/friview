var normalizedMiniMax;

function getCriteriaWeightOLD(name){
    //console.log("klic getCriteriaWeight za name = " + name);
    var criteria = model.getCriteriaToList();
    
    for( var c in criteria ){
        if(name == criteria[c].name){
            //console.log("getCriteriaWeight returns " + criteria[c].weight);
            return criteria[c].weight / 100;
        }
    }
}

function getCriteriaWeight(name){
    var criteria = model.getCriteriaToList();
    for(var c in criteria){
        if(name == criteria[c].name){
            return criteria[c].finalNormalizedWeight;
        }
    }

    return null;
}


function normalizeData(){
    normalizedData = [];
    
    console.log("normaliziram podatke...");
    var criteria = window.model.getCriteriaToList();
    var variants = window.model.getVariants();
    
	try{
		for(var c = 0; c < criteria.length; c++){
			var cdata = {};
			var cname = criteria[c].name;
			cdata.type = criteria[c].name;
			
			var scaleType = criteria[c].scaleType;
			var valFuncType = criteria[c].valFuncType;
			
			if(valFuncType == null){
				alert("value function za kriterij " + cname + " je null");
			}
			
			for(var v in Object.keys(variants)){
				var vkey = "var"+v;
				//console.log(cname + " " + vkey);
				var value = 0;
				
				if(scaleType == "fixed" && valFuncType == "discrete"){
					value = window.model.getValOfFixedDiscrete(cname, variants[v][cname])
				}
				
				if(scaleType == "fixed" && valFuncType == "piecewise"){
					value = window.model.getValOfFixedPicewise(cname, variants[v][cname])
				}
				
				if(scaleType == "fixed" && valFuncType == "linear"){
					
						value = window.model.getValOfFixedLinear(cname, Number(variants[v][cname]))
					
				}
				
				if(scaleType == "relative" && valFuncType == "linear"){
					value = window.model.getValOfRelativeLinear(cname, Number(variants[v][cname]))
				}
				
				if(scaleType == "relative" && valFuncType == "piecewise"){
					value = window.model.getValOfRelativePicewise(cname, Number(variants[v][cname]))
				}
				
				cdata[vkey] = value;
			}
			
			normalizedData.push(cdata);
		}
	}catch(neki){
		console.log(neki);
	}
    
}

function getLinearN(k, x, y){
    return y - (k * x);
}

function getSensitivityStartY(x1, y1, x2, y2){
    var k = (y2 - y1) / (x2 - x1);
    console.log("K = " + k);
    return getLinearN(k, x1, y1);
}

function isInTriangle (px,py,ax,ay,bx,by,cx,cy){

//credit: http://www.blackpawn.com/texts/pointinpoly/default.html

    var v0 = [cx-ax,cy-ay];
    var v1 = [bx-ax,by-ay];
    var v2 = [px-ax,py-ay];

    var dot00 = (v0[0]*v0[0]) + (v0[1]*v0[1]);
    var dot01 = (v0[0]*v1[0]) + (v0[1]*v1[1]);
    var dot02 = (v0[0]*v2[0]) + (v0[1]*v2[1]);
    var dot11 = (v1[0]*v1[0]) + (v1[1]*v1[1]);
    var dot12 = (v1[0]*v2[0]) + (v1[1]*v2[1]);

    var invDenom = 1/ (dot00 * dot11 - dot01 * dot01);

    var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    var v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return ((u >= 0) && (v >= 0) && (u + v < 1));
}

function getMaxOfArray(array, mode){ //mode == "I" -> index
    var max = 0;
    var maxIndex = null;
    
    for(var i = 0; i < array.length; i++){
        if(array[i] > max){
            max = array[i];
            maxIndex = i;
        }
    }
    
    if(mode == "I"){
        return maxIndex;
    }else{
        return max;
    }
    
}

/*function getMaxOfArray(array){
    return getMaxOfArray(array, "X");
}*/

function getMinOfArray(array, mode){ //mode == "I" -> index
    var min = 100;
    var minIndex = null;
    
    for(var i = 0; i < array.length; i++){
        if(array[i] < min){
            min = array[i];
            minIndex = i;
        }
    }
    
    if(mode == "I"){
        return minIndex;
    }else{
        return min;
    }
    
}

/*function getMinOfArray(array){
    getMinOfArray(array, "X");
}*/

function normalizeDataWithWeights(){
    //normalizedData ne sme biti null
    normalizedDataWithWeights = [];    
    
    for(var i = 0; i < normalizedData.length; i++){
        var criteria = {};
        
        var currNormCrit = normalizedData[i];        
        criteria.type = currNormCrit.type;
        
        for(var j = 0; j < Object.keys(normalizedData[i]).length - 1; j++){
            var ind = "var" + j;
            
            criteria[ind] = currNormCrit[ind] * getCriteriaWeight(currNormCrit.type);
        }
        
        normalizedDataWithWeights.push(criteria);
    }
}

function calculateValueDifference(criteria, incDecValue, incDecIndicator){
	var cVDValue = incDecValue;
	
	if(incDecIndicator == "D"){
		cVDValue = incDecValue * (-1);
	}
	
	var cVDCriteria = model.getCriteria(criteria);
	var criteriaMax = cVDCriteria.maxValue;
	var criteriaMin = cVDCriteria.minValue;
	
	var cVDDifference = criteriaMax - criteriaMin;
	var cVDValueDifference = cVDDifference * (cVDValue / 100);
	
	if(cVDCriteria.inverseScale == "true"){
		return criteriaMax - cVDValueDifference;
	}else{
		return criteriaMin - cVDValueDifference;
	}
}

function hasDuplicates(array) {
    return (new Set(array)).size !== array.length;
}

function hasDuplicatedValue(value, array){
	var count = 0;
	for(var i = 0; i < array.length; i++){
		if(array[i] == value){
			count++;
		}
	}
	if(count > 1){
		return true;
	}else{
		return false;
	}
}


function calcualteMaxiMinX(level, previousMinimums){
	console.log("maximin level: " + level +"  " + previousMinimums);
	var mamMinimums = [];
	var mamCriteria = window.model.getCriteriaToList();
	var mamVariants = window.model.getVariants();
	var numVariants = Object.keys(mamVariants).length;
	
	if(previousMinimums == null){
		previousMinimums = [];
		for(var ii = 0; ii < numVariants; ii++){
			previousMinimums.push(-1);
		}
	}
	
	if(numVariants < level){
		console.log("calculateMaxiMin level je vecji od stevila variant");
		return;
	}
	
	for(var i = 0; i < numVariants; i++){
		var mamCurr = "var" + i;
		var currentMinimum = 100;
		
		for(var j = 0; j < normalizedData.length; j++){
			if(normalizedData[j][mamCurr] < currentMinimum && normalizedData[j][mamCurr] > previousMinimums[i]){
				currentMinimum = normalizedData[j][mamCurr];				
			}
		}
		
		mamMinimums.push(currentMinimum);
	}
	
	if(hasDuplicatedValue(getMaxOfArray(mamMinimums), mamMinimums)){
		calcualteMaxiMin(level+1, mamMinimums);
	}else{
		console.log(getMaxOfArray(mamMinimums, "I"));
		return getMaxOfArray(mamMinimums, "I");
	}
}

function calcualteMiniMaxX(level, previousMaximums){
	console.log("minimax level: " + level +"  " + previousMaximums);
	var mimMaximums = [];
	var mimCriteria = window.model.getCriteriaToList();
	var mimVariants = window.model.getVariants();
	var numVariants = Object.keys(mimVariants).length;
	
	if(previousMaximums == null){
		previousMaximums = [];
		for(var ii = 0; ii < numVariants; ii++){
			previousMaximums.push(101);
		}
	}
	
	if(numVariants < level){
		console.log("calculateMinimax level je vecji od stevila variant");
		return;
	}
	
	for(var i = 0; i < numVariants; i++){
		var mimCurr = "var" + i;
		var currentMaximum = 0;
		
		for(var j = 0; j < normalizedData.length; j++){
			if(normalizedData[j][mimCurr] > currentMaximum && normalizedData[j][mimCurr] < previousMaximums[i]){
				currentMaximum = normalizedData[j][mimCurr];				
			}
		}
		
		mimMaximums.push(currentMaximum);
	}
	
	if(hasDuplicatedValue(getMinOfArray(mimMaximums), mimMaximums)){
		calcualteMiniMax(level+1, mimMaximums);
	}else{
		console.log(getMinOfArray(mimMaximums, "I"));
		return getMinOfArray(mimMaximums, "I");
	}
}

function calcualteMaxiMinX(level, previousMinimums){
	console.log("maximin level: " + level +"  " + previousMinimums);
	var mamMinimums = [];
	var mamCriteria = window.model.getCriteriaToList();
	var mamVariants = window.model.getVariants();
	var numVariants = Object.keys(mamVariants).length;
	
	if(previousMinimums == null){
		previousMinimums = [];
		for(var ii = 0; ii < numVariants; ii++){
			previousMinimums.push(-1);
		}
	}
	
	if(numVariants < level){
		console.log("calculateMaxiMin level je vecji od stevila variant");
		return;
	}
	
	for(var i = 0; i < numVariants; i++){
		var mamCurr = "var" + i;
		var currentMinimum = 100;
		
		for(var j = 0; j < normalizedData.length; j++){
			if(normalizedData[j][mamCurr] < currentMinimum && normalizedData[j][mamCurr] > previousMinimums[i]){
				currentMinimum = normalizedData[j][mamCurr];				
			}
		}
		
		mamMinimums.push(currentMinimum);
	}
	
	if(hasDuplicatedValue(getMaxOfArray(mamMinimums), mamMinimums)){
		calcualteMaxiMin(level+1, mamMinimums);
	}else{
		console.log(getMaxOfArray(mamMinimums, "I"));
		return getMaxOfArray(mamMinimums, "I");
	}
}

function calcualteMiniMax(level){ //klices vedno z level 0
	if(level == 0){
		normalizedMiniMax = clone(normalizedData);
	}
	
	
	console.log("minimax level: " + level);
	console.log(normalizedMiniMax);
	var mimMaximums = [];
	var mimCriteria = window.model.getCriteriaToList();
	var mimVariants = window.model.getVariants();
	var numVariants = Object.keys(mimVariants).length;
	
	
	
	if(numVariants < level){
		console.log("calculateMinimax level je vecji od stevila variant");
		return;
	}
	
	for(var i = 0; i < numVariants; i++){//za vse variante ugotovimo maximum
		var mimCurr = "var" + i;
		var currentMaximum = 0;
		
		for(var j = 0; j < normalizedMiniMax.length; j++){
			if(normalizedMiniMax[j][mimCurr] > currentMaximum){
				currentMaximum = normalizedMiniMax[j][mimCurr];				
				//normalizedMiniMax[j][mimCurr] = 0;
			}
		}
		
		mimMaximums.push(currentMaximum);
	}
	
	if(hasDuplicatedValue(getMinOfArray(mimMaximums), mimMaximums)){//ce sta dva maximuma enaka klicemo rekurz
		console.log("duplicate mimums of max: " + getMinOfArray(mimMaximums));
		
		for(var i = 0; i < numVariants; i++){
		var mimCurr2 = "var" + i;
		var currentMaximum = 0;
		
		for(var j = 0; j < normalizedMiniMax.length; j++){
			if(normalizedMiniMax[j][mimCurr2] == getMinOfArray(mimMaximums)){
				normalizedMiniMax[j][mimCurr2] = 0;
				break;
			}
		}
		
		//mimMaximums.push(currentMaximum);
		}
		
		mimMaximums = [];
		
		return calcualteMiniMax(level+1);
	}else{
		console.log(getMinOfArray(mimMaximums, "I"));//Min je prav
		normalizedMiniMax = null;
		return getMinOfArray(mimMaximums, "I");
	}
}

function calcualteMaxiMax(level){ //klices vedno z level 0
	if(level == 0){
		normalizedMaxiMax = clone(normalizedData);
	}
	
	
	console.log("maximax level: " + level);
	console.log(normalizedMaxiMax);
	var mamaMaximums = [];
	var mamaCriteria = window.model.getCriteriaToList();
	var mamaVariants = window.model.getVariants();
	var numVariants = Object.keys(mamaVariants).length;
	
	
	
	if(numVariants < level){
		console.log("calculateMaximax level je vecji od stevila variant");
		return;
	}
	
	for(var i = 0; i < numVariants; i++){//za vse variante ugotovimo maximum
		var mamaCurr = "var" + i;
		var currentMaximum = 0;
		
		for(var j = 0; j < normalizedMaxiMax.length; j++){
			if(normalizedMaxiMax[j][mamaCurr] > currentMaximum){
				currentMaximum = normalizedMaxiMax[j][mamaCurr];				
				//normalizedMiniMax[j][mimCurr] = 0;
			}
		}
		
		mamaMaximums.push(currentMaximum);
	}
	
	if(hasDuplicatedValue(getMaxOfArray(mamaMaximums), mamaMaximums)){//ce sta dva maximuma enaka klicemo rekurz
		console.log("duplicate mimums of max: " + getMaxOfArray(mamaMaximums));
		
		for(var i = 0; i < numVariants; i++){
		var mamaCurr2 = "var" + i;
		var currentMaximum = 0;
		
		for(var j = 0; j < normalizedMaxiMax.length; j++){
			if(normalizedMaxiMax[j][mamaCurr2] == getMaxOfArray(mamaMaximums)){
				normalizedMaxiMax[j][mamaCurr2] = 0;
				break;
			}
		}
		
		//mimMaximums.push(currentMaximum);
		}
		
		mamaMaximums = [];
		
		return calcualteMaxiMax(level+1);
	}else{
		console.log(getMaxOfArray(mamaMaximums, "I"));
		normalizedMaxiMax = null;
		return getMaxOfArray(mamaMaximums, "I");
	}
}

function calcualteMaxiMin(level){ //klices vedno z level 0
	if(level == 0){
		normalizedMaxiMin = clone(normalizedData);
	}
	
	
	console.log("maximin level: " + level);
	console.log(normalizedMaxiMin);
	var mamiMinimums = [];
	var mamiCriteria = window.model.getCriteriaToList();
	var mamiVariants = window.model.getVariants();
	var numVariants = Object.keys(mamiVariants).length;
	
	
	
	if(numVariants < level){
		console.log("calculateMaximin level je vecji od stevila variant");
		return;
	}
	
	for(var i = 0; i < numVariants; i++){//za vse variante ugotovimo maximum
		var mamiCurr = "var" + i;
		var currentMinimum = 100;
		
		for(var j = 0; j < normalizedMaxiMin.length; j++){
			if(normalizedMaxiMin[j][mamiCurr] < currentMinimum){
				currentMinimum = normalizedMaxiMin[j][mamiCurr];				
				//normalizedMiniMax[j][mimCurr] = 0;
			}
		}
		
		mamiMinimums.push(currentMinimum);
	}
	
	if(hasDuplicatedValue(getMaxOfArray(mamiMinimums), mamiMinimums)){//ce sta dva maximuma enaka klicemo rekurz
		console.log("duplicate maximums of min: " + getMaxOfArray(mamiMinimums));
		
		for(var i = 0; i < numVariants; i++){
		var mamiCurr2 = "var" + i;
		var currentMinimum = 100;
		
		for(var j = 0; j < normalizedMaxiMax.length; j++){
			if(normalizedMaxiMin[j][mamiCurr2] == getMaxOfArray(mamiMinimums)){
				normalizedMaxiMin[j][mamiCurr2] = 100;
				break;
			}
		}
		
		//mimMaximums.push(currentMaximum);
		}
		
		mamiMinimums = [];
		
		return calcualteMaxiMin(level+1);
	}else{
		console.log(getMaxOfArray(mamiMinimums, "I"));
		normalizedMaxiMin = null;
		return getMaxOfArray(mamiMinimums, "I");
	}
}


function lexicographicOrder(){
	var lexVariants = window.model.getVariants();
	var lexNumVariants = Object.keys(lexVariants).length;
	
	var lexSums = [];
	
	for(var i = 0; i < lexNumVariants; i++){//za vse variante ugotovimo maximum
		var lexCurr = "var" + i;
		var lexSum = 0;
		
		for(var j = 0; j < normalizedData.length; j++){
			lexSum = lexSum + normalizedData[j][lexCurr];
		}
		
		lexSums.push(lexSum);
	}
	
	//razvrstimo
	var lexIndexes = []
	
	for(var i = 0; i < lexSums.length; i++){
		var lexMaxInd = getMaxOfArray(lexSums, "I");		
		lexSums[lexMaxInd] = 0;		
		
		lexIndexes.push(lexMaxInd);
	}
	
	return lexIndexes;
}

function lexicographicOrder2(){
	var lexBestVariants = [];
	var lexVariants = window.model.getVariants();
	var lexNumVariants = Object.keys(lexVariants).length;
	
	for(var i = 0; i < normalizedData.length; i++){
		var lexCurrCrit = normalizedData[i];
		var lexCurrBest = {value:0, label:null};
		for(var j = 0; j < lexNumVariants; j++){
			var v = "var"+j;
			
			if(lexCurrCrit[v] > lexCurrBest.value){
				lexCurrBest.value = lexCurrCrit[v];
				lexCurrBest.label = v;
			}			
		}
		
		lexBestVariants.push(lexCurrBest.label);
	}
	
	var lexVariantCounts = getRepeatCountFromArray(lexBestVariants);
	var lexBestVariantCounts = [];
	for(var i = 0; i < lexVariantCounts.length; i++){
		lexBestVariantCounts.push(parseInt(lexVariantCounts[i].label.substring(3)));
	}
	
	return lexBestVariantCounts;
}


function normalizeDataWithNodesOLD(){
	
	
	//var ndwnData = clone(normalizedDataWithWeights);
	var ndwnParents = [];
	for(var i = getMaxTreeDepth(); i > -1; i--){
		var ndwnNodes = getNodesOnTreeDepth(i);
		
		for(var j = 0; j < ndwnNodes.length; j++){
			var ndwnNode = ndwnNodes[j]
			var ndwnParent = ndwnNode.parent;
			if(ndwnNode.children == null){//gre za list drevesa
				for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
					var ndwnVarName = "var"+k;
					
					if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = getValueFromNormalizedData(ndwnNode.name, ndwnVarName, normalizedDataWithWeights);
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] + getValueFromNormalizedData(ndwnNode.name, ndwnVarName, normalizedDataWithWeights);
					}
					
				}		
			
			}else{//gre za node
				for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
					var ndwnVarName = "var"+k;
					
					if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = ndwnNode[ndwnVarName];
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] + ndwnNode[ndwnVarName];
					}
					
				}	
			}
			//ndwnParents.push(ndwnParent);
			window.model.updateNode(ndwnParent.name, ndwnParent);
		}
	}
	
	
	normalizedDataWithNodes = clone(normalizedDataWithWeights);
	
	var ndwnAllNodes = window.model.getNodesToList();
	
	for(var i = 0; i < ndwnAllNodes.length; i++){
		var ndwnForNorm = {};
		
		var ndwnCurrentNode = ndwnAllNodes[i];
		ndwnForNorm["type"] = ndwnCurrentNode.name;
		
		if(ndwnCurrentNode.type == "root" || ndwnCurrentNode.type == "node"){
			for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
				var ndwnVarName2 = "var"+k;				
				ndwnForNorm[ndwnVarName2] = ndwnCurrentNode[ndwnVarName2];
			}
			
			normalizedDataWithNodes.push(ndwnForNorm);
		}		
	}
	
	//return window.model.getNodesToList();
}

function normalizeDataWithNodes(){
    normalizedDataWithNodes = clone(normalizedDataWithWeights);

    var nodes = window.model.getNodesToList();

    for(var i = 0; i < nodes.length; i++){
        var node = nodes[i];

        if(node.type == "node"){
            var entry = {};
            entry.type = node.name;

            for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
            	var varName = "norm_var"+k;
            	var varName2 = "var"+k;

                entry[varName2] = node[varName];

            }

            normalizedDataWithNodes.push(entry);
        }
    }

}


function normalizeDataWithNodesWW(){//WW -> without weights
	
	
	//var ndwnData = clone(normalizedDataWithWeights);
	var ndwnParents = [];
	for(var i = getMaxTreeDepth(); i > -1; i--){
		var ndwnNodes = getNodesOnTreeDepth(i);
		
		for(var j = 0; j < ndwnNodes.length; j++){
			var ndwnNode = ndwnNodes[j]
			var ndwnParent = ndwnNode.parent;
			if(ndwnNode.children == null){//gre za list drevesa
				for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
					var ndwnVarName = "wwvar"+k;
					
					if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(2), normalizedData);
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] + getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(2), normalizedData);
					}
					
				}		
			
			}else{//gre za node
				for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
					var ndwnVarName = "wwvar"+k;
					
					if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = ndwnNode[ndwnVarName];
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] + ndwnNode[ndwnVarName];
					}
					
				}	
			}
			//ndwnParents.push(ndwnParent);
			window.model.updateNode(ndwnParent.name, ndwnParent);
		}
	}
	
	
	normalizedDataWithNodesWW = clone(normalizedData);
	
	var ndwnAllNodes = window.model.getNodesToList();
	
	for(var i = 0; i < ndwnAllNodes.length; i++){
		var ndwnForNorm = {};
		
		var ndwnCurrentNode = ndwnAllNodes[i];
		ndwnForNorm["type"] = ndwnCurrentNode.name;
		
		if(ndwnCurrentNode.type == "root" || ndwnCurrentNode.type == "node"){
			for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
				var ndwnVarName2 = "wwvar"+k;				
				ndwnForNorm[ndwnVarName2.substring(2)] = ndwnCurrentNode[ndwnVarName2];
			}
			
			normalizedDataWithNodesWW.push(ndwnForNorm);
		}		
	}
	
	//return window.model.getNodesToList();
}


function normirajUtezi(){
	
	var ndwnParents = [];
	for(var i = getMaxTreeDepth(); i > -1; i--){
		var ndwnNodes = getNodesOnTreeDepth(i);
		
		for(var j = 0; j < ndwnNodes.length; j++){
			var ndwnNode = ndwnNodes[j]
			var ndwnParent = ndwnNode.parent;
			
			if(ndwnParent.childrenWeights != null){
				if(ndwnNode.weight != null){
					ndwnParent.childrenWeights.push(parseInt(ndwnNode.weight));
				}
				
			}else{
				//ndwnParent.childrenWeights = [];
				if(ndwnNode.weight != null){
					ndwnParent.childrenWeights = [parseInt(ndwnNode.weight)];
				}
			}
			
			/*if(ndwnParent.childrenWeights == null){
				ndwnParent.childrenWeights = [];
			}
			if(ndwnNode.weight != null){
				ndwnParent.childrenWeights.push(ndwnNode.weight);
			}*/
			
			if(ndwnParent.weight == null){
				ndwnParent.weight = parseInt(ndwnNode.weight);
			}else{
				ndwnParent.weight = parseInt(ndwnParent.weight) + parseInt(ndwnNode.weight);
			}
			
			window.model.updateNode(ndwnParent.name, ndwnParent);
		}
	}
	
	for(var i = getMaxTreeDepth(); i > -1; i--){
		var ndwnNodes = getNodesOnTreeDepth(i);
		//console.log("depth:" + i);
		for(var j = 0; j < ndwnNodes.length; j++){
			var ndwnNode = ndwnNodes[j]
			//console.log("ndwnNode:"+ndwnNode.name);
			if(ndwnNode.type != "root"){
				var ndwnParent = ndwnNode.parent;
				var chWeights = ndwnParent.childrenWeights;
				var perc = uteziVProcente(chWeights);

				for(var k = 0; k < chWeights.length; k++){
					if(chWeights[k] == ndwnNode.weight){
						ndwnNode.normWeight = perc[k];
					}
				}
				
				window.model.updateNode(ndwnParent.name, ndwnParent);
				window.model.updateNode(ndwnNode.name, ndwnNode);
			}else{
				ndwnNode.normWeight = 100;
				window.model.updateNode(ndwnNode.name, ndwnNode);
			}
			
			
		}
	}	
	
	for(var i = getMaxTreeDepth(); i > -1; i--){
		var ndwnNodes = getNodesOnTreeDepth(i);
		
		for(var j = 0; j < ndwnNodes.length; j++){
			var ndwnNode = ndwnNodes[j]
			var ndwnParent = ndwnNode.parent;
			if(ndwnNode.children == null){//gre za list drevesa
				for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
					var ndwnVarName = "norm_var"+k;
					console.log("ndwnNode.normWeight " + ndwnNode.normWeight);
					/*if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) * (parseFloat(ndwnNode.normWeight) / 100);
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] + (getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) * (parseFloat(ndwnNode.normWeight) / 100));
					}*/
					
					/*if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = (getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) 
							* (parseFloat(ndwnNode.weight))) / ndwnParent.weight;
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] 
							+ ((getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) 
							   * (parseFloat(ndwnNode.weight))) / ndwnParent.weight);
					}*/
                    if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = (getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData)
							* (parseFloat(ndwnNode.finalNormalizedWeight))) / ndwnParent.finalNormalizedWeight;
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName]
							+ ((getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData)
							   * (parseFloat(ndwnNode.finalNormalizedWeight))) / ndwnParent.finalNormalizedWeight);
					}

					
				}		
			
			}else{//gre za node
				for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
					var ndwnVarName = "norm_var"+k;
					//1.
					/*if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = ndwnNode[ndwnVarName];
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] + ndwnNode[ndwnVarName];
					}*/
					//2.
					/*if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) * (parseFloat(ndwnNode.normWeight) / 100);
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] + (getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) * (parseFloat(ndwnNode.normWeight) / 100));
					}*/
					//3.
					/*if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = (getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) 
							* (parseFloat(ndwnNode.weight))) / ndwnParent.weight;
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] 
							+ ((getValueFromNormalizedData(ndwnNode.name, ndwnVarName.substring(5), normalizedData) 
							   * (parseFloat(ndwnNode.weight))) / ndwnParent.weight);
					}*/
					//4.
					/*if(ndwnParent[ndwnVarName] == null){
						ndwnParent[ndwnVarName] = (ndwnNode[ndwnVarName] * ndwnNode.weight) / ndwnParent.weight;
					}else{
						ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] +	((ndwnNode[ndwnVarName] * ndwnNode.weight) / ndwnParent.weight);	
					}*/
					//5.
					if(ndwnParent[ndwnVarName] == null){
                    	ndwnParent[ndwnVarName] = (ndwnNode[ndwnVarName] * ndwnNode.finalNormalizedWeight) / ndwnParent.finalNormalizedWeight;
                    }else{
                    	ndwnParent[ndwnVarName] = ndwnParent[ndwnVarName] +	((ndwnNode[ndwnVarName] * ndwnNode.finalNormalizedWeight) / ndwnParent.finalNormalizedWeight);
                    }

					
				}	
			}
			//ndwnParents.push(ndwnParent);
			window.model.updateNode(ndwnParent.name, ndwnParent);
		}
	}
	
	/*normalizedDataWithNodes = clone(normalizedDataWithWeights);
	
	var ndwnAllNodes = window.model.getNodesToList();
	
	for(var i = 0; i < ndwnAllNodes.length; i++){
		var ndwnForNorm = {};
		
		var ndwnCurrentNode = ndwnAllNodes[i];
		ndwnForNorm["type"] = ndwnCurrentNode.name;
		
		if(ndwnCurrentNode.type == "root" || ndwnCurrentNode.type == "node"){
			for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
				var ndwnVarName2 = "var"+k;				
				ndwnForNorm[ndwnVarName2] = ndwnCurrentNode[ndwnVarName2];
			}
			
			normalizedDataWithNodes.push(ndwnForNorm);
		}		
	}*/
	
	//return window.model.getNodesToList();
}


function getValueFromNormalizedData(criteria, index, normDataArray){
	for(var i = 0; i < normDataArray.length; i++){
		if(normDataArray[i].type == criteria){
			return normDataArray[i][index];
		}
	}
	
	return null;
}

function setValueToNormalizedData(criteria, index, normDataArray, value){
	for(var i = 0; i < normDataArray.length; i++){
		if(normDataArray[i].type == criteria){
			normDataArray[i][index] = value;
		}
	}
	
	return normDataArray;
}

function setTestNormalizedData(){
	normalizedData = [
		{type:"crit1", var0: 10, var1: 50, var2: 30},
		{type:"crit2", var0: 20, var1: 10, var2: 45},
		{type:"crit3", var0: 30, var1: 60, var2: 10},
		{type:"crit4", var0: 40, var1: 70, var2: 65},
	];
}

function clone(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}


function getMaxTreeDepth(){
	var depthAllNodes = window.model.getNodesToList();
	var depthMax = 0;
	
	for(var i = 0; i < depthAllNodes.length; i++){
		if(depthAllNodes[i].depth > depthMax){
			depthMax = depthAllNodes[i].depth;
		}
	}
	
	return depthMax;
}

function getNodesOnTreeDepth(depth){
	var levelAllNodes = window.model.getNodesToList();
	var levelNodesOnDepth = [];
	
	for(var i = 0; i < levelAllNodes.length; i++){
		if(levelAllNodes[i].depth == depth){
			levelNodesOnDepth.push(levelAllNodes[i]);
		}
	}
	
	return levelNodesOnDepth;
}

function line_intersect(x1, y1, x2, y2, x3, y3, x4, y4, var_a, var_b) //by paul bourke
{
    var ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
    if (denom == 0) {
        return null;
    }
    ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
    ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
    return {
        x: x1 + ua*(x2 - x1),
        y: y1 + ua*(y2 - y1),
        seg1: ua >= 0 && ua <= 1,
        seg2: ub >= 0 && ua <= 1,
		vara: var_a,
		varb: var_b
    };
}

function findSensitivityIntersections(bestVariant, currentValue, data){
	var fsiIntersections = [];
	
	//var fsiTestData = [{Label:0, var0:0, var1:30, var2:70}, {Label:100, var0:20, var1:100, var2:50}];
	var fsiTestData = data;//[{"Label":0,var0:86.15384615384613,"trenVred":null,var1:56.92307692307692,var2:41.53846153846154},{"Label":100,var0:33.33333333333334,"trenVred":null,var1:100,var2:0}];
	//Object.keys(window.model.getVariants()).length
	
	for(var i = 0; i < Object.keys(window.model.getVariants()).length; i++){
		var fsiCurVar = "var" + i;
		//var fsiPossibleIntersection = line_intersect(fsiTestData[0][fsiCurVar]);
		for(var j = 0; j < Object.keys(window.model.getVariants()).length; j++){
			var fsiCurVar2 = "var" + j;
			
			if(i != j){
				var fsiPossibleIntersection = line_intersect(
					0,
					fsiTestData[0][fsiCurVar],
					100,
					fsiTestData[1][fsiCurVar],
					0,
					fsiTestData[0][fsiCurVar2],
					100,
					fsiTestData[1][fsiCurVar2],
					fsiCurVar,
					fsiCurVar2
					);
				
				if(fsiPossibleIntersection != null && fsiPossibleIntersection.x > 0 && fsiPossibleIntersection.y > 0){
					fsiIntersections.push(fsiPossibleIntersection);
				}
			}
		}
	
	}
	
	//remove duplicaties from fsiIntersections
	var fsiRealIntersections = [];
	var fsiRealIntersections2 = [];
	
	
	
	for(var i = 0; i < fsiIntersections.length; i++){
		var fsiRealContains = false;
		
		for(var j = 0; j < fsiRealIntersections.length; j++){
			if(fsiIntersections[i].x == fsiRealIntersections[j].x
			   && fsiIntersections[i].y == fsiRealIntersections[j].y){
				fsiRealContains = true;
			}
		}
		
		if(!fsiRealContains && (fsiIntersections[i].vara == bestVariant || fsiIntersections[i].varb == bestVariant)){
			fsiRealIntersections.push(fsiIntersections[i]);
		}
	}
	
	
	var fsiLeftDifferences = [];
	var fsiRightDifferences = [];
	
	for(var i = 0; i < fsiRealIntersections.length; i++){
		if(fsiRealIntersections[i].x > currentValue){
			fsiLeftDifferences.push(999);
			fsiRightDifferences.push(fsiRealIntersections[i].x - currentValue);
		}else if(fsiRealIntersections[i].x < currentValue){
			fsiRightDifferences.push(999);
			fsiLeftDifferences.push(currentValue - fsiRealIntersections[i].x);
		}	
	}
	
	var fsiMinLeftIndex = getMinOfArray(fsiLeftDifferences, "I");
	var fsiMinRightIndex = getMinOfArray(fsiRightDifferences, "I");
	
	for(var i = 0; i < fsiRealIntersections.length; i++){
		if(i == fsiMinLeftIndex){
			fsiRealIntersections[i].position = "left";
			fsiRealIntersections2.push(fsiRealIntersections[i]);
		}
		
		if(i == fsiMinRightIndex){
			fsiRealIntersections[i].position = "right";
			fsiRealIntersections2.push(fsiRealIntersections[i]);
		}
		
	}
	console.log(fsiRealIntersections2);
	return fsiRealIntersections2;
}


function getRepeatCountFromArray(array){
	var variants = [];
	var variantCounts = [];
	for(var i = 0; i < array.length; i++){
		if(variants.indexOf(array[i]) == -1){
			variants.push(array[i]);
		}
	}
	
	for(var i = 0; i < variants.length; i++){
		var currVariant = {count:0, label:variants[i]};
		
		for(var j = 0; j < array.length; j++){
			if(array[j] == currVariant.label){
				currVariant.count = currVariant.count + 1;
			}
		}
		
		variantCounts.push(currVariant);
	}
	
	variantCounts.sort(function(a, b) {
    	return parseFloat(b.count) - parseFloat(a.count);
	});
	
	return variantCounts;	
	
}

function uteziVProcente(array){
	var out = [];
	
	var sum = 0;
	for(var i = 0; i < array.length; i++){
		sum = sum + array[i];
	}
	
	for(var i = 0; i < array.length; i++){
		out.push((array[i]*100)/sum);
	}
	
	return out;
}