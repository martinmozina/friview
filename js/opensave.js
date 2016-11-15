//////////////////////////////////
//////      TOP MODEL
//////////////////////////////////


function Model(){

    this._criteria = {};

    // Te bi verjetno lahko nekako izparsal vn
    this._treeProps = ['treeData', 'name', 'cid', 'children', 'parent', 'depth', 'type', 'description', 'inverseScale', 'maxValue', 'minValue', 'scaleType', 'valFuncType', 
    'valueFunction', 'points', 'weight', 'MACBETHData', 'MACBETHOptions', 'NENE', 'finalNormalizedWeight', 'levelNormalizedWeight', 'userWeight'];

    this._variants = {};
    this._varIDGen = 0;

    /// KRITERIJI oz. VOZLISCA:

    this.resetCriteria = function(){
        this._criteria = this.createNewEmptyRoot();
    }

    this.updateCriteria = function(model){
        this._criteria = model;
    }

    this.criteriaTreeToString = function(obj, p){                           //Popravi metodo, da ne bo potrebno vnašat v seznam....
        
        str = '{';
        
        var comma = "";
        for(var i = 0; i < p.length; i++){
            if(typeof obj[p[i]] === 'undefined'){
                continue;
            }
            if(p[i] == 'parent' && obj[p[i]] != 'null'){
                str += comma + '"' + p[i] + '" : "' + obj[p[i]].name + '"';
            }
            else if(p[i] == 'children'){
                str += comma + '"' + p[i] + '" : [';
                comma = "";
                
                for(var j = 0; j < obj[p[i]].length; j++){
                    str += comma + this.criteriaTreeToString(obj[p[i]][j], p);
                    comma = ',';
                }
                str += "]";
            }
            else if(p[i] == 'valueFunction'){
                str += comma + '"' + p[i] + '" : ' + JSON.stringify(obj[p[i]]);
            }
            else{
                str +=  comma + '"' + p[i] + '" : "'  + obj[p[i]] + '"';
            }
            comma = ',';
        }
        
        str += '}';
        
        return  str;
    }

    this.getCriteriaString = function(){
        return this.criteriaTreeToString(this._criteria, this._treeProps);
    }

    this.addNode = function(parent, critDetails){                                             
        // var nodes = this.treeLayout.nodes(this._criteria).reverse();                                
        var nodes = window.valueTree.treeLayout.nodes(this._criteria).reverse();
        var newNodeName = critDetails.name;
        nodes.forEach(function(el, indx, list){
            if(el.name == newNodeName){
                throw "Kriterij s podanim imenom že obstaja in ga ne morem dodati.";
            }
        });

        if (newNodeName != null) {                                                              
            
            if(!parent.children){
                parent.children = [];
            }
            
            //generiranje novega id-ja kriterija
            var newCid = -1;
            nodes.forEach(function(node){
                if(parseInt(newCid) <= parseInt(node.cid)){
                    newCid = parseInt(node.cid) + 1;
                }
            });
            
            var newCriterion = {"name":newNodeName, "cid":newCid, "parent":parent.name, }
            for(var propKey in critDetails){
                newCriterion[propKey] = critDetails[propKey];
            }
            parent.children.push(newCriterion);
        }        
        
        // this.updateView(parent);
        this.normalizeAllWeights();

        window.valueTree.updateView(parent);
    }

    this.updateNodeProperties = function(name, updatedNode){
        var nodes = window.valueTree.treeLayout.nodes(this._criteria).reverse();                    

        delete updatedNode.children;

        nodes.forEach(function(node){
            if(node.name == name){
                $.extend(node, updatedNode);
                return false;
            }
        });
    }

    this.updateNode = function(name, updatedNode){
        var nodes = window.valueTree.treeLayout.nodes(this._criteria).reverse();                    
        nodes.forEach(function(node){
            if(node.name == name){
                for(var keyProp in updatedNode){
                    var val = updatedNode[keyProp];
                    node[keyProp] = updatedNode[keyProp];
                }
            }
        });
    }
    
    this.getAllSubCriteria = function(node, children){
        if(!node.children){
                return [];
        }
        for (var i=0; i < node.children.length; i++){
            var child = node.children[i];
            this.getAllSubCriteria(child, children);
            children.push(child);
        }
        return children;
    }

    this.deleteCurrentCriterion = function(){
        // var nodes = this.treeLayout.nodes(this._criteria).reverse();                        
        var nodes = window.valueTree.treeLayout.nodes(this._criteria).reverse();
        var deletedNodes = [];
        for(var i = 0; i < nodes.length; i++){
            var dd = nodes[i];
            if(dd.children){
                var children = dd.children;
                
                for(var j = 0; j < children.length; j++){
                    if(children[j].cid == currentD.cid){ 
                        
                        if(children[j]){
                            deletedNodes = this.getAllSubCriteria(children[j], []);
                        }

                        deletedNodes.push(currentD);
                        
                        dd.children.splice(j, 1);
                        // this.updateView(dd);                                                     
                        window.valueTree.updateView(this._criteria);
                        break;
                    }
                }
            }
        }

        this.normalizeAllWeights();
    }

    this.getAllNodes = function(){

        return this._criteria;
    }

    this.getNodeWithId = function(){
    }

    this.getCriteriaNamesToList = function(){
        var criteriaList = this.getCriteriaToList();
        var names = [];
        criteriaList.forEach(function(el){
            names.push(el.name);
        })
        return names;
    }

    this.getCriteriaToList = function(){
        var list = [];
        this.getCriteriaToListSub(this._criteria, list);
        return list;
    }

    this.getCriteriaToListSub = function(criteria, listCriteria){
        if(!criteria){
            return;
        }
        if(criteria.type && criteria.type == 'criterion'){
            listCriteria.push(criteria);
        }

        if(criteria.children){
            for(var i = 0; i < criteria.children.length; i++){
                this.getCriteriaToListSub(criteria.children[i], listCriteria);
            }
        }
    } 

    this.containsNodeName = function(name){
        // var nodes = this.treeLayout.nodes(this._criteria).reverse();                    
        var nodes = window.valueTree.treeLayout.nodes(this._criteria).reverse();
        for(var key in nodes){
            var node = nodes[key];
            if(node.name == name){
                return true;
            }
        }
        return false;
    }

    this.updateCriterion = function(name, updatedNode){
        var nodes = window.valueTree.treeLayout.nodes(this._criteria).reverse();                    
        nodes.forEach(function(node){
            if(node.name == name){
                for(var keyProp in updatedNode){
                    var val = updatedNode[keyProp];
                    node[keyProp] = updatedNode[keyProp];
                }
            }
        });
    }

    this.getNodesToList = function(){
        
        var list = [];

        this.getNodesToListSub(this._criteria, list);

        return list;
    }

    this.getNodesToListSub = function(node, listNodes){

        if(!node){
            return;
        }

        if(node.type){
            listNodes.push(node);
        }

        if(node.children){
            for(var i = 0; i < node.children.length; i++){
                this.getNodesToListSub(node.children[i], listNodes);
            }
        }
    }

    this.getNode = function(nodeName){
        // Metoda vrne vozlišče oz. kriterij katerega ime podamo.

        var nodes = this.getNodesToList();
        var node;

        for(var i = 0; i < nodes.length; i++){
            node = nodes[i];
            if(node.name != nodeName){
                continue;
            }
            break;
        }

        return node
    }

    this.getRootNode = function(){

        var nodes = this.getNodesToList();
         for(var i = 0; i < nodes.length; i++){
            node = nodes[i];
            if(node.type == 'root'){
                return node;
            }
        }
    }

    this.getCriteria = function(nodeName){
        // Metoda vrne vozlišče oz. kriterij katerega ime podamo.

        var nodes = this.getCriteriaToList()
        var nodeResult;

        for(var i = 0; i < nodes.length; i++){
            var node = nodes[i];
            if(node.name == nodeName){
                nodeResult = node;
                break;
            }
        }

        if(typeof(nodeResult) == 'undefined'){
            throw "Kriterij s podanim imenom (" +  nodeName + ") ne obstaja";
        }

        return nodeResult;
    }

    this.getAllCriteraAndNodeToList = function(){

        var list = $.merge(this.getCriteriaToList(), this.getNodesToList());

        return list;
    }

    this.getAllValuesOfCategory = function(criterionName){
        var _self = this;

        // Vrne seznam vseh vrednosti, ki jih imajo variante za podan kriterij.
        var values = [];
        var varKeys = Object.keys(_self._variants);
        varKeys.forEach(function(el){
            var newVal = _self._variants[el][criterionName];

            if(values.indexOf(newVal) == -1){
                values.push(newVal);
            }
        });

        return values;
    }

    this.refreshMinMaxValueOfCriterion = function(criterion){
        // Metoda osveži vrednosti minValue in maxValue podanemu kriteriju glede na trenutne variante.
        
        var _self = this;

        if(criterion.scaleType != 'relative'){
            throw 'Kriteriju tipa ' + criterion.scaleType + ' ni možno določiti min in max vrednosti.';
        }

        var varIDs = Object.keys(this._variants);

        if(varIDs.length == 0){
           throw 'Ni možno pridobiti min max vrednosti, če ni podanih variant.';
        }

        var min = parseFloat(_self._variants[varIDs[0]][criterion.name]);
        var max = parseFloat(_self._variants[varIDs[0]][criterion.name]);

        varIDs.forEach(function(el){

            var value = parseFloat(_self._variants[el][criterion.name]);
            if(! $.isNumeric(value)){
                throw "Ima neštevilske vrednosti";
            }

            if(value < min){
                min = value;
            }

            if(value > max){
                max = value;
            }
        });

        criterion.minValue = min;
        criterion.maxValue = max;
    }

    this.createNewEmptyRoot = function(){

        var newRoot = {
            name: 'Root',
            description: '',
            type: 'root', 
            cid: 0,
            parent: 'null',
            children: [],
            levelNormalizedWeight: 1,
            finalNormalizedWeight: 1,
        };

        return newRoot;
    }

    this.createNewEmptyModelCriterion = function(){
        // Metoda kreira objekt- kriterij, ki predstavlja prazen kriterij iz vidika gradnje modela.
        // (torej ne kreira podatkov potrebnih za UI in analizo...)

        var newCriterion = {
            name: '',
            scaleType: '',
            minValue: '',
            maxValue: '',
            inverseScale: '',
            description: '',
            valFuncType: '',
            valueFunction: {},
            weight: 0,
            userWeight: 0,
            levelNormalizedWeight: 1,
            finalNormalizedWeight: 1,
        };

        return newCriterion;
    }

    this.createNewEmptyModelNode = function(){
        // Metoda kreira prazno vozlišče (z vsemi lastnosti, ki so potrebne ob gradnji modela).

        var newNode = {};

        newNode.type = 'node';
        newNode.name = '';
        newNode.description = '';
        newNode.parent = null;
        newNode.depth
        newNode.children = [];
        newNode.levelNormalizedWeight = 0;
        newNode.finalNormalizedWeight = 0;
        newNode.userWeight = 0;

        return newNode;
    } 

    this.createEmptyDiscreteValueFunction = function(){
        // Metoda kreira objekt, ki predstavlja prazno diskretno funkcijo iz vidika modela.

        var newDicscreteFunction = {
            type: "discrete",
            categories: [],
            usingMACBETH: false,
            MACBETHData: {},
            MACBETHOptions: [],
            MACBETHIntervals: {},
            MACBETHScale: [],
            MACBETHDifferenceMatrix: {}
        };

        return newDicscreteFunction;
    }

    this.createEmptyPiecewiseValueFunction = function(){
        // Metoda kreira objekt, ki predstavlja prazno diskretno funkcijo iz vidika modela.

        var newDicscreteFunction = {
            type: "piecewise",
            points: []
        };

        return newDicscreteFunction;
    }

    this.createEmptyLinearValueFunction = function(){
        // Metoda kreira objekt, ki predstavlja prazno diskretno funkcijo iz vidika modela.

        var newDicscreteFunction = {
            type: "linear",
        };

        return newDicscreteFunction;
    }

    this.resetMacbethDataToCriterion = function(criterion){

        criterion.valueFunction.usingMACBETH = false;
        criterion.valueFunction.MACBETHData = {};
        criterion.valueFunction.MACBETHOptions = [];
        criterion.valueFunction.MACBETHIntervals = {};
        criterion.valueFunction.MACBETHScale = [];
        criterion.valueFunction.MACBETHDifferenceMatrix = {};
    }

    this.normalizeAllWeights = function(){
        // Osveži vse normalizirane uteži.
        var _self = this;

        var root = this.getAllNodes();

        _self.normalizeAllLevelWeights();
        _self.normalizeFinalWeightRecursivelyOnChildrenOf(root);
    }

    this.normalizeAllLevelWeights = function(){
        // Metoda vsem vozliščem izračuna in nastavi normalizirane uteži na ravni posameznega levela.
        var _self = this;

        var criteria = this.getNodesToList();

        for(var i in criteria){
            var criterion = criteria[i];

            _self.normalizeLevelWeightsOnNode(criterion);
        }
    }

    this.normalizeLevelWeightsOnNode = function(node){
        // Normalizacija uteži levela v podanemu vozlišču
        var _self = this;

        var children = node.children;

        if(typeof(children) === 'undefined'){
            return;
        }

        // Normalizacija uteži na ravni levela -> vsotaUteži na level / vrednostjo uteži vozlšča.
        var userWeightSum = 0;
        children.forEach(function(el, indx){
            userWeightSum += parseFloat(el.userWeight);
        });

        children.forEach(function(el, indx){
            if(userWeightSum == 0){
                el.levelNormalizedWeight = 0;
            }
            else{
                el.levelNormalizedWeight = parseFloat(el.userWeight) / userWeightSum;
            }
        });
    }

    this.normalizeFinalWeightRecursivelyOnChildrenOf = function(node){
        // Rekurzivno posodablja vrednosti finalNormalizedWeight vsem podvozliščem podanega vozlišča.
        // OPOMBA: Pred klicem te metode je pomembno, da so posodobljene vse vrednosti levelNormalizedWeight.
        var _self = this;

        if(typeof(node.children) === 'undefined'){
            return;
        }

        for(var i in node.children){

            var child = node.children[i];

            child.finalNormalizedWeight = parseFloat(node.finalNormalizedWeight) * parseFloat(child.levelNormalizedWeight);

            _self.normalizeFinalWeightRecursivelyOnChildrenOf(child);
        }
    }

    /// VARIANTE:

    this.resetVariants = function(){
        this._variants = {};
        this._varIDGen = 0;
    }

    this.updateVariants = function(model){
        this._variants = model.variants;
        this._varIDGen = model.varIDGen;
    }

    this.getVariantsString = function(){
        return '{ "varIDGen": "' + this._varIDGen +'", "variants": ' + JSON.stringify(this._variants) + '}';
    }

    this.addVariant = function(variant){
        // Varianti dodeli id, doda varianto in poviša generatoi id-jev za 1.
        variant['vid'] = this._varIDGen;
        this._variants[this._varIDGen] = variant;
        this._varIDGen++;
    }

    this.deleteVariant = function(vid){
        if(!this._variants[vid]){
            throw 'Model ne vsebuje variante z vid: ' + vid + ', zato je ni možno izbrisati.';
        }
        delete this._variants[vid];
    }

    this.updateVariant = function(variant){
        if(!this._variants[variant.vid]){
            throw 'Ne moremo posodobiti variante ' + variant.name + ', saj varianta ne obstaja.';
        }
        this._variants[variant.vid] = variant;
    }

    this.getVariants = function(){
        return this._variants;
    }

    this.getVariantsToList = function(){
        var _self = this;

        var variantsList = [];
        
        for(var variantKey in _self._variants){
            var variant = _self._variants[variantKey];
            variantsList.push(variant);
        }   

        return variantsList;
    }

    this.renamePropertyOfVariants = function(fromName, toName){
        // Funkcija spremeni ime lastnosti vsake variante.
        var _self = this;

        if(fromName == "vid" || toName == "vid"){
            throw "Ne morem spremeniti imena lastnosti 'vid'!";
        }

        var variantsKeys = Object.keys(_self._variants);
        if(variantsKeys.length == 0){
            return;
        }

        var allProperties = Object.keys(_self._variants[variantsKeys[0]]);
        if(allProperties.indexOf(fromName) == -1){
            throw "Variante nimajo lastnosti z imenom: '" + fromName + "'! Zato lastnosti ni možno preimenovati!";
        }
        if(allProperties.indexOf(toName) > -1){
            throw "Ne morem spremeniti imena lastnosti '" + toName + "' ker variante že vsebujejo lastnost s tem imenom!";
        }

        variantsKeys.forEach(function(el){

            var variant = _self._variants[el];

            if(! variant.hasOwnProperty(fromName)){
                throw "Varianta: '" + variant.Option + "' nima lastnosti: '" + fromName +"'!";
            }

            variant[toName] = variant[fromName];

            delete variant[fromName];
        });
    }

    this.removePropertyOfVariants = function(propName){
        // Metoda izbriše vse podatke variantam za podano lastnost.
        var _self = this;

        if(propName == "vid"){
            throw "Ne morem spremeniti imena lastnosti 'vid'!";
        }

        var variantsKeys = Object.keys(_self._variants);
        if(variantsKeys.length == 0){
            return;
        }

        var allProperties = Object.keys(_self._variants[variantsKeys[0]]);
        if(allProperties.indexOf(propName) == -1){
            throw "Variante nimajo lastnosti z imenom: '" + propName + "'! Zato lastnosti ni možno izbrisati!";
        }

        variantsKeys.forEach(function(el){

            var variant = _self._variants[el];

            if(! variant.hasOwnProperty(propName)){
                throw "Varianta: '" + variant.Option + "' nima lastnosti: '" + propName +"'!";
            }

            delete variant[propName];
        });
    }

    this.containsVariantWithOption = function(option){
        // Vrne true, če model vsebuje varianto, ki ima vrednost lastnosti Option enako podani vrednosti.

        var contains = false;

        var variants = this.getVariantsToList();
        variants.forEach(function(el){
            if(el.Option == option){
                contains = true;
                return;
            }
        });

        return contains;
    }

    /// MODEL:

    this.resetModel = function(){
        this.resetCriteria();
        this.resetVariants();
    }

    this.updateModel = function(strModel){
        var model = JSON.parse(strModel);
        this.updateCriteria(model.criteriaModel);
        this.updateVariants(model.variantModel);
        // this._criteriaModel.updateView();                                                  
        window.valueTree.recalcData(this._criteria);
    }

    this.saveModel = function(modelName){
        
        var filename = modelName += ".json";
        var cc = this.getModelString();
        var bl = new Blob([cc], {type: "text/plain;charset=utf-8"});
        saveAs(bl, filename);
    }

    this.openModel = function(){
        var _self = this;

        // MR: To kar se tiče logike UI-ja prenesi vn iz modela....
        
        //preverjanje podpore brskalnika za File API
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            
        } else {
          alert('The File APIs are not fully supported in this browser.');
        }
        
        //kreireanje file chooserja
        var fileChooser;
        if($("#openFileChooser").size() == 0){
            fileChooser = document.createElement('input');
            fileChooser.setAttribute('type', 'file');
            fileChooser.setAttribute('id', 'openFileChooser');
            fileChooser.setAttribute('accept', '.json');
            fileChooser.style.display = 'none';

            document.getElementsByTagName("body")[0].appendChild(fileChooser);
        }
        else{
            fileChooser = document.getElementById('openFileChooser');
            fileChooser.value = null;
        }
        
        fileChooser.onchange = function(){
            
            var fileReader = new FileReader();
            
            fileReader.onload = function(e){
                _self.updateModel(e.target.result);
                $('#tabsContent').jqxTabs('select', 0);
                // UMTree.reset();
                UMModel.reset();
            };
            
            fileReader.readAsText(this.files[0]);
        }
        
        fileChooser.click();
    }

    this.getModelString = function(){
        var strModel = "";

        var treeDataString = this.getCriteriaString();
        var variantDataString = this.getVariantsString();

        strModel = '{ "criteriaModel": ' + treeDataString + ', ' + '"variantModel": ' + variantDataString + ' }';

        return strModel;
    }

    /// DATA

    this.getValOfFixedDiscrete = function(criteriaName, categoryName){

        var criterion = this.getCriteria(criteriaName);

        if(typeof(criterion.valueFunction) == "undefined"){
            throw "Kriterij " + criterion.name + " nima določene valueFunction.";
        }

        if(criterion.scaleType != "fixed" || criterion.valueFunction.type != "discrete"){
            throw "Kriterij " + criteriaName + " nima pravega scaleType ali valueFunction.Type ";
        }

        return criterion.valueFunction.categories[categoryName];
    }

    this.getValOfFixedLinear = function(criteriaName, valueOfVariant){

        var criterion = this.getCriteria(criteriaName);

        if(typeof(criterion.valueFunction) == "undefined"){
            throw "Kriterij " + criterion.name + " nima določene valueFunction.";
        }

        if(criterion.scaleType != "fixed" || criterion.valueFunction.type != "linear"){
            throw "Kriterij " + criteriaName + " nima pravega scaleType ali valueFunction.Type ";
        }

        valueOfVariant = parseFloat(valueOfVariant);

        var minVal = parseFloat(criterion.minValue);
        var maxVal = parseFloat(criterion.maxValue);

        if(valueOfVariant < minVal){
            throw "Podana vrednost je manjša od minimalne vrednosti kriterija (" + criterion.minValue + "). (možna rešitev: sprememba min vrednosti kriterija)"
        }
        if(valueOfVariant > maxVal){
            throw "Podana vrednost je večja od maximalne vrednosti kriterija (" + criterion.maxValue + "). (možna rešitev: sprememba max vrednosti kriterija)"
        }

        var result = this.linearInterpolation(valueOfVariant, minVal, 0, maxVal, 100);
        
        if(criterion.inverseScale == "true") return 100 - result;
        
        return result;
    }

    this.getValOfFixedPicewise = function(criteriaName, valueOfVariant){

        var criterion = this.getCriteria(criteriaName);

        if(typeof(criterion.valueFunction) == "undefined"){
            throw "Kriterij " + criterion.name + " nima določene valueFunction.";
        }

        if(criterion.scaleType != "fixed" || criterion.valueFunction.type != "piecewise"){
            throw "Kriterij " + criteriaName + " nima pravega scaleType ali valueFunction.Type ";
        }

        valueOfVariant = parseFloat(valueOfVariant);

        var minVal = parseFloat(criterion.minValue);
        var maxVal = parseFloat(criterion.maxValue);

        if(minVal > valueOfVariant){
            throw "Podana vrednost je manjša od minimalne vrednosti kriterija (" + criterion.minValue + "). (možna rešitev: sprememba min vrednosti kriterija)"
        }
        if(maxVal < valueOfVariant){
            throw "Podana vrednost je večja od maximalne vrednosti kriterija (" + criterion.maxValue + "). (možna rešitev: sprememba max vrednosti kriterija)"
        }

        var x0, y0, x1, y1;
        var points = criterion.valueFunction.points;

        // Poišče pravi del piecewise funkcije in nastavi spremenljivke za pridobitev vrednosti.
        for(var i = 0; i < points.length-1; i++){

            if(points[i].x <= valueOfVariant && points[i+1].x >= valueOfVariant){

                x0 = parseFloat(points[i].x.toFixed(2))
                y0 = parseFloat(points[i].y.toFixed(2))
                x1 = parseFloat(points[i+1].x.toFixed(2))
                y1 = parseFloat(points[i+1].y.toFixed(2))				

                break;				
            }
        }

        return this.linearInterpolation(valueOfVariant, x0, y0, x1, y1)
    }

    this.getValOfRelativeLinear = function(criteriaName, valueOfVariant){

        var criterion = this.getCriteria(criteriaName);

        if(typeof(criterion.valueFunction) == "undefined"){
            throw "Kriterij " + criterion.name + " nima določene valueFunction.";
        }

        if(criterion.scaleType != "relative" || criterion.valueFunction.type != "linear"){
            throw "Kriterij " + criteriaName + " nima pravega scaleType ali valueFunction.Type ";
        }

        valueOfVariant = parseFloat(valueOfVariant);

        this.refreshMinMaxValueOfCriterion(criterion);

        var minVal = parseFloat(criterion.minValue);
        var maxVal = parseFloat(criterion.maxValue);

        if(valueOfVariant < minVal || valueOfVariant > maxVal){
            throw "Podane vrednost je izven intervala kriterija."
        }

        var result = this.linearInterpolation(valueOfVariant, minVal, 0, maxVal, 100);
        
        if(criterion.inverseScale == "true") return 100 - result;
        
        return result;
    }

    this.getValOfRelativePicewise = function(criteriaName, valueOfVariant){

        var criterion = this.getCriteria(criteriaName);

        if(typeof(criterion.valueFunction) == "undefined"){
            throw "Kriterij " + criterion.name + " nima določene valueFunction.";
        }

        if(criterion.scaleType != "relative" || criterion.valueFunction.type != "piecewise"){
            throw "Kriterij " + criteriaName + " nima pravega scaleType ali valueFunction.Type ";
        }

        valueOfVariant = parseFloat(valueOfVariant);

        this.refreshMinMaxValueOfCriterion(criterion);

        var minVal = parseFloat(criterion.minValue);
        var maxVal = parseFloat(criterion.maxValue);

        if(valueOfVariant < minVal || valueOfVariant > maxVal){
            throw "Podane vrednost je izven intervala kriterija."
        }

        var x0, y0, x1, y1;
        var points = criterion.valueFunction.points;

        // Poišče pravi del piecewise funkcije in nastavi spremenljivke za pridobitev vrednosti.
        for(var i = 0; i < points.length-1; i++){

            if(points[i].x <= valueOfVariant && points[i+1].x >= valueOfVariant){

                x0 = parseFloat(points[i].x.toFixed(2))
                y0 = parseFloat(points[i].y.toFixed(2))
                x1 = parseFloat(points[i+1].x.toFixed(2))
                y1 = parseFloat(points[i+1].y.toFixed(2))               

                break;              
            }
        }

        return this.linearInterpolation(valueOfVariant, x0, y0, x1, y1)
    }

    this.linearInterpolation = function(x, x0, y0, x1, y1){
        // x -> vrednost za katero nas zanima y.
        // x0 -> min vrednost po x-u.
        // y0 -> min vrednost po y-u.
        // x1 -> max vrednost po x-u.
        // y1 -> max vrednost po y-u.

        var result = y0 + (y1 - y0) * ( (x - x0) / (x1 - x0));

        return parseFloat(result.toFixed(2));
    }

    this.getWeightOf = function(nodeName){

        var criterion = this.getNode(nodeName);

        // Če je iskanje po uteži vozlišča z potomci je potrebno pridobiti najpomembnejšega potomca vozlišča.
        if(criterion.type == "node" || criterion.type == "root"){
            criterion = this.getMostImportantCriteriaOfNode(criterion)
        }

        return parseFloat(criterion.weight)
    }

    this.getMostImportantCriteriaOfNode = function(node, currWeight){
        var mostImportant = {};
        var currWeight = 0;

        if(typeof(node.children) == 'undefined'){
            throw "Vozlišče " + node.name + " nima otrok in posledično tudi najpomembnejšega criterija.";
        }

        for(var i = 0; i < node.children.length; i++){
            var child = node.children[i];

            //MR: Tale if bi se dal združit v enga.... (k sta gnezdena if-a enaka...)
            if(child.type == "criterion"){

                child.weight = child.weight ? child.weight : 0;

                if(child.weight >= currWeight){
                    mostImportant = child;
                    currWeight = child.weight;
                }

            }   
            else if(child.type == "node"){

                var mostImportantSub = this.getMostImportantCriteriaOfNode(child, 0)

                mostImportantSub.weight = mostImportantSub.weight ? mostImportantSub.weight : 0;

                if(mostImportantSub.weight >= currWeight){
                    mostImportant = mostImportantSub;
                    currWeight = mostImportantSub.weight;
                }

            }
        }

        return mostImportant;
    }
}





//////////////////////////////////
//////     UDNO MANAGER
//////////////////////////////////

/* 
* UMG je prototip undo manager, ki se uporablja za undo funkcionalnost aplikacije. Kadar želimo kje v aplikaciji shraniti stanje za UNDO/REDO
* moramo na mesto v kodi klicati funkcijo saveState(). Prednastavljena vrednost omogoča hranjenje zadnjih 10-ih stanj.
*
*@param {function} getMementoMethod je metoda, ki se kliče ob potrebi shranjevanja stanja. Stanja, ki jih vrne ta metoda, se bojo shranjevala in obnavljala.
*@param {function} updateMethod je metoda, ki naredi update stanja. Metodi je podano shranjeno stanje za obnovo. Stanje je to kar vrača metoda getMementoMethod.
*@param {int} maxStates Število stanj, ki se bojo hranila za UNDO funkcionalnost.
*/
function UMG(getMementoMethod, updateMethod, maxStates){
    this.getWholeDataModel = getMementoMethod;
    this.updateModel = updateMethod;
    
    this.undoStack = [];
    this.redoStack = [];
    
    this.maxStates = maxStates === 'undefined' ? 10 : maxStates;

    // Spremenljivka pauseSaving je namenjena, kadar je manager na pavzi in ne shranjuje akcij (Npr.: kadar se nalagajo variante iz excela, 
    // da ne shranjuje stanja za vsako posamezno dodano varianto ga damo na pavzo po vseh dodanih pa pavzo odstavimo... ).
    this.pauseSaving = false;

    this._getCurrentState = function(){

        var state = {
            actionTab: $('#tabsContent').jqxTabs('val'),
            model: this.getWholeDataModel()
        };

        return state;
        
    }
    
    /*
    * Metoda shrani stanje modela.
    */
    this.saveState = function(){

        if(this.pauseSaving){
            return;
        }
        var state = this._getCurrentState();

        this.undoStack.push(state);
        if(this.undoStack.length > this.maxStates){
            this.undoStack.splice(0, 1);
        }

        if(this.redoStack.length > 0)
        {
            this.redoStack = []
        }

    }
    
    this.UNDO = function(){

        if(this.undoStack.length > 0)
        {
            var currentTabId = $('#tabsContent').jqxTabs('val');
            var undoStateTabId = this.undoStack[this.undoStack.length-1].actionTab;

            if(currentTabId == undoStateTabId){
                var state = this._getCurrentState();
                this.redoStack.push(state);

                var memento = this.undoStack.pop();
                this.updateModel(memento.model);
            }
        }

    }
    
    this.REDO = function(){

        if(this.redoStack.length > 0){

            var currentTabId = $('#tabsContent').jqxTabs('val');
            var redoStateTabId = this.redoStack[this.redoStack.length-1].actionTab;

            if(currentTabId == redoStateTabId){
                var state = this._getCurrentState();
                this.undoStack.push(state)

                var memento = this.redoStack.pop();
                this.updateModel(memento.model);
            }
        }   

    }
    
    /*
    * Metodo pokličemo kadar želimo resetirati vsa stanja modela, ki se nahajajo v stackih. (npr. ob odprtju obstoječega modela, ali ob kreiranju novega modela)...
    */
    this.reset = function(){

        this.undoStack = [];
        this.redoStack = [];
        this.maxStates = 10;

    }
}

//////////////////////////////////
//////      POMOŽNE METODE
//////////////////////////////////

function getWholeDataModel(){

    return window.model.getModelString();
}

function updateModel(model){

    var durationOld = window.valueTree.translationDuration;                            

    window.valueTree.translationDuration = 0;
    window.model.updateModel(model);
    window.valueTree.recalcData(window.model.getAllNodes());
    window.valueTree.translationDuration = durationOld;

}

var UMModel = new UMG(getWholeDataModel, updateModel, 50);


// var UMTree = new UMG(getWholeDataModel, updateModel);
// var UMVariants = new UMG(getVariantsDataModel, updateVariants);


