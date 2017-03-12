
var dataAdapter;
var spiderSettings;
var spiderData;
var mapSettings;
var mapData;
var sensitivitySettings;
var sensitivityData;
var contributionSettings;
var contributionData;
var maximinData;
var maximinSettings;
var minimaxData;
var minimaxSettings;
var estimatedValueData;
var estimatedValueSettings;
var shownAttributes;
var normalizedData;
var normalizedDataWithWeights;
var spiderFull = false;
var mapFull = false;
var sensitivityFull = false;
var lessValuables = [];
var expectedValues = [];
var increaseDecreaseDataGlobal;
// MR: Tole pol zamenjaj če ne boš več rabil oz naredi v nastavitvah....
 // var macbethDifferenceLabels = ["extreme", "v. strong", "strong", "moderate", "weak", "v. weak", "no"];
// var macbethDifferenceLabels = ["extreme", "strong", "moderate", "weak", "no"];
var macbethDifferenceLabels = ["ekstremna", "močna", "zmerna", "šibka", "brez"];

window.addEventListener("beforeunload", function (e) {
    var confirmationMessage = 'Are you sure you want to leave page? '
                            + 'All your unsaved work will be lost.';

    (e || window.event).returnValue = confirmationMessage;
    return confirmationMessage; 
});

$(document).ready(function(){

        document.onkeydown = function(event){

            // CTRL + Z
            if(event.keyCode == 90 && event.ctrlKey){
                window.currentUMG.UNDO();
            }

            // CTRL + Y
            if(event.keyCode == 89 && event.ctrlKey){
                window.currentUMG.REDO();
            }
        }

		window.model = new Model();
        window.model.resetModel();

        window.valueTree = new ValueTree();
        window.valueTree.URManager.setAsCurrentUMG();
        window.valueTree.recalcData(model.getAllNodes());
        
        window.gridVariants = new GridVariant('#gridVariants', model.getVariants());
        window.gridVariants.setUpGridData();
        window.gridVariants.buildGrid();

        window.krozniMenu = new CircularMenu();
	    
        $('#dialogMACBETH').DialogMACBETHH({autoOpen: false});
        $('#dialogAllWeight').DialogAllWeights({autoOpen: false});
        $('#dialogSaveModel').DialogSaveModel();

        $('#macbethIntervalTooltip').tooltipMACBETHInterval({});

        // YesNo DialogBox intialization
        $('#dialogYesNoMessage').messageYesNoDialog({autoOpen: false});

        MacbethCalculator();
        MacbethIntervalCalculator();
        MacbethInconsistencyChecker();

        // $("#tabTree").on("click", refreshCircMenu);

        ///// Toolbar (shrani, odpri, undo, redo, ...)
        $('#toolbar').jqxToolBar({
            width:'100%',
            height: 32,
            tools: 'custom | custom custom | custom custom | custom custom',
            initTools: function(type, index, tool, menuToolInitialization){
                switch(index){
                    case 0:
                        var btnNew = $("<div><img src='images/imgNew16.png' style='float:left'/><div style='float:right; margin-left:5px;'>Nov model</div></div>");
                        tool.append(btnNew);
                        btnNew.jqxButton({ height: 16 });
                        btnNew.on('click', function(){
                            
                            $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                                contentText: "Vse neshranjene spremembe bodo izgubljene. Želite nadaljevati?",
                                yesAction: function(){
                                    window.model = new Model();
                                    window.model.resetModel();

                                    window.currentUMG.reset();

                                    window.valueTree = new ValueTree();
                                    window.valueTree.recalcData(model.getAllNodes());
                                }
                            });
                        });
                        break;
                    case 1:
                        var btnSave = $("<div><img src='images/imgSave16.png' style='float:left'/><div style='float:right; margin-left:5px;'>Shrani</div></div>");
                        tool.append(btnSave);
                        btnSave.jqxButton({ height: 16 });
                        btnSave.on('click', function(){
                             $('#dialogSaveModel').DialogSaveModel('open');
                        });
                        break;
                    case 2:
                        var btnOpen = $("<div style=margin-left:3px;><img src='images/imgOpen16.png' style='float:left'/><div style='float:right; margin-left:5px;'>Odpri</div></div>");
                        tool.append(btnOpen);
                        btnOpen.jqxButton({ height: 16 });
                        btnOpen.on('click', function(){
                            model.openModel(gridVariants.rebuildGrid);
                            gridVariants.rebuildGrid();
                            window.currentUMG.reset();
                        });
                        break;
                    case 3:
                        var btnUndo = $("<div style='margin-left:15px;'><img src='images/imgUndo16.png' style='float:left'/><div style='float:right;'></div></div>");
                        tool.append(btnUndo);
                        btnUndo.jqxButton({ height: 16 });
                        btnUndo.jqxTooltip({content: "Razveljavi", animationShowDelay: 1000});
                        btnUndo.on('click', function(){
                            window.currentUMG.UNDO();
                            gridVariants.rebuildGrid();
                        });
                        break;
                    case 4:
                        var btnRedo = $("<div style=margin-left:3px;><img src='images/imgRedo16.png' style='float:left'/><div style='float:right;'></div></div>");
                        tool.append(btnRedo);
                        btnRedo.jqxButton({ height: 16 });
                        btnRedo.jqxTooltip({content: "Ponovno uveljavi", animationShowDelay: 1000});
                        btnRedo.on('click', function(){
                            window.currentUMG.REDO();
                            gridVariants.rebuildGrid();
                        });
                        break;
                }
            }
        });
        
        ///// Urejanje tabov: Value tree, Variants, Analyse...

        var validationBeforeAnalysis = function(){
            // Metoda validira model pred analizo. 
            // Če je model veljaven vrne OK, sicer sporočilo.
           
            // Preveri ali model vsebuje variante.
            var variants = model.getVariants();
            if(Object.keys(variants).length == 0){
                return "Model ne vsebuje nobene variante!"
            }

            // Preveri ali model vsebuje kriterije.
            var criteria = model.getCriteriaToList();
            if(criteria.length < 2){
                return "Model mora vsebovati vsaj dva kriterija."
            }

            // Preveri ali obstaja kaka nekonsistentna celica v grid-u variant.
            gridVariants.refreshInconsistentCells();
            var inconsistentVariants = Object.keys(gridVariants.inconsistentCells);
            if(inconsistentVariants.length > 0){

                var strIncoVariants = inconsistentVariants.join(', ');

                return "Variante z nekonsistentnimi podatki: " + strIncoVariants
            }

            return "OK";
        }

        $('#tabsContent').jqxTabs({ 
            width: '100%', 
            height: 700, 
            position: 'top'
        });

        $('#tabsContent').on('tabclick', function(event){
            // Če je bi kliknjen tab za analizo validira model.
            // V premeru neuspešne validacije nastavi spremenljivko, ki se uorabi za pravilno navigacijo na trenuten tab.

            this.goToIndex = 0;
            this.validationMessage = 'OK';

            var isValidMessage = validationBeforeAnalysis();

            if(isValidMessage != "OK"){
                this.goToIndex = $('#tabsContent').val();
                this.validationMessage = isValidMessage;
                return;
            }
        });

        $('#tabsContent').on('selected', function(event){
            var tabTitle = $('#tabsContent').jqxTabs('getTitleAt', event.args.item);

            switch(tabTitle){
                case 'Odločitveno drevo' :
                    window.valueTree.URManager.setAsCurrentUMG();
                    break;

                case 'Variante' :
                    gridVariants.rebuildGrid();
                    window.gridVariants.URManager.setAsCurrentUMG();
                    break;

                case 'Analiza' :
                    window.currentUMG = null;

                    // Kadar je model neveljaven ne napreduje na tab analize.
                    if(this.validationMessage != 'OK'){
                        $('#tabsContent').jqxTabs('select', this.goToIndex);

                        var message = "Model nima veljavenih podatkov za analizo. " + this.validationMessage;
                        $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                            height: 180,
                            contentText: message,
                            onlyYes: true
                        });
                    }
                    else{
                        refreshAnalyses();
                    }
                    break;
            }
        });
});

//MR: vnesi v velikost zaslona string ... gre na 0 ... NI OK!!!


//////////////////////////////////
//////      POMOŽNE FUNKCIJE
//////////////////////////////////

Number.prototype.myRound = function(places) {
    return +(Math.round(this + "e+" + places)  + "e-" + places);
}
String.prototype.myRound = function(places){

    return +(Math.round(parseFloat(this) + "e+" + places)  + "e-" + places);
}
Number.prototype.myToFixed = function(places) {
    return this.toFixed(places);
}
String.prototype.myToFixed = function(places){

    if(!$.isNumeric(this)){
        return "";
    }

    return parseFloat(this).toFixed(places);
}

function myParseFloat(obj){

    var obj = obj.replace(',', '.');

    return parseFloat(obj);
}

//////////////////////////////////
//////      KROŽNI MENU
//////////////////////////////////

function CircularMenu(){

    var _self = this;

    this.itmWidth = 32;
    this.itmHeight = 32;
    this.transitionTime = 0.4
    this.isOpen = false;
    this.currentOpener = null;
    this.currentButtons = [];
    this.r = 42;

    this.btnRemove = $("<div id='menBtnRemove' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/removeIcon32.png)'></div>");

    this.btnAddNode = $("<div id='menBtnAddNode' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/addIcon32.png)'></div>");

    this.btnAddCriteria = $("<div id='menBtnAddCriterion' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/addCriterionIcon32.png)'></div>");

    this.btnDetails = $("<div id='menBtnDetails' class='circMenuItem' style='position:absolute; visibility:hidden;" + 
                    "top:" + 0 + "px; left:" + 0 + "px; background: url(images/detailsIcon32.png)'></div>");

    this.btnWeight = $("<div id='menBtnWeight' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/weighingIcon32.png)'></div>");

    this.btnValFunc = $("<div id='menBtnValFunc' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/imgValFunc32.png)'></div>");


    $(this.btnRemove).jqxTooltip({content: 'Odstrani vozlišče'});
    $(this.btnAddNode).jqxTooltip({content: 'Dodaj vozlišče'});
    $(this.btnAddCriteria).jqxTooltip({content: 'Dodaj kriterij'});
    $(this.btnDetails).jqxTooltip({content: 'Lastnosti'});
    $(this.btnWeight).jqxTooltip({content: 'Urejevanje uteži'});
    $(this.btnValFunc).jqxTooltip({content: 'Urejevanje funkcije koristnosti'});

    $(this.btnRemove).on('click', function(){
        window.valueTree.URManager.saveState();
        model.deleteCurrentCriterion();
        krozniMenu.zapriMenu();
    });

    $(this.btnAddNode).on('click', function(){
            window.dialogNodeDetails.open();
    });

    $(this.btnAddCriteria).on('click', function(){
         window.dialogCriteriaDetails.open();
    });

    $(this.btnDetails).on('click', function(){
        if(currentD.type == 'criterion'){
             window.dialogCriteriaDetails.open(currentD);
        }
        else if(currentD.type == 'node' || currentD.type == "root"){
            window.dialogNodeDetails.open(currentD);
        }
    });

    $(this.btnWeight).on('click', function(){
        window.dialogWeights.open(currentD);
    });

    $(this.btnValFunc).on('click', function(){
        if(currentD.valFuncType == 'piecewise'){
            window.dialogValFuncPiecewise.open(currentD);
        }
        else if(currentD.valFuncType == 'discrete'){
            window.dialogValFuncDiscrete.open(currentD);
        }
        else if(currentD.valFuncType == 'linear'){
            window.dialogValFuncLinear.open(currentD);
        }
    });

    $('body').append(this.btnRemove);
    $('body').append(this.btnAddNode);
    $('body').append(this.btnAddCriteria);
    $('body').append(this.btnDetails);
    $('body').append(this.btnWeight);
    $('body').append(this.btnValFunc);

    // Meni se zapre kadar se klikne na karkoli kar ni item in če kliknjeni item ni namenjen odpiranju menija.
    $(document).on('click', function(event){
        

        // elementi z razredom circMenuItem so elementi menija.
        var isCircularMenuElement = $(event.target).hasClass('circMenuItem');

        // menu odpirajo vozlišča (elementi <circle> z razredom openCircMenu)
        var isCircularMenuOpener = $(event.target).attr('class') == 'openCircMenu';

        if(!isCircularMenuElement && !isCircularMenuOpener){
            _self.zapriMenu();
        }
    });

    this.odpriMenu = function(node){
         // Kadar je menu že odprt na isti lokaciji, ostane odprt in ga ne odpira ponovno:

        if(_self.isOpen && node == _self.currentOpener){
            return;
        }
        else if(_self.isOpen){
            this.zapriMenu();
        }

        this.currentButtons = [];
        var nodeType = node.getAttribute('nodeType');
        var positions = [];
        if(nodeType == 'root'){
            positions = this.calcPositions(4, -45);

            this.currentButtons.push({ 
                button: $('#menBtnAddNode')
            });
            this.currentButtons.push({
                button: $('#menBtnAddCriterion')
            });
            this.currentButtons.push({
                button: $('#menBtnWeight')
            });
            this.currentButtons.push({
                button: $('#menBtnDetails')
            });
        }
        else if(nodeType == 'node'){
            positions = this.calcPositions(5, -35);

            this.currentButtons.push({ 
                button: $('#menBtnAddNode')
            });
            this.currentButtons.push({
                button: $('#menBtnAddCriterion')
            });
            this.currentButtons.push({
                button: $('#menBtnDetails')
            });
            this.currentButtons.push({ 
                button: $('#menBtnRemove')
            });
            this.currentButtons.push({
                button: $('#menBtnWeight')
            });
        }
        else if(nodeType == 'criterion'){
            positions = this.calcPositions(3);
            this.currentButtons.push({
                button: $('#menBtnDetails')
            });
            this.currentButtons.push({ 
                button: $('#menBtnRemove')
            });
            this.currentButtons.push({
                button: $('#menBtnValFunc')
            });
        }

        var top = ( node.getScreenCTM().f - this.itmHeight/2 ) + window.pageYOffset;
        var left = ( node.getScreenCTM().e -this.itmWidth/2 ) + window.pageXOffset;

        // Nastavi pozicije gumbov in prikaz.
        this.currentButtons.forEach(function(el, indx){
            // Preračunano pozicijo nastavi, kadar ni bila ročno vnešena pozicija. Če pozicija že obstaja jo NE prepiše.
            if(!el['translateX']){
                el['translateX'] = positions[indx].positionX;
            }
            if(!el['translateY']){
                el['translateY'] = positions[indx].positionY;
            }

            el.button.css('transition', '0s ease-out')
                .css('top', top)
                .css('left', left)
                .css('visibility', 'visible');
        });

        _self.isOpen = true;
        _self.currentOpener = node;

        window.setTimeout(this.animateOpen, 1);
    }

    //' Animirano odpre menu.'
    this.animateOpen = function(){

        _self.currentButtons.forEach(function(el){
            el.button.css('transition', '0.4s ease-out')
                .css('transform', 'translate(' + el.translateX + 'px, ' + el.translateY + 'px)');

        })
    }

    // V primeru, ko je menu že odprt ga skrije in postavi v zgornji levi kot.
    this.zapriMenu = function(){
        if(_self.isOpen){

            this.currentButtons.forEach(function(el){
                el.button.css('visibility', 'hidden')
                    .css('transition', '0s')
                    .css('transform', 'translate(0px, 0px)');
            });

            _self.isOpen = false;
        }
    }

    this.degToRad = function(deg){
        return deg * (Math.PI / 180); 
    }

    this.calcPositions = function(numOfBtns, rotation){
        if(!rotation){
            rotation = 0;
        }
        if(!numOfBtns || numOfBtns <= 0){
            return
        }
        var positions = [];
        var step = 360 / numOfBtns; 
        var angle = 0;
        for(var i = 0; i < numOfBtns; i++){
            var position = {
                positionX: this.r * Math.cos(this.degToRad(angle + rotation)),
                positionY: this.r * Math.sin(this.degToRad(angle + rotation))
            }
            positions.push(position);
            angle += step;
        }
        return positions;
    }

    this.popUpCriteriaDetails = function(){
        if(currentD.type == 'criterion'){
            window.dialogCriteriaDetails.open(currentD);
        }
        else if(currentD.type == 'node' || currentD.type == "root"){
            _self.popUpDialog('nodeDetialsEdit', currentD);
        }
    }
}


//////////////////////////////////
//////      GRID VARIANT
//////////////////////////////////


function GridVariant(gridSelector){

    this.gridWidth = '85%';
    this.pagesize = 10;

    this.gridSelector = gridSelector;

    // this._variantsModel = variantsModel;
    this._dataAdapter;
    this._columns = [];

    // Se uporablja za barvanje celic. Grid mora biti zgrajen za tem, ko se nastavi ta objekt.
    this.inconsistentCells = {};

    this.ri = -1;
    this.df = 'Procesor';

    // Metode za (re)generiranje grida.

    this.setUpGridData = function(){

        var _self = this;
        // Naredi columns-e za grid view. Predpostavka je, da so variante popolne (vsaka ima vse atribute). Naredimo tudi datafields seznam, za datasource.
        
        var columnDeleteVariant = {
            text: '',
            editable: false,
            datafield: 'Delete_x_xx_x',
            width: 24,
            cellsrenderer: function(row, columnfield, value, defaulthtml, columnproperties){
                return "<div style='text-align:center;padding-top:4px;'><img src='images/imgRemoveSelected16.png'/></div>"
            },
            createEverPresentRowWidget: function (datafield, htmlElement, popup, addCallback) {
                return ''
            },
        }

        // Naredi id in Option stolpec.
        this._columns = [ 
            {text: 'vid', datafield: 'vid', width: 150 }, 
            columnDeleteVariant,
            {
                text: 'Option', 
                datafield: 'Option', 
                width: 150,
                cellclassname: _self._cellClassAppender,
                validation: _self._columnOptionValidation
            }
        ];

        // Inicializacija dataFields objekta, ki vsebuje vid in Option "stolpec".
        var datFields = [ {name: 'vid', type: 'string'}, {name: 'Option', type: 'string'} ];

        var criteria = model.getCriteriaToList();
        
        criteria.forEach(function(criterion, indy){
            var _self2 = this;

            var newColumn = {};

            if(criterion.valueFunction.type == "linear" || criterion.valueFunction.type == "piecewise"){
                
                var maxDecimalPlaces = _self.getLongestDecimalPlacesInDataOfCriterion(criterion.name);

                newColumn = {
                    width: 150,
                    text: criterion.name,
                    datafield: criterion.name,
                    validation: _self._cellValidation,
                    cellclassname: _self._cellClassAppender,
                    cellvaluechanging: function (row, column, columnType, oldValue, newValue) {
                        // Če je nova vrednost prazen string vrne staro vrednost.
                        return newValue.replace(",", ".");
                    },
                }

                if(criterion.scaleType == "fixed"){
                    // Fiksnim skalam doda validator, da morajo ustrezati zadanim pogojem.
                    // Uporabnik lahko poveča interval ali pa prekine akcijo.
                    newColumn.validation = _self._cellValidation;
                }
                
            }
            else if(criterion.valueFunction.type == "discrete"){
                newColumn = {
                    width: 150,
                    text: criterion.name, 
                    datafield: criterion.name, 
                    columntype: 'combobox',
                    cellclassname: _self._cellClassAppender,
                    createeditor: function(row, column, editor){
                        var criterionName = this.datafield;
                        var criterion = model.getCriteria(criterionName);

                        var list = Object.keys(criterion.valueFunction.categories);
                        editor.jqxComboBox({
                            width: 150,
                            autoDropDownHeight: true,
                            source: list
                        });
                    },
                    cellvaluechanging: function (row, column, columntype, oldvalue, newvalue) {
                        // Če je nova vrednost prazen string vrne staro vrednost.
                        if (newvalue == "") return oldvalue;
                    },
                }
            }

            _self._columns.push(newColumn);   

            // Za piecewise in linear tipe valueFunction-ov je podatkovni tip število.
            var dataFieldType = 'string';
            // if(criterion.valueFunction.type == 'linear' || criterion.valueFunction.type == 'piecewise'){
            //     dataFieldType = 'number';
            // }

            datFields.push({
                name: criterion.name, 
                type: dataFieldType
            });
        });

        // Skrije stolpec z ID-jem variante (vid)
        this._columns[0].editable = false;
        this._columns[0].hidden = true;

        // Kreiranje sourca in dataAdapterja za tabelo variant.
        // var _self = this
        var source = {
            localdata: model.getVariants(),
            datafields: datFields,
            datatype: 'array',
            addrow: function(rowid, rowdata, position, commit){

                var validationResult = _self._validateVariantBeforeAdd(rowdata);

                if(validationResult.result != true){
                    $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                        height: 180,
                        contentText: validationResult.message,
                        onlyYes: true
                    });

                    commit(false);
                    return;
                }

                _self.URManager.saveState();
                
                window.model.addVariant(rowdata);
                commit(true);

                setTimeout(function(){
                    gridVariants.rebuildGrid();
                }, 100);
            },
            updaterow: function(rowid, rowdata, commit){

                _self.URManager.saveState();

                window.model.updateVariant(rowdata);
                commit(true);
            },
            deleterow: function(rowid, commit){

                _self.URManager.saveState();

                var rowdata = $('#gridVariants').jqxGrid('getrowdatabyid', rowid);
                var vid = rowdata.vid

                window.model.deleteVariant(vid);

                // window.model.deleteVariant(rowdata.vid);
                commit(true);
            },
        };
        
        this._dataAdapter = new $.jqx.dataAdapter(source);
    }

    this.buildGrid = function(){
        var _self = this;

        $(this.gridSelector).jqxGrid({
            source: this._dataAdapter,
            width: this.gridWidth,
            height: 390,
            autoheight: false,
            columns: this._columns,
            columnsresize: true,
            editable: true,
            pageable: false,
            pagermode: 'simple',
            pagesize: this.pagesize,
            showeverpresentrow: true,
            everpresentrowposition: "top",
            everpresentrowactions: "addBottom",
            showtoolbar: true,
            toolbarheight: 32,
            enablemousewheel: false,
            rendertoolbar: function(toolbar){
                //Vsebina toolbara tabele variant.

                var btnExcelOpen = $("<div style='float:left;margin-left:5px;margin-top:4px;'><img src='images/imgSheet16.png'/></div>");
                toolbar.append(btnExcelOpen);
                btnExcelOpen.jqxButton({ height: 16, disabled: false });
                btnExcelOpen.on('click', function(){
                    if(!this.disabled){
                        _self.loadFromExcel();
                    }
                });
                btnExcelOpen.jqxTooltip({content: "Uvoz variant iz tabelarne datoteke.", animationShowDelay: 1000});

                var btnDeleteAllVariants = $("<div style='float:left;margin-left:4px;margin-top:4px;'><img src='images/imgClear16.png'/></div>");
                toolbar.append(btnDeleteAllVariants);
                btnDeleteAllVariants.jqxButton({ height: 16, disabled: false });
                btnDeleteAllVariants.on('click', function(){
                    if(!this.disabled){

                        $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                            contentText: "Ali ste prepričani, da želite odstraniti vse variante?",
                            yesAction: function(){
                                _self.URManager.saveState();
                                window.model.resetVariants();
                                window.gridVariants.rebuildGrid();
                            }
                        });
                    }
                });
                btnDeleteAllVariants.jqxTooltip({content: "Odstrani vse variante.", animationShowDelay: 1000});

                // var btnDeleteSelectedVariants = $("<div id='btnDeleteSelVar' style='float:left;margin-left:4px;margin-top:4px;'><img src='images/imgRemoveSelected16.png'/></div>");
                // toolbar.append(btnDeleteSelectedVariants);
                // btnDeleteSelectedVariants.jqxButton({ height: 16, disabled: false });
                // btnDeleteSelectedVariants.on('click', function(){
                //     var selectedrowindex = $(_self.gridSelector).jqxGrid('getselectedrowindex');
                //     var rowscount = $(_self.gridSelector).jqxGrid('getdatainformation').rowscount;
                //     if (selectedrowindex >= 0 && selectedrowindex < rowscount) {
                //         var id = $(_self.gridSelector).jqxGrid('getrowid', selectedrowindex);
                //         var commit = $(_self.gridSelector).jqxGrid('deleterow', id);
                //     }
                // });
                // btnDeleteSelectedVariants.jqxTooltip({content: "Delete selected variant from grid.", animationShowDelay: 1000});

                var btnRefreshInconsistentCells = $("<div id='btnRefreshInconsistentCells' style='float:right;margin-right:5px;margin-top:4px;'><img src='images/imgRefresh16.png'/></div>");
                toolbar.append(btnRefreshInconsistentCells);
                btnRefreshInconsistentCells.jqxButton({ height: 16, disabled: false });
                btnRefreshInconsistentCells.on('click', function(){
                    _self.rebuildGrid();
                });
                btnRefreshInconsistentCells.jqxTooltip({content: "Osveži tabelo variant.", animationShowDelay: 1000});

                toolbar.css('visibility', 'visible');
            },
        });

        $('#gridVariants').on('cellbeginedit', function(event){
            // console.log(event);
        });
        $('#gridVariants').on('cellendedit', function(event){
            // console.log(event);

            // var args = event.args;
            // // column data field.
            // var dataField = event.args.datafield;
            // // row's data.

            // var criterion = model.getCriteria(dataField);
            // var rowData = args.row;

            // if(typeof(criterion.valueFunction) != 'undefined' && (criterion.valueFunction.type == "linear" || criterion.valueFunction.type == "piecewise")) {
            //     $("#gridVariants").jqxGrid('setcellvalue', rowData.uid, dataField, "124");
            // }
        });

        $('#gridVariants').on('cellclick', function(event){

            // Kadar je bila kliknjena celica v prvem stolpcu (delete stolpec) ta funkcija poskrbi za izbris izbrane variante.
            if(event.args.columnindex == 1){

                var rowid = $('#gridVariants').jqxGrid('getrowid', event.args.rowindex);
                var commit = $('#gridVariants').jqxGrid('deleterow', rowid);
            }
        });

        $('#gridVariants').jqxGrid('removesort');
    }

    this.rebuildGrid = function(){
        // Meteoda rebuilda oz. refresha grid in tako poskrbi za pravilen prikaz na novo nastavljenih podatkov.
        var _self = this;

        // Poskrbi da bo nov grid refreshan na isti poziciji. Prvo si jo zapomne pred rebuilbom, potem jo ponovno nastavi na prejšnjo vrednost.
        var scrollPosition = $('#gridVariants').jqxGrid('scrollposition');

        // Nastavi nekonsistentne celice.
        _self.refreshInconsistentCells();

        // Pobriše objekt grid in vse njene lasnosti.
        if($(this.gridSelector).length > 0){
            $(this.gridSelector).jqxGrid('destroy');
        }

        // Na novo naredi html element za grid.
        $('#tabVariants').html("<div id='gridVariants'> </div>");
        
        // Naredi nov grid objekt.
        _self.setUpGridData();
        _self.buildGrid();

        // Ponovna nastavitev zamika.
        $('#gridVariants').jqxGrid('scrolloffset', scrollPosition.top, scrollPosition.left);
    }

    this._checkFixedInconsistency = function(){
        // Metoda pridobi vse nekonsistentosti glede prekoračenih/neobstoječih vrednosti fixed kriterijov.
        var _self = this;

        // Za vsak fiksen številski kriterij preveri vrednosti trenutno vnešenih variant.
        // Najdene konflikte zapiše v conflicts.
        // Objekt conflicts ima za ključ ime variante, ki je v konfliktu, kot vrednost pa ima seznam objektov z imeni kriterijev s katerimi je v konfliktu.
        var conflicts = {};
        var variants = model.getVariantsToList();
        
        // Preverjanje fiksnih kriterijev.        
        // Pridobi samo fiksne številske kriterije.
        var criteria = model.getCriteriaToList();
        var fixedCriteria = $.grep(criteria, function(el, indx){
            return el.scaleType == 'fixed' && el.valueFunction.type != 'discrete';
        });

        fixedCriteria.forEach(function(criterion, indx){

            variants.forEach(function(variant, indx){
                
                var value = variant[criterion.name]
                value = parseFloat(value);

                if(criterion.minValue > value || criterion.maxValue < value || ! $.isNumeric(value)){

                    if(typeof(conflicts[variant.Option]) == 'undefined'){
                        conflicts[variant.Option] = [];
                    }

                    conflicts[variant.Option].push({
                        conflictType: 'outOfFixedInterval',
                        criterionName: criterion.name,
                    });
                }
            });
        });

        // Preverjanje diskretnih kriterijev.
        // Pridobi samo diskretne kriterije.
        var discreteCriteria = $.grep(criteria, function(el, indx){
            return el.valueFunction.type == 'discrete';
        });
        discreteCriteria.forEach(function(criterion, indx){
            
            variants.forEach(function(variant, indx){

                if(!criterion.valueFunction.categories.hasOwnProperty(variant[criterion.name])){
                    
                    if(typeof(conflicts[variant.Option]) == 'undefined'){
                        conflicts[variant.Option] = [];
                    }

                    conflicts[variant.Option].push({
                        conflictType: 'discreteCategoryNotExists',
                        criterionName: criterion.name,
                    });
                }
            });
        });
    
        // Preverjanje relativenih kriterijev.
        // Te moraj imeti nastavljeno vrednos in morajo biti številski.
        var relativeCriteria = $.grep(criteria, function(el, indx){
            return el.scaleType == 'relative';
        });

        relativeCriteria.forEach(function(criterion, indx){

            variants.forEach(function(variant, indx){

                var value = variant[criterion.name]
                if(typeof(value) == "undefined" || value == "" || ! $.isNumeric(value)){

                    if(typeof(conflicts[variant.Option]) == 'undefined'){
                        conflicts[variant.Option] = [];
                    }

                    conflicts[variant.Option].push({
                        conflictType: 'notRelativeCriteriaValue',
                        criterionName: criterion.name,
                    });
                }
            });
        });


        return conflicts;
    }

    this.refreshInconsistentCells = function(){
        // Metoda preveri za nekonsistentnosti po uvozu excel datoteke. Če obstaja nekonsistentnost poskrbi za prikaz dialoga.
        var _self = this;

        var inconsistencies = _self._checkFixedInconsistency();

        _self.inconsistentCells = inconsistencies;
    }

    this.getLongestDecimalPlacesInDataOfCriterion = function(criterionName){

        var variants = model.getVariants();

        var maxDecimalPlaces = 0;

        for(var i in variants){
            var variant = variants[i];

            var value = variant[criterionName];
            
            if(typeof(value) === 'undefined'){
                continue;
            }            

            if($.isNumeric(value)){
                var strValue = value.toString().replace(",", ".");
                var splitValue = strValue.split(".");
                if(splitValue.length == 2){
                    if(splitValue[1].length > maxDecimalPlaces){
                        maxDecimalPlaces = splitValue[1].length;
                    }
                }
            }

        }
    }

    // Metode validacije.

    this._cellClassAppender = function(rowIndx, colName, cellValue, rowData){
        // Metoda obarva nekonsistentne celice.

        var _self = this;

        var classes = "";

        var inconsistentCells = window.gridVariants.inconsistentCells;
        if(inconsistentCells.hasOwnProperty(rowData.Option)){

            // Preveri ali je v konfliktu z kriterijem trenutnega stolpca. (če je med konfliktnimi objekti trenutni stolpec)
            var conflictObjects = inconsistentCells[rowData.Option];
            var conflictObjectsWithCriteria = $.grep(conflictObjects, function(el, indx){
                return el.criterionName == colName;
            });

            // Če je v konfliktu ga obarva z določitvijo razreda.
            if(conflictObjectsWithCriteria.length > 0){
                classes += "variantConflictCell";
            }
        }
        
        return classes
    }

    this._cellValidation = function(cell, value){
        // Funkcija za validacijo celic grida. 

        // RDEČE OBARVANE CELICE NISO ENAKO KOT NEVELJAVNE!!! --> Razlika discrete je lahko nekonsistenten ampak je veljaven.

        // Validra fiksne kriterije: Vrednosti fiksnih skal morajo biti znotraj intervala.

        var criterion = model.getCriteria(cell.column);

        //Validacija lastnosti tipa funkcije koristnosti.
        if(criterion.valueFunction.type == 'piecewise' || criterion.valueFunction.type == 'linear'){
            value = value.replace(",", ".");
            if(!$.isNumeric(value)){
                return {
                    result: false,
                    message: "Vrednost za tip funkcije: '" + criterion.valueFunction.type + "' mora biti numerična!"
                }
            }
        }

        // Validacija lastnosti z fixed skalo.
        if(criterion.scaleType == "fixed"){
            value = parseFloat(value);
            var min = parseFloat(criterion.minValue);
            var max = parseFloat(criterion.maxValue);
            if(value < min || value > max){
                return {
                    result: false,
                    message: "Vnešena vrednost je izven fiksnega intervala: " + criterion.minValue + " - " + criterion.maxValue
                }
            }
        }
        
        return {result: true};
    }

    this._columnOptionValidation = function(cell, value){
        // Validira se prvi stolpec Option, kjer morajo vse variante vsebovati vrednost in biti unikatne.

        // METODA BREZ _self, ker je tudi klicana kot callback.
        var vidOfEditedVariant = $('#gridVariants').jqxGrid('getcellvalue', cell.row, "vid")

        var result = gridVariants._optionValidation(vidOfEditedVariant, value);

        return result;
    }

    this._optionValidation = function(vid, value){
        // Validira stolpec Option ... vid je id variante za katero je podana vrednost value.
        // Vrednost vid naj bo -1 kadar varianta še ni doddana.

        if(value.trim() == ""){
            return{
                result: false,
                message: "Vrednost za 'Option' mora biti vnešena!"
            }
        }

        var variants = model.getVariantsToList();

        for(var i = 0; i < variants.length; i++){
            var variant = variants[i];

            // Isto ime ima lahko če gre za isto varianto (torej če ima isti ID).
            if(variant.Option == value && vid != variant.vid){
                return {
                    result: false,
                    message: "Varianta z lastnostjo 'Option': '" + value + "' že obstaja!"
                }
            }
        }

        return { result: true };
    }

    this._validateVariantBeforeAdd = function(variant){
        // Metoda validira varianto (pred dodajanjem).
        var _self = this;

        // _self._columnOptionValidation();

        var result = gridVariants._optionValidation(-1, variant.Option);

        return result;
    }

    // Metode - EXCEL

    this._recreateFileChooser = function(){
        // Metoda vrne file chooser. Če ne obstaja ga naredi.
        // Kadar obstaja njegovo vrednost nastavi na null, da je možno brati isto datoteko...

        var fileChooser;

        $("#excelFileChooser").value = null;
        if($("#excelFileChooser").size() == 0){
            fileChooser = document.createElement('input');
            fileChooser.setAttribute('type', 'file');
            fileChooser.setAttribute('id', 'excelFileChooser');
            fileChooser.setAttribute('accept', '.xls,.xlsx');
            fileChooser.style.display = 'none';
            document.getElementsByTagName("body")[0].appendChild(fileChooser);
        }
        else{
            fileChooser = document.getElementById('excelFileChooser');
            fileChooser.value = null;
        }

        return fileChooser;
    }

    this._getExcelManipulationObjectForFile = function(excelFile){
        // Metoda vrne objekt za manipulacijo podane excel datoteke glede na tip datoteke. (xls ali xlsx)
        
        var X;

        var fileName = excelFile.name;
        var filetype = fileName.split(".")[1];

        if(filetype == "xls"){
            X = XLS;
        }
        else if(filetype == "xlsx"){
            X = XLSX;
        }

        return X;
    }

    this._checkOptionProperty = function(variantsFromSheet){
        // Metoda preveri ali imajo vse variante "kriterij" Option.
        // Če kateri varianti "Option" manjka opozori uporabnika in vrže izjemo.

        for(var i = 0; i < variantsFromSheet.length; i++){
            if(!variantsFromSheet[i]['Option']){

                $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                    onlyYes: true,
                    headerText: 'Opozorilo!',
                    contentText: 'Vse variante morajo vsebovati stolpec: "Option"!',
                    throwException: true
                });
            }
        }
    }

    this._setValueToVariant = function(variant, criterion, value){
        // Metoda doda vrednost kriterija varianti.

        // Če podana vrednost ne obstaja jo nadomesti z praznim string-om.
        var newValue = value ? value : '';

        // Kadar gre za diskretni kriterij vrednost samo doda.
        if(criterion.valueFunction.type == 'discrete'){

        }
        else if(criterion.valueFunction.type == 'linear' || criterion.valueFunction.type == 'piecewise'){
            // Vsem numeričnim vrednostim zamenja decimalno vejico za piko.
            var replacedValue = newValue.replace(",", ".");
            if($.isNumeric(replacedValue)){
                newValue = replacedValue;
            }

            newValue = parseFloat(newValue);
        }
        
        // Varianti zapiše novo vrednost.
        variant[criterion.name] = newValue;
    }   

    this._addAllExcelVariantsToModel = function(excelVariants){
        // Metoda podane variante (iz excela) doda v model.

        var unaddedVariants = "";

        // Pridobi vse dosedanje kriterije modela.
        var criteria = model.getCriteriaToList();

        for(var i = 0; i < excelVariants.length; i++){
            
            // Ustvari novo varianto. Doda ji vsak kriterij v modelu. 
            var newVariantOption = excelVariants[i]['Option'];

            // Če model že vsebuje varianto z podanim optionom, jo preskoči in je ne doda.
            if(model.containsVariantWithOption(newVariantOption)){

                unaddedVariants += newVariantOption + ", ";
                continue;
            }

            var newVariant = { Option: excelVariants[i]['Option']};
            for(var j = 0; j < criteria.length; j++){
                var criterion = criteria[j];
                
                // Doda vrednost varianti.
                this._setValueToVariant(newVariant, criterion, excelVariants[i][criterion.name]);
            }

            window.model.addVariant(newVariant);
        }

        // Če katera od variant ni bila dodana to sporoči uporabniku.
        if(unaddedVariants != ""){
            unaddedVariants = unaddedVariants.substring(0, unaddedVariants.length - 2);
            $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                contentText: "Nedodane variante: " + unaddedVariants,
                onlyYes: true
            });
        }
    }

    this.loadFromExcel = function(variantsModel){
        // Metoda poskrbi za nalaganje in uvoz variant iz excel datoteke.

        var _self = this;
        
        // Kreireanje file chooserja.
        var fileChooser = _self._recreateFileChooser();
        
        fileChooser.onchange = function(){
            // Ob izboru datoteke pripravi pravilen objekt za manipulacijo datoteke.
            // Poskrbi tudi za branje datoteke (FileReader).

            var excelFile = this.files[0];
            var excelManipulator = _self._getExcelManipulationObjectForFile(excelFile);
            
            var fileReader = new FileReader();

            fileReader.onload = function(e){

                _self.URManager.saveState();
                _self.URManager.pauseSaving = true;                

                var data = e.target.result;

                var workbook = excelManipulator.read(data, {type: 'binary'});

                // Iz workbook-a prebere prvi sheet, ki ga ta vsebuje.
                var sheet = workbook.Sheets[Object.keys(workbook.Sheets)[0]];
                var variants = excelManipulator.utils.sheet_to_json(sheet);

                // Preveri Option property.
                _self._checkOptionProperty(variants);

                // Doda variante v model.
                _self._addAllExcelVariantsToModel(variants);
                
                _self.URManager.pauseSaving = false;

                // Na novo zgradi grid ter obarva nekonsistentne celice.
                _self.rebuildGrid();

            };

            fileReader.readAsBinaryString(excelFile);
        }
        
        fileChooser.click();
    }

    // Metode UNDO/REDO

    this.getStateOfVariants = function(){

        var variantDataString = model.getVariantsString();

        return variantDataString;
    }

    this.setStateOfVariants = function(state){

        var objState = JSON.parse(state);

        model.updateVariants(objState);
  
        this.rebuildGrid();
    }

    this.URManager = new UMG(this.getStateOfVariants, this.setStateOfVariants, 100, true, this);
}


//////////////////////////////////
//////      DREVO KRITERIJEV
//////////////////////////////////

function ValueTree(){

    this.margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 50
    };

    this.width = 960;
    this.height = 500;

    this.translationDuration = 900;
    this.treeLayout;
    this.diagonalFunction;
    this.svg;
    this._criteria;
    this.idCriteria = 0;


    this.recalcData = function(criteria){
        this._criteria = criteria;
        
        this.treeLayout = d3.layout.cluster()
        .size([this.height, this.width]);

        //RISE POVEZAVE MED VOZLISCI
        // this.diagonalFunction = d3.svg.diagonal()
        //     .projection(function(d) {return [d.y, d.x];});
         
        this.diagonalFunction = function(d, i) { 
          return "M" + d.source.y + "," + d.source.x
              + "L " + d.target.y + " " + d.target.x;
        }

        this.svg = d3.select("#svgTree").html('')
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        this._criteria.x0 = this.height / 2;
        this._criteria.y0 = 0;

        this.updateView(this._criteria);
    }

    this.updateView = function(source){
        var _self = this;

        source = source ? source : this._criteria;

        // Compute the new tree layout.
        var nodes = this.treeLayout.nodes(this._criteria).reverse();
        var links = this.treeLayout.links(nodes);

        // Normalize for fixed-depth. 
        var maxDepth = 0;
        nodes.forEach(function(d) {
            if(d.depth > maxDepth) maxDepth = d.depth;    
        });
        nodes.forEach(function(d) { 
            // d.y = d.depth * 180;
            if(d.depth < maxDepth && d.children == null){
                d.y = maxDepth * 180;
            }else{
                d.y = d.depth * 180; 
            } 
        });

        // Update the nodes
        var node = this.svg.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++_self.idCriteria); 
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .on("click", function(d){
                currentD = d;
                var circle = d3.event.target.parentNode.getElementsByTagName("circle")[0];
                krozniMenu.odpriMenu(circle);
            });
        !!!
        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .attr("class", "openCircMenu")
            .attr('nodeType', function(d){ 
                return d.type;
            })
            .style("fill", function(d) { 
                var color = "#fff"; 
                if(d.type == 'criterion'){
                    color = 'lightsteelblue';
                }
                return color;
            });

        nodeEnter.append("text")
            .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(this.translationDuration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
            .attr("r", 10)
            .attr('nodeType', function(d){ 
                return d.type;
            })
            .style("fill", function(d) { 
                var color = "#fff"; 
                if(d.type == 'criterion'){
                    color = 'lightsteelblue';
                }
                return color;
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(this.translationDuration)
            .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the linksō
        var link = this.svg.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return _self.diagonalFunction({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(this.translationDuration)
            .attr("d", this.diagonalFunction);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(this.translationDuration)
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return _self.diagonalFunction({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });  
    }

    // Za undo/redo

    this.getStateOfTree = function(){

        var treeDataString = model.getCriteriaString();

        return treeDataString;
    }

    this.setStateOfTree = function(state){

        var objState = JSON.parse(state);

        model.updateCriteria(objState);

        var durationOld = window.valueTree.translationDuration;
        window.valueTree.translationDuration = 0;
        window.valueTree.recalcData(model._criteria);
        window.valueTree.translationDuration = durationOld;
    }

    this.URManager = new UMG(this.getStateOfTree, this.setStateOfTree, 100, true, this);
}


$(document).ready(function(){

    function FVDialogWindow(selector, windowOptions){

        this.selector = selector;

        var defaultWindowOptions = {
            width: 420,
            height: 480,
            resizable: false,
            isModal: true,
            position: "center",
            autoOpen: false,
            draggable: true
        };

        this.windowOptions = $.extend(defaultWindowOptions, windowOptions);

        $(this.selector).jqxWindow(this.windowOptions);

        this.initDialogContent();
    }

    FVDialogWindow.prototype.centralizeDialog = function(){
        // Premakne dialog na sredino.
        var _self = this;

        var x = ($(document).width() / 2) - (_self.windowOptions.width / 2);
        var y = (($(window).height()/2) - (_self.windowOptions.height / 2) + $(document).scrollTop());

        if(y < 0){
            y = 10;
        } 

        $(_self.selector).jqxWindow({        
            position: {
                x: x,
                y: y
            }
        });
    }

    FVDialogWindow.prototype.close = function(){
        var _self = this;

        _self.resetDialogContent();

        $(_self.selector).jqxWindow('close');
    }

    FVDialogWindow.prototype.initDialogContent = function(){
        throw "Funkcijo je 'initDialogContent' potrebno implementirati v 'razredu', ki deduje od FVDialogWindow!";
    }

    FVDialogWindow.prototype.resetDialogContent = function(){
        throw "Funkcijo 'resetDialogContent' je potrebno implementirati v 'razredu', ki deduje od FVDialogWindow!";
    }


    //////////////////////////////////
    //////    DIALOG KREIRANJA/UREJANJA KRITERIJA
    //////////////////////////////////

    function FVDialogCriteriaDetails(selector){
        
        var windowOptions = {
            height: 480, 
            width: 420
        };

        FVDialogWindow.call(this, selector, windowOptions);

        this.criterion = {};
        this.openMode = "";
    }
    FVDialogCriteriaDetails.prototype = Object.create(FVDialogWindow.prototype);
    FVDialogCriteriaDetails.prototype.constructor = FVDialogCriteriaDetails;

    FVDialogCriteriaDetails.prototype.initDialogContent = function(){
        var _self = this;

        // Sprva pridobi oz. kreira vse gradnike dialoga.
        var tfName = $("#tfName").jqxInput({height: 19, width: 250});
        $("#tfName").on('change', function(event){

            // Trima vsebino:
            var trimmedVal = $("#tfName").val().trim()

            $("#tfName").val(trimmedVal);
        });
        var selScaleType = $("#selScaleType");
        var selselValFuncType = $('#selValFuncType');
        var tfMin = $("#tfMin").jqxInput({height: 19, width: 65});
        var tfMax = $("#tfMax").jqxInput({height: 19, width: 65});
        var cbInverseScale =  $("#cbInverse");
        var taDescription = $("#taDescription");

        var btnUpdate = $('#btnSaveCritDet').jqxButton({width: 55});
        var btnCancel = $('#btnCloseCritDet').jqxButton({width: 55});

        var selectValidatorNotNull = function(input, commit){
            return input.val() != null;
        } 
        var isMinMaxValidator = function(input, commit){
            
            var val = input.val();
            val = val.replace(',', '.');

            if(!$.isNumeric(val)){
                return val.toLocaleLowerCase() == 'min' || val.toLocaleLowerCase() == 'max';
            }
            return $.isNumeric(val);
        }

        $('#formCriteriaDetails').jqxValidator({
            rules: [
                { input: '#tfName', message: 'Polje je obvezno!', action: 'keyup, blur', rule: 'required' },
                { input: '#selScaleType', message: 'Polje je obvezno!', action: 'keyup, blur', rule: selectValidatorNotNull},
                { input: '#selValFuncType', message: 'Polje je obvezno!', action: 'keyup, blur', rule: selectValidatorNotNull },
                { input: '#tfMin', message: 'Polje je obvezno!', action: 'keyup, blur', rule: 'required' },
                { input: '#tfMin', message: 'Polje mora vsebovati število!', action: 'keyup, blur', rule: isMinMaxValidator },
                { input: '#tfMax', message: 'Polje je obvezno!', action: 'keyup, blur', rule: 'required' },
                { input: '#tfMax', message: 'Polje mora vsebovati število!', action: 'keyup, blur', rule: isMinMaxValidator },
                { input: '#tfName', message: 'Ime že obstaja!', action: 'keyup, blur', rule: function(input, commit){
                    var existingCriterias = model.getAllCriteraAndNodeToList();

                    var isValid = true;
                    existingCriterias.forEach(function(element, index){

                        if(element.name == $("#tfName").val()){
                            if(_self.openMode == "M" && element.cid == _self.criterion.cid){
                                return false;
                            }
                            isValid = false;
                        }
                    });

                    return isValid;
                }}
            ]
        });

        btnUpdate.on('click', function(){

            $('#formCriteriaDetails').jqxValidator('validate');
        });
        
        $('#formCriteriaDetails').on('validationSuccess', function(event){
            
            var newName = $("#tfName").val().trim();

            // Lastnosti variant se preimenuje samo če gre za Modification mode ter če se je ime spremenilo. (in če tako želi uporabnik)
            // Dialog se ravno tako ne odpre če variante nimajo te lastnosti ali če ni nobene variante.
            var variants = model.getVariants();
            var variantKeys = Object.keys(variants);
            if(variantKeys.length == 0 || !variants[variantKeys[0]].hasOwnProperty(_self.oldCriterionName)
                || _self.openMode == "C" || ( _self.oldCriterionName == newName )){

                _self.saveChanges();
                _self.close();
                return;
            }

            $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                height: 180,
                headerText: 'Opozorilo!',
                contentText: "Želite preimenovati tudi lastnosti variant?",
                yesAction: function(){
                    // Funkcija prvo preimenuje lastnosti variant potem shrani nov posodobljen kriterij.

                    model.renamePropertyOfVariants(_self.oldCriterionName, newName);

                    _self.saveChanges();
                    _self.close()
                },
                noAction: function(){
                    // Funkcija shrani samo kriterij.

                   // model.removePropertyOfVariants(_self.oldCriterionName);

                    _self.saveChanges();
                    _self.close();
                }
            });
        });

        selScaleType.on('change', function(event){

            // Ob spremembi je izbrana prva izbira valfunc...  
            _self.refreshValueFunctionDropDown();
            $('#selValFuncType option:first').attr('selected', 'selected');

            _self.refreshDialogContent();
        });

        selselValFuncType.on('change', function(event){
            var selVal = selselValFuncType.val();
            _self.refreshDialogContent();
            selselValFuncType.val(selVal);
        });

        btnCancel.on('click', function(){
            _self.close();
        });
    }

    FVDialogCriteriaDetails.prototype.resetDialogContent = function(){

        $("#tfName").val('');
        $("#selScaleType").val('');
        $('#selValFuncType').val('');
        $('#selValFuncType').html('');
        $("#tfMin").val('');
        $("#tfMax").val('');
        $("#cbInverse").prop('checked', false);
        $("#taDescription").val('');
    }

    FVDialogCriteriaDetails.prototype.setDialogContent = function(criterion){
        // Funkcija nastavi vrednosti kontrol na vrednosti podanega kriterija.
        var _self = this;

        if(typeof(criterion) === 'undefined' || criterion == null){
            return;
        }

        _self.refreshValueFunctionDropDown(criterion.scaleType);

        $("#tfName").val(criterion.name);
        $("#selScaleType").val(criterion.scaleType);
        $('#selValFuncType option:first').attr('selected', 'selected');
        $('#selValFuncType').val(criterion.valueFunction.type);
        $("#tfMin").val(criterion.minValue);
        $("#tfMax").val(criterion.maxValue);
        $("#cbInverse").prop('checked', criterion.inverseScale);
        $("#taDescription").val(criterion.description);

        _self.refreshDialogContent();
    }

    FVDialogCriteriaDetails.prototype.open = function(criterion){
        // Metoda odpre dialog za kreiranje/spreminjanje kriterija.
        // Če ima podan kriterij je način odprtja Modification (M), sicer Creation (C).
        var _self = this;

        _self.centralizeDialog();

        if(typeof(criterion) == 'undefined'){
            _self.openMode = 'C';
            //Kadar je v Creation načinu prvo naredi prazen kriterij.
            _self.criterion = model.createNewEmptyModelCriterion();
        }
        else{
            _self.openMode = "M";
            _self.criterion = criterion;
            _self.oldCriterionName = criterion.name;
        }

        _self.resetDialogContent();

        if(_self.openMode == "M"){
            _self.setDialogContent(criterion);
        }

        $(_self.selector).jqxWindow('open');
    }

    FVDialogCriteriaDetails.prototype.refreshDialogContent = function(){
        // Osveži gradnike (disable/enable, polnjenje dropdownow....)
        var _self = this;

        var scaleType = $("#selScaleType").val();
        var selValFunctionType = $('#selValFuncType').val();

        _self.refreshValueFunctionDropDown(scaleType);
        $('#selValFuncType').val(selValFunctionType)

        if(scaleType == 'relative'){
            $("#tfMin").jqxInput({ disabled: true });
            $("#tfMin").val('Min');
            $("#tfMax").jqxInput({ disabled: true });
            $("#tfMax").val('Max');
            $('#cbInverse').prop('disabled', false);
        }
        else if(scaleType == 'fixed'){
            
            if(selValFunctionType == 'linear' || selValFunctionType == 'piecewise' || selValFunctionType == null){
                $("#tfMin").jqxInput({ disabled: false });
                $("#tfMax").jqxInput({ disabled: false });
                $('#cbInverse').prop('disabled', false);

                if($("#tfMin").val() == '' || $("#tfMin").val() == 'Min'){
                    $("#tfMin").val('0');
                }
                if($("#tfMax").val() == '' || $("#tfMax").val() == 'Max'){
                    $("#tfMax").val('100');
                }
            }
            else if(selValFunctionType == 'discrete'){
                $("#tfMin").jqxInput({ disabled: true });
                $("#tfMax").jqxInput({ disabled: true });
                $('#cbInverse').prop('disabled', true);

                $("#tfMin").val('0');
                $("#tfMax").val('100');
            }
        }

        if(selValFunctionType == 'piecewise' || selValFunctionType == 'discrete'){
            $('#cbInverse').attr('disabled', true)
            $('#cbInverse').prop('checked', false);
        }
        else{
            $('#cbInverse').attr('disabled', false)
        }
    }

    FVDialogCriteriaDetails.prototype.refreshValueFunctionDropDown = function(scaleType){
        // Funkcija nastavi vrednosti drop downu funkcije koristnosti glede na podano vrednos tipa skale.

        if(scaleType == 'relative' || typeof(scaleType) === 'undefined'){
            $('#selValFuncType').html('<option value="linear">Linear</option><option value="piecewise">Piecewise</option>');
        }
        else if(scaleType == 'fixed'){
            $('#selValFuncType').html('<option value="linear">Linear</option><option value="piecewise">Piecewise</option><option value="discrete">Discrete</option>');
        }
    }

    FVDialogCriteriaDetails.prototype.saveChanges = function(){
        // Metoda shrani trenutno urejen kriterij v model.

        var _self = this;

        var valueFunctionChanged = false;

        if(_self.openMode == "M"){
            if(_self.criterion.valFuncType != $('#selValFuncType').val()){
                valueFunctionChanged = true;
            }
        }

        // Kreiranje novega kriterija
        var criterion = _self.criterion;
        criterion["type"] = 'criterion';
        criterion.name = $("#tfName").val();
        criterion.scaleType = $("#selScaleType").val();
        criterion.valFuncType = $('#selValFuncType').val();
        criterion.minValue = myParseFloat($("#tfMin").val());
        criterion.maxValue = myParseFloat($("#tfMax").val());
        criterion.inverseScale = $("#cbInverse").prop('checked');
        criterion.description = $("#taDescription").val();

        // Kreiranje/Modificiranje valueFunciton-a kriterija. - Če se spremeni tip val. func. naredi nov val. function objekt.
        if(_self.openMode == 'C' || (_self.openMode == 'M' && valueFunctionChanged) ){
            if(criterion.valFuncType == 'linear'){
                criterion.valueFunction = model.createEmptyLinearValueFunction();
            }
            else if(criterion.valFuncType == 'piecewise'){
                criterion.valueFunction = model.createEmptyPiecewiseValueFunction();
            }
            else if(criterion.valFuncType == 'discrete'){
                criterion.valueFunction = model.createEmptyDiscreteValueFunction();
            }
        }


        if(_self.openMode == "C"){
            window.valueTree.URManager.saveState();
            model.addNode(currentD, criterion);
        }
        else if(_self.openMode == "M"){
            model.updateCriterion(currentD.name, criterion);

            // Ob spreminjanju kriterija se animacija drevesa ne sme zgoditi.
            var oldDur = window.valueTree.translationDuration;
            window.valueTree.translationDuration = 0;
            window.valueTree.recalcData(model.getAllNodes());
            window.valueTree.translationDuration = oldDur;
        }
    }


    //////////////////////////////////
    //////    DIALOG KREIRANJA/UREJANJA VOZLIŠČ
    //////////////////////////////////

    function FVDialogNodeDetails(selector){
        
        var windowOptions = {
            height: 250, 
            width: 420
        };

        FVDialogWindow.call(this, selector, windowOptions);

        this.criterion = {};
        this.openMode = "";
    }
    FVDialogNodeDetails.prototype = Object.create(FVDialogWindow.prototype);
    FVDialogNodeDetails.prototype.constructor = FVDialogNodeDetails;

    FVDialogNodeDetails.prototype.initDialogContent = function(){
        var _self = this;

        var tfName = $("#tfNameNode").jqxInput({height: 19, width: 250});
        $("#tfNameNode").on('change', function(event){

            // Trima vsebino:
            var trimmedVal = $("#tfNameNode").val().trim()

            $("#tfNameNode").val(trimmedVal);
        });

        var taDescription = $("#taDescriptionNode");

        var btnSave = $('#btnSaveNodeCreate').jqxButton({width: 55});
        btnSave.on('click', function(){
            $('#formNodeDetails').jqxValidator('validate');
        });

        var btnClose = $('#btnCloseNodeCreate').jqxButton({width: 55});
        btnClose.on('click', function(){
            _self.close();
        });

        $('#formNodeDetails').jqxValidator({
            rules: [
                { input: '#tfNameNode', message: 'Polje je obvezno!', action: 'keyup, blur', rule: 'required' },
                { input: '#tfNameNode', message: 'Ime že obstaja!', action: 'keyup, blur', rule: function(input, commit){
                    
                    var existingCriterias = model.getAllCriteraAndNodeToList();

                    var isValid = true;
                    existingCriterias.forEach(function(element, index){
                        
                        if(element.name == $("#tfNameNode").val()){
                            if(_self.openMode == "M" && element.cid == _self.criterion.cid){
                                return false;
                            }
                            isValid = false;
                        }
                    });

                    return isValid;
                }}
            ]
        });
        $('#formNodeDetails').on('validationSuccess', function(){

            var nodeDet;
            // Če gre za Root vozlišče je drugačen objekt...
            if(_self.openMode == "M" && _self.criterion.type == 'root'){
                nodeDet = model.createNewEmptyRoot();
            }
            else{
                nodeDet = model.createNewEmptyModelNode();
            }

            nodeDet.name = tfName.val();
            nodeDet.description = taDescription.val();

            var contains = model.containsNodeName(nodeDet.name);
            

            if(_self.openMode == "C"){

                window.valueTree.URManager.saveState();
                model.addNode(currentD, nodeDet);
            }
            else if(_self.openMode == "M"){
                model.updateNodeProperties(currentD.name, nodeDet);

                var oldDur = window.valueTree.translationDuration;
                window.valueTree.translationDuration = 0;
                window.valueTree.recalcData(model.getAllNodes());
                window.valueTree.translationDuration = oldDur;
            }

            _self.close();
        });
    }

    FVDialogNodeDetails.prototype.resetDialogContent = function(){
        var _self = this;

        $("#tfNameNode").val('');
        $("#taDescriptionNode").val('');
    }

    FVDialogNodeDetails.prototype.setDialogContent = function(criterion){
        
        if(typeof(criterion) == 'undefined'){
            return;
        }

        $("#tfNameNode").val(criterion.name);
        $("#taDescriptionNode").val(criterion.description);
    }

    FVDialogNodeDetails.prototype.open = function(criterion){
        // Metoda odpre dialog za kreiranje/spreminjanje vozlišča.
        // Če ima podano vozlišče je način odprtja Modification (M), sicer Creation (C).
        var _self = this;

        _self.centralizeDialog();

        if(typeof(criterion) == 'undefined'){
            _self.openMode = 'C';
        }
        else{
            _self.openMode = "M";
        }

        _self.resetDialogContent();
        _self.criterion = criterion;

        if(_self.openMode == "M"){
            _self.setDialogContent(criterion);
        }

        $(_self.selector).jqxWindow('open');
    }


    //////////////////////////////////
    //////    DIALOG VAL. FUNC. PIECEWISE
    //////////////////////////////////

    function FVDialogValueFunctionPicewise(selector){

        var windowOptions = {
            width: 550,
            height: 550,
        };

        FVDialogWindow.call(this, selector, windowOptions);

        this.criterion = {};

        this.defaultNumberOfPoints = 4;
        this.numOfPoints = this.defaultNumberOfPoints;
        this.points = [];
        this.xAxisLabel = "Kriterij";
        this.min = 0;
        this.max = 100;

        this.chart = {};

        this.URManager = new UMG(this.getStateOfWindow, this.setStateOfWindow, 100, false, this);
    }
    FVDialogValueFunctionPicewise.prototype = Object.create(FVDialogWindow.prototype);
    FVDialogValueFunctionPicewise.prototype.constructor = FVDialogValueFunctionPicewise;

    FVDialogValueFunctionPicewise.prototype.initDialogContent = function(){
        var _self = this;

        $('#btnResetPiecewiseGraph').jqxButton({width:115});
        $('#btnResetPiecewiseGraph').on('click', function(event){
            _self.numOfPoints = parseInt($('#selNumOfPointsPiecewise').val());
            _self.resetGraph();
            _self.drawGraph();
            _self.URManager.saveState();
        });

        $('#btnSavePiecewise').jqxButton({width:55});
        $('#btnSavePiecewise').on('click', function(){
            _self.saveChanges();
            _self.close();
        });

        $('#btnClosePiecewise').jqxButton({width:55});
        $('#btnClosePiecewise').on('click', function(){
            window.valueTree.URManager.setAsCurrentUMG();
            _self.close();
        });

        $('#selNumOfPointsPiecewise').val(this.defaultNumberOfPoints);
        $('#selNumOfPointsPiecewise').on('change', function(event){
            _self.numOfPoints = parseInt($('#selNumOfPointsPiecewise').val());
            // _self.resetGraph();
            // _self.drawGraph();
        });
    }

    FVDialogValueFunctionPicewise.prototype.resetDialogContent = function(){
        var _self = this;

        _self.numOfPoints = this.defaultNumberOfPoints;
        _self.points = [];
        _self.xAxisLabel = "Criterion";
        _self.min = 0;
        _self.max = 100;

        $('#selNumOfPointsPiecewise').val(_self.numOfPoints);

        _self.resetGraph();
    }

    FVDialogValueFunctionPicewise.prototype.setDialogContent = function(criterion){
        var _self = this;

        this.xAxisLabel = criterion.name;
        this.min = parseFloat(criterion.minValue);
        this.max = parseFloat(criterion.maxValue);

        if(criterion.valueFunction.points.length != 0){
            this.numOfPoints = criterion.valueFunction.points.length;
            this.points = _self.firstAndLastPointCheck(criterion.valueFunction.points);
        }
        else{
            this.points = _self.generateDefaultPointsForRange();
            this.numOfPoints = this.defaultNumberOfPoints;
        }

        $('#selNumOfPointsPiecewise').val(_self.numOfPoints);

        this.drawGraph();
    }

    FVDialogValueFunctionPicewise.prototype.open = function(criterion){
        // Metoda odpre dialog za kreiranje/spreminjanje vozlišča.
        // Če ima podano vozlišče je način odprtja Modification (M), sicer Creation (C).
        var _self = this;
        
        if(typeof(criterion) == 'undefined'){
            throw "Dialogu ni bil podan noben kriterij."
        }

        if(criterion.valueFunction.type != 'piecewise'){
            throw "Grafa za piecewise ni mogoče generirati za tip: " + criterion.valueFunction.type;
        }

        this.centralizeDialog();

        this.resetDialogContent();    

        this.criterion = criterion;

        var isValid = _self.validateBeforeOpen();
        if(!isValid){
            return;
        }

        if(criterion.scaleType == 'relative'){
            
            model.refreshMinMaxValueOfCriterion(criterion);
        }

        _self.setDialogContent(criterion);

        _self.URManager.setAsCurrentUMG();
        _self.URManager.saveState();

        $(_self.selector).jqxWindow('open');
    }

    FVDialogValueFunctionPicewise.prototype.resetGraph = function(){
        // Resetira picewise graf in naredi klic ponovnega izrisa.
        var _self = this;

        // Ne prestavljaj, čene lahko pride do napake. ali pa naredi reset grafa z series[n].remove(true))
        $('#graphValFuncPiecewise').html('');
        _self.points = [];

        if(typeof(_self.numOfPoints) === 'undefined' || _self.numOfPoints == 0){
            _self.drawGraph();

            return;
        }

        _self.points = _self.generateDefaultPointsForRange();

        _self.drawGraph();
    }

    FVDialogValueFunctionPicewise.prototype.generateDefaultPointsForRange = function(){
        var _self = this;

        var points = [];

        var xRange = _self.max - _self.min;

        var x = _self.min;
        var xStep = xRange / (_self.numOfPoints-1);
        var y = 100;
        var yStep = 100 / (_self.numOfPoints-1);
        for(var i = 0; i < _self.numOfPoints; i++){
            // Točki doda še index myIndex.
            // To se uporablja pri prikazu, za pomoč pri omejevanju premikanja točke, ki omogoča,
            // da graf vsebuje pravilno funkcijo.

            var newPoint = {
                x:x, 
                y:y,
                myIndex: i
            };

            points.push(newPoint);

            x += xStep;
            y -= yStep;
        }
        points[points.length-1].y = 0;
        points[points.length-1].x = _self.max;

        return points;
    }

    FVDialogValueFunctionPicewise.prototype.drawGraph = function(){

        var _self = this;
           
        // Točke je potrebno kopirati (sicer so referencirane in se tudi ob Close "shrani" trenutna pozicija)
        var points = [];
        _self.points.forEach(function(el, indx){
            points.push({
                x: el.x,
                y: el.y,
                myIndex: el.myIndex
            });
        });

        _self.chart = new Highcharts.Chart({
            chart: {
                renderTo: 'graphValFuncPiecewise',
                animation: false,
            },
            title: {
                text: ''
            },
            xAxis: {
                min: _self.min,
                max: _self.max,
                startOnTick: true,
                endOnTick: true,
                title:{
                    text: _self.xAxisLabel
                },
            },
            yAxis:{
                max: 100,
                min: 0,
                title:{
                    text:'Preferenčna vrednost'
                },
            },
            plotOptions: {
                column: {
                    stacking: 'normal'
                },
                line: {
                    cursor: 'ns-resize'
                }
            },
            tooltip: {
                enabled: true,
                useHTML:true,
                valueDecimals: 2,
                formatter: function(){
                    return '<b>Preferenčna vrednost:</b> ' + this.y.toFixed(2) + '</br> <b>' + _self.criterion.name + ':</b> ' + this.x.toFixed(2);
                }
            },
            series: [{
                data: points,
                point: {
                    events: {
                        update: function(event){
                            // Metoda skrbi, da se točke na grafu lahko premikajo samo v intervalu od prejšnje do naslednje točke po X osi.
                            // Kadar bi prišlo do prekoračitve in je potrebno razveljaviti premik je potrebno vrniti false.

                            var pointIndx = event.currentTarget.myIndex
                            var numOfPoints = event.currentTarget.series.data.length;

                            var min = _self.min;
                            var max = _self.max;

                            if(pointIndx != 0){
                                min = event.currentTarget.series.data[pointIndx - 1].options.x;
                            }
                            
                            if(pointIndx != numOfPoints-1){
                                max = event.currentTarget.series.data[pointIndx + 1].options.x;
                            }

                            // valToAdd je zato, da pride pri vlečenju točk do lepih intervalov.
                            // Če gre za prvo točko in min ali za zadnjo in max potem se ne doda/odšteje nič.
                            var valToAdd = 0.01
                            if(event.options.x >= max){
                                // Ali gre za zadnjo točko.
                                if(pointIndx == numOfPoints - 1){
                                    valToAdd = 0.00
                                }
                                event.options.x = max - valToAdd
                            }

                            if(event.options.x <= min){
                                // Ali gre za prvo točko.
                                if(pointIndx == 0){
                                    valToAdd = 0.00
                                }
                                event.options.x = min + valToAdd
                            }
                            // if(event.options.x <= min || event.options.x >= max){
                            //     return false;
                            // }
                        },
                        drop: function(event){
                            _self.URManager.saveState(_self);
                        }
                    }
                },
                draggableY: true,
                draggableX: true,
                dragMinY:0,
                dragMinX:_self.min,
                dragMaxY:100,
                dragMaxX:_self.max,
                pointInterval: 1,
                showInLegend: false
            },
            {
                name: "spodnja meja",
                data: [{x: _self.min, y:0}, {x:_self.min, y:100}],
                color: '#cccccc',
                lineWidth: 1,
                states: { hover: {enabled: false}},
                enableMouseTracking: false
            },
            {
                name: "zgornja meja",
                data: [{x: _self.max, y:0}, {x:_self.max, y:100}],
                color: '#cccccc',
                lineWidth: 1,
                states: { hover: {enabled: false}},
                enableMouseTracking: false
            }]
        });

        // Skrivanje Highcharts.com napisa v spodnjem desnem kotu grafa...
        $('text:contains("Highcharts.com")').remove();
    }

    FVDialogValueFunctionPicewise.prototype.validateBeforeOpen = function(){
        // Metoda preveri ali je model veljaven za odprtje dialoga Piecewise.
        var _self = this;

        var variants = model.getVariants();
        var variantKeys = Object.keys(variants);

        if(variantKeys.length == 0 && _self.criterion.scaleType == "relative"){
            $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                height: 180,
                onlyYes: true,
                headerText: 'Opozorilo!',
                contentText: "Dialoga ni možno odpreti. Prvo je potrebno vnesti variante, da se pridobi min in max vrednost.",
                yesAction: function(){
                    // Fukcija proži brisanje kategorije.

                    $(event.target).closest('.categoryDiv').remove();

                    // var catName = $(event.target).closest('.categoryDiv').find('.categoryNameText span').html();
                    // _self._removeCategory(catName);
                }
            });

            return false;
        }

        if(_self.criterion.scaleType == "relative"){
            for(var i=0; i < variantKeys.length; i++){

                var variant = variants[i];
                var value = variant[_self.criterion.name];

                if( ! $.isNumeric(value)){
                    $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                        height: 180,
                        onlyYes: true,
                        headerText: 'Opozorilo!',
                        contentText: "Dialoga ni možno odpreti. Variante za podan kriterij nimajo vnešenih samo številskih vrednosti.",
                        yesAction: function(){
                            // Fukcija proži brisanje kategorije.

                            $(event.target).closest('.categoryDiv').remove();

                            // var catName = $(event.target).closest('.categoryDiv').find('.categoryNameText span').html();
                            // _self._removeCategory(catName);
                        }
                    });

                    return false;
                }
            }
        }
        
        return true;
    }

    FVDialogValueFunctionPicewise.prototype.firstAndLastPointCheck = function(points){
        // Metoda nastavi prvi točki vrednost po x-u na min in zadnji točki po x-u na max.
        // Če trenutni mejni točki nista na min in max naredi novi mejni točki, ki ju nastavi na min in max.
        // Tako je zmeraj pokrit celoten interval.
        var _self = this;

        if(points.length == 0){
            return;
        }

        var len = points.length;
        var firstPoint = points[0];
        var lastPoint = points[len - 1];

        var change = false;
        if(firstPoint.x != _self.min){
            points.unshift({
                x: _self.min,
                y: firstPoint.y
            });
            change = true;
        }

        if(lastPoint.x != _self.max){
            points.push({
                x: _self.max,
                y: lastPoint.y
            });   
            change = true;
        }

        // Še reset myIndex vrednosti.
        if(change){
            points.forEach(function(el, indx){
                el.myIndex = indx;
            });
        }

        return points;
    }

    FVDialogValueFunctionPicewise.prototype.getStateOfWindow = function(){
        // Funkcija vrne stanje okna. (vse trenutne nastavitve za undo/redo).
        // Funkcija mora vrniti objekt po katerem (z takimi lastnostmi) lahko funkcija setDialogContent nastavi lastnosti okna
        // Stanje mora biti v obliki stringa.
        var _self = this;

        var objState = {
            name: _self.xAxisLabel,
            minValue: _self.min,
            maxValue: _self.max,
            valueFunction: {
                points: _self.getPointsFromGraph()
            }
        };

        var strState = JSON.stringify(objState);

        return strState;
    }

    FVDialogValueFunctionPicewise.prototype.setStateOfWindow = function(strState){
        // Funkcija nastavi stanje okna. (vse trenutne nastavitve za undo/redo)
        var _self = this;

        var objState = JSON.parse(strState);

        _self.resetDialogContent();

        _self.setDialogContent(objState);
    }

    FVDialogValueFunctionPicewise.prototype.saveChanges = function(points){
        var _self = this;

        var pointsToSave = _self.getPointsFromGraph();

        _self.criterion.valueFunction.points = pointsToSave;
    }

    FVDialogValueFunctionPicewise.prototype.getPointsFromGraph = function(){
        // Funkcija pridobi točke iz trenutnega grafa.
        var _self = this;

        var points = [];
        _self.chart.series[0].data.forEach(function(point, indx){
            points.push({
                x: parseFloat(point.x.toFixed(2)),
                y: parseFloat(point.y.toFixed(2)),
                myIndex: point.myIndex
            });
        });

        points = _self.firstAndLastPointCheck(points);

        return points;
    }


    //////////////////////////////////
    //////    DIALOG VAL. FUNC. LINEAR
    //////////////////////////////////

    function FVDidalogValueFunctionLinear(selector){

        var windowOptions = {
            width: 550,
            height: 550,
        };

        FVDialogWindow.call(this, selector, windowOptions);

        this.criterion = {};

        this.points = [];
        this.pointsObjects = [];
        this.xAxisLabel = "Kriterij";
        this.min = 0;
        this.max = 100;
        this.chart = {};
    }
    FVDidalogValueFunctionLinear.prototype = Object.create(FVDialogWindow.prototype);
    FVDidalogValueFunctionLinear.prototype.constructor = FVDidalogValueFunctionLinear;

    FVDidalogValueFunctionLinear.prototype.initDialogContent = function(){
        var _self = this;

        $('#btnCloseLinear').jqxButton({width:55});
        $('#btnCloseLinear').on('click', function(){

            _self.close();
        });
    }

    FVDidalogValueFunctionLinear.prototype.resetDialogContent = function(){
        var _self = this;

        this.xAxisLabel = "Criterion";
        this.min = 0;
        this.max = 100;

        _self.resetGraph();
    }

    FVDidalogValueFunctionLinear.prototype.setDialogContent = function(criterion){
        var _self = this;

        _self.xAxisLabel = this.criterion.name;
        _self.min = parseFloat(this.criterion.minValue);
        _self.max = parseFloat(this.criterion.maxValue);

        var pointsResult = _self.generateDefaultPoints();
        _self.points = pointsResult.points;
        _self.pointsObjects = pointsResult.pointsObjects;

        _self.drawGraph();
    }

    FVDidalogValueFunctionLinear.prototype.open = function(criterion){

        var _self = this;

        if(criterion.valueFunction.type != 'linear'){
            throw "Grafa za linear ni mogoče generirati za tip: " + this.criterion.valueFunction.type;
        }

        this.criterion = criterion;

        var isValid = _self.validateBeforeOpen();
        if(!isValid){
            return;
        }

        this.centralizeDialog();

        this.resetDialogContent();    

        if(criterion.scaleType == 'relative'){
                
            model.refreshMinMaxValueOfCriterion(criterion);
        }

        _self.setDialogContent(criterion);

        $(_self.selector).jqxWindow('open');
    }

    FVDidalogValueFunctionLinear.prototype.resetGraph = function(){
        var _self = this;

        // Pobriše vse črte na grafu.
        if(typeof(_self.chart.series) != 'undefined'){
            while(_self.chart.series.length > 0){
                _self.chart.series[0].remove(true);
            }
        }

        var pointsResult = _self.generateDefaultPoints();
        _self.points = pointsResult.points;
        _self.pointsObjects = pointsResult.pointsObjects;

        _self.drawGraph();
    }

    FVDidalogValueFunctionLinear.prototype.generateDefaultPoints = function(){
        var _self = this;

        // Pridobi variante in iz njih sestavi črto grafa.
        // Točke na črti so vrednosti obstoječih variant.

        var pointsObjects = [];

        var variants = model.getVariants();
        var variantsKeys = Object.keys(variants);
        variantsKeys.forEach(function(el, indx){
            
            var variant = variants[el];
            var val = variant[_self.criterion.name];

            // Pridobitev variant z isto vrednostsjo, ki so že dodane na točke grafa.
            var withSameVal = $.grep(pointsObjects, function(el, indx){
                return el.val == val;
            });

            // Če že obstajajo variante z enako vrdnostjo ime variante samo doda, v nasprotnem primeru ustvari novo točko.
            if(withSameVal.length == 0){

                pointsObjects.push({
                    variantNames: [ variant["Option"] ],
                    val: val
                });
            }
            else if(withSameVal.length == 1){
                withSameVal[0].variantNames.push(variant["Option"]);
            }
            else{
                throw "Ne more biti več kot en element z eno vrednostjo v seznamu točk!";
            }
        });
        
        // Pridobljene objekte - točke spremeni v točke za graf (z x in y kordinato).
        var points = [];
        pointsObjects.forEach(function(el, indx){

            var xVal = el.val;
            var yVal = model.linearInterpolation(el.val, _self.min, 0, _self.max, 100);

            var isInverse = $.parseJSON(_self.criterion.inverseScale);
            if(isInverse == true){
                yVal = 100 - yVal;
            }

            points.push({
                x: xVal,
                y: yVal
            });
        }); 

        points = _self.repairIntervalOfGraphForFixedCriterion(points);

        return {
            pointsObjects: pointsObjects,
            points: points
        }
    }

    FVDidalogValueFunctionLinear.prototype.repairIntervalOfGraphForFixedCriterion = function(points){
        // Črta mora obstajati od začetka do konca! Zato kadar gre za Fixed potegne črto do obeh koncev(kadar vrednosti variant ne pokrivajo celotnega intervala).

        var _self = this;

        points.sort(function(a, b){
            return b.val - a.val;
        });

        if(_self.criterion.scaleType == "fixed"){

            var minPoint = points[0];
            var maxPoint = points[points.length - 1];

            var yMin = 0;
            var yMax = 100;

            // V primeru inversa min in max točki obrne y vrednosti.
            var isInverse = $.parseJSON(_self.criterion.inverseScale);
            if(isInverse == true){
                yMin = 100;
                yMax = 0;
            }

            if(minPoint.x > _self.min){
                points.unshift({
                    x: _self.min,
                    y: yMin
                });
            }
            if(maxPoint.x < _self.max){
                points.push({
                    x: _self.max,
                    y: yMax
                });
            }
        }

        return points;
    }

    FVDidalogValueFunctionLinear.prototype.drawGraph = function(){
        var _self = this;
           
        // Točke je potrebno kopirati (sicer so referencirane in se tudi ob Close "shrani" trenutna pozicija.
        _self.chart = new Highcharts.Chart({
            chart: {
                renderTo: 'graphValFuncLinear',
                animation: false,
            },
            title: {
                text: ''
            },
            xAxis: {
                min: _self.min,
                max: _self.max,
                startOnTick: true,
                endOnTick: true,
                title:{
                    text: _self.xAxisLabel
                },
            },
            yAxis:{
                max: 100,
                min: 0,
                title:{
                    text:'Preferenčna vrednost'
                },
            },
            plotOptions: {
                column: {
                    stacking: 'normal'
                },
                line: {
                    cursor: 'ns-resize',
                    turboThreshold: 2000,
                },
                dataGrouping: false
            },
            tooltip: {
                enabled: true,
                useHTML:true,
                valueDecimals: 2,
                formatter: function(el, neki){
                    var _self2 = this;
                    // Metoda formatira tooltip, ki se prikaže nad piko v grafu.

                    var optionsList = "";
                    _self.pointsObjects.forEach(function(el){
                        if(el.val == _self2.x){
                            optionsList += "</br>&nbsp;&nbsp;" + el.variantNames.join("</br>&nbsp;&nbsp;");
                        }

                    });
                    return '<b>Preferenčna vrednost:</b> ' + _self2.y.myToFixed(2) +
                            '</br><b>Vrednost variante:</b> ' +   _self2.x.myToFixed(2) +
                            '</br> <b>Variante:</b> ' + optionsList;
                }
            },
            series: [{
                data: _self.points,
                draggableY: false,
                draggableX: false,
                showInLegend: false,
                dataGrouping: false
            }]
        });

        // Skrivanje Highcharts.com napisa v spodnjem desnem kotu grafa...
        $('text:contains("Highcharts.com")').remove();
    }

    FVDidalogValueFunctionLinear.prototype.validateBeforeOpen = function(){
        // Metoda preveri ali je model velaven za odprtje dialoga Linear.
        var _self = this;

        var variants = model.getVariants();
        var variantKeys = Object.keys(variants);

        if(variantKeys.length == 0){
            $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                height: 180,
                onlyYes: true,
                headerText: 'Opozorilo!',
                contentText: "Dialoga ni možno odpreti. Prvo je potrebno vnesti variante, da se pridobi min in max vrednost.",
                yesAction: function(){
                    // Fukcija proži brisanje kategorije.

                    $(event.target).closest('.categoryDiv').remove();

                    // var catName = $(event.target).closest('.categoryDiv').find('.categoryNameText span').html();
                    // _self._removeCategory(catName);
                }
            });

            return false;
        }

        for(var i=0; i < variantKeys.length; i++){

            var variant = variants[i];
            var value = variant[_self.criterion.name];

            if( ! $.isNumeric(value)){
                $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                    height: 180,
                    onlyYes: true,
                    headerText: 'Opozorilo!',
                    contentText: "Dialoga ni možno odpreti. Variante za podan kriterij nimajo vnešenih samo številskih vrednosti.",
                    yesAction: function(){
                        // Fukcija proži brisanje kategorije.

                        $(event.target).closest('.categoryDiv').remove();

                        // var catName = $(event.target).closest('.categoryDiv').find('.categoryNameText span').html();
                        // _self._removeCategory(catName);
                    }
                });

                return false;
            }
        }

        return true;
    }


    //////////////////////////////////
    //////    DIALOG VAL. FUNC. DISCRETE
    //////////////////////////////////

    function FVDialogValueFunctionDiscrete(selector){
        
        var windowOptions = {
            width: 480,
            height: 450,
        };

        FVDialogWindow.call(this, selector, windowOptions);

        this.criterion = {};

        this.URManager = new UMG(this.getStateOfWindow, this.setStateOfWindow, 100, false, this);
    }
    FVDialogValueFunctionDiscrete.prototype = Object.create(FVDialogWindow.prototype);
    FVDialogValueFunctionDiscrete.prototype.constructor = FVDialogValueFunctionDiscrete;

    FVDialogValueFunctionDiscrete.prototype.initDialogContent = function(){
        var _self = this;

        $('#cobCategoryName').jqxComboBox({
            height: 19,
            width: 300,
        });

        $('#btnAddAllExistingCategories').jqxButton({height: 16, width: 16});
        $('#btnAddAllExistingCategories').jqxTooltip({content: "Dodaj vse obstoječe kategorije (iz vrednosti variant)", animationShowDelay: 1000});
        $('#btnAddAllExistingCategories').on('click', function(event){

            _self._addAllCategoriesFromComboBox();

            _self.URManager.saveState();
        });

        $('#btnSortCategoryAsc').jqxButton({height: 16});
        $('#btnSortCategoryAsc').jqxTooltip({content: "Sortiraj po vrednosti naraščujoče", animationShowDelay: 1000});
        $('#btnSortCategoryAsc').on('click', function(event){
            // var fakeCriterion = _self.getSortedCategories();
            // _self.setSliders(fakeCriterion);

            _self.sortCategories();

            _self.URManager.saveState();
        });

        $('#btnSortCategoryDesc').jqxButton({height: 16});
        $('#btnSortCategoryDesc').jqxTooltip({content: "Sortiraj po vrednosti padajoče", animationShowDelay: 1000});
        $('#btnSortCategoryDesc').on('click', function(event){
            // var fakeCriterion = _self.sortCategories(-1);
            // _self.setSliders(fakeCriterion);

            _self.sortCategories(-1);

            _self.URManager.saveState();
        });

        $('#btnClearAllCategories').jqxButton({height: 16});
        $('#btnClearAllCategories').jqxTooltip({content: "Odstrani vse kategorije", animationShowDelay: 1000});
        $('#btnClearAllCategories').on('click', function(event){
            
            $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                contentText: "Ali res želite odstraniti vse kategorije?",
                yesAction: function(){
                    $('#categorySlidersPanel .categoryDiv').remove();

                    _self.URManager.saveState();
                }
            });

        });

        $('#btnPopUpMACBETH').jqxButton({height: 24});
        $('#btnPopUpMACBETH').on('click', function(event){

            _self.popupMACBETHDialog();

            try{
                $('#MACBETHgrid').MCGrid('refreshInconsistentCells');
            }
            catch(ex){
            }
        });

        $('#btnSaveDiscrete').jqxButton({width:55});
        $('#btnSaveDiscrete').on('click', function(){      
            _self._saveDataToCriterion();

            window.valueTree.URManager.setAsCurrentUMG();
            
            _self.close();
        });

        $('#btnCloseDiscrete').jqxButton({width:55});
        $('#btnCloseDiscrete').on('click', function(){

            window.valueTree.URManager.setAsCurrentUMG();

            _self.close();
        });
        
        $('#btnAddCategory').jqxButton({width: 125});
        $('#btnAddCategory').on('click', function(){                                             
            
            $('#formValFuncDiscrete').jqxValidator('validate');
        });

        $('#formValFuncDiscrete').jqxValidator({
            rules: [
                {input: '#cobCategoryName', message: 'Prosimo vnesite ime kategorije.', action: 'change', rule: function(event){
                    // Simulira required validator, ker combo box in <input> elemtn....

                    var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
                    return newCategoryName.trim() != "";
                }},
                {input: '#cobCategoryName', message: 'Kategorija z podanim imenom že obstaja.', action: 'keyup', rule: function(event){
                    // var newCategoryName = $('#tfCategoryName').val();
                    var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
                    var categories = $('.categoryNameText span');
                    var valid = true;
                    categories.each(function(){
                        if($(this).html() == newCategoryName){
                            valid = false;
                            return;
                        }
                    });
                    // var valid = categories.index('<td>' + newCategoryName + '</td>') == -1
                    return valid;
                }},
                {input: '#cobCategoryName', message: 'Vnešeno ime: "min" je rezervirano. Prosimo vnesite drugo ime.', action: 'change', rule: function(event){
                    // Simulira required validator, ker combo box in <input> elemtn....

                    var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
                    return newCategoryName.trim() != "min";
                }},
                {input: '#cobCategoryName', message: 'Vnešeno ime: "max" je rezervirano. Prosimo vnesite drugo ime.', action: 'change', rule: function(event){
                    // Simulira required validator, ker combo box in <input> elemtn....

                    var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
                    return newCategoryName.trim() != "max";
                }},
            ]
        });

        $('#formValFuncDiscrete').on('validationSuccess', function(event){

            var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
            $('#cobCategoryName').jqxComboBox('val', '');

            _self._addCategoryToPanel(newCategoryName, _self.criterion.valueFunction);
            _self._refreshComboBoxNames();

            _self.URManager.saveState();
        });
    }

    FVDialogValueFunctionDiscrete.prototype.setDialogContent = function(criterion){
        // Metoda nastavi kontrole glede na vrednosti, ki so trenutno nastavljene v modelu.
        var _self = this;

        _self.setSliders(criterion);

        _self._refreshComboBoxNames();

        _self._disableAllBoundedSliders();
    }

    FVDialogValueFunctionDiscrete.prototype.resetDialogContent = function(){
        var _self = this;

        _self.resetSliders();
    }

    FVDialogValueFunctionDiscrete.prototype.open = function(criterion){
        var _self = this;

        _self.criterion = criterion;

        // Pozor: open se MORA zgoditi pred refreshDialogom, sicer se sliderji ne posodabljajo in jih ne obarva.... 
        // (jqxSlider očitno deluje, da če je v trenutku nastavljanja invisible, da ne refresha prikaza)
        $(_self.selector).jqxWindow('open');

        _self.setDialogContent(criterion);

        _self.URManager.setAsCurrentUMG();
        _self.URManager.saveState();
    }

    FVDialogValueFunctionDiscrete.prototype.resetSliders = function(criterion){
        var _self = this;

        var sliders = $('.categorySliders');
        for(var i=0; i < sliders.length; i++){
            
            var slider = $(sliders[i]).jqxSlider('destroy');

        }

        $('#tableCategorySliders').html('');
        $('#tfCategoryName').val('');
    }

    FVDialogValueFunctionDiscrete.prototype.setSliders = function(criterion){
        var _self = this;

        // Resetiranje panela diskretne funkcije.
        _self.resetSliders(criterion);

        // 
        if(typeof(criterion.valueFunction.categories) == 'undefined')
        {
            criterion.valueFunction.categories = {}
        }
        
        var categoryKeys = Object.keys(criterion.valueFunction.categories);
        for(var i = 0; i < categoryKeys.length; i++){
            var categoryName = categoryKeys[i];
            var categoryValue = criterion.valueFunction.categories[categoryName];
            _self._addCategoryToPanel(categoryName, criterion.valueFunction);
        }

        var categorySliders = $('.categorySliders');

        // Vsakemu slider-ju nastavi vrednost kategorije.
        for(var i = 0; i < categorySliders.length; i++){
            var slider = categorySliders[i];
            var categoryName = categoryKeys[i];
            var categoryValue = criterion.valueFunction.categories[categoryName];

            $(slider).jqxSlider('setValue', categoryValue);
        }
    }

    FVDialogValueFunctionDiscrete.prototype._refreshComboBoxNames = function(){
        var _self = this;
        //Metoda osveži combo box za dodajanje kategorij.

        var addedCategories = Object.keys(_self.getCategoriesFromUi());
        var unaddedCategories = [];

        var values = model.getAllValuesOfCategory(_self.criterion.name);
        values.forEach(function(el){
            if(addedCategories.indexOf(el) == -1){
                unaddedCategories.push(el);
            }
        });

        $('#cobCategoryName').jqxComboBox('source', unaddedCategories);
    }
    
    FVDialogValueFunctionDiscrete.prototype.sortCategories = function(direction){

        if(typeof(direction) == 'undefined'){
            direction = 1;
        }

        var elements = $('#tableCategorySliders .categoryDiv').detach();



        var sorted = elements.toArray().sort(function(a, b){

            var valA = parseFloat($(a).find('.categoryValueText').text());
            var valB = parseFloat($(b).find('.categoryValueText').text());

            return (valA - valB) * direction;
        });

        for(var i in sorted){
            var element = $(sorted[i]);
            $('#tableCategorySliders').append(element);
        }
    }

    FVDialogValueFunctionDiscrete.prototype.getCategoriesFromUi = function(){
        // Metoda vrne kategorije, ki se nahjajo na GUI-ju.
        // Vrne objekt v obliki {imekateg1: vrednostKat1, ....}

        var categories = {};
        
        var sliders = $('.categorySliders');
        var valuesText = $('.categoryNameText span');
        
        for(var i=0; i < valuesText.length; i += 1){
            var categoryName = $(valuesText[i]).html();
            var slider = sliders[i];
            var categoryValue = parseFloat($(slider).jqxSlider('value'));
            categories[categoryName] = categoryValue;
        }

        return categories;
    }

    FVDialogValueFunctionDiscrete.prototype.getSortedCategories = function(sortOrder){
        var cats = [];
        var names = $('#tableCategorySliders .categoryDiv .categoryNameText span');
        var values = $('#tableCategorySliders .categoryDiv .categoryValueText');

        for(var i = 0; i < names.length; i++){
            var name = $(names[i]).html();
            var value = $(values[i]).html();
            cats.push([name, value]);
        }

        sortOrder = typeof(sortOrder) === 'undefined' ? 1 : sortOrder;
        cats.sort(function(a, b){
            var result = a[1] - b[1]
            return result * sortOrder;
        });

        var fakeCriterion = {valueFunction: {categories : {}}};
        for(var i = 0; i < cats.length; i++){
            var name = cats[i][0];
            var value = cats[i][1];
            fakeCriterion.valueFunction.categories[name] = value;
        }

        return fakeCriterion;
    }

    FVDialogValueFunctionDiscrete.prototype._addCategoryToPanel = function(newCategoryName, valueFunctionData){
        var _self = this;

        // Se znebi presledkov.
        var newSliderID = 'slider' + $('#tableCategorySliders .categoryDiv').length; // newCategoryName.split(" ").join("_");

        var newCategoryDiv = $('<div class="categoryDiv">' + 
                            '<div class="categoryDelete celle"><div class="categoryImageDiv"><img src="./images/imgRemoveSelected16.png"/></div></div>' +
                            '<div class="categoryName celle"><div class="categoryNameText"><span>' + newCategoryName + '</span></div></div>' + 
                            '<div class=" categorySliderDiv celle"><div id="' + newSliderID + '"class="categorySliders" categoryName="' + newCategoryName + '"></div></div>' + 
                            '<div class="categoryValueText celle">0</div>' + 
                            '</div>');

        $('#tableCategorySliders').append(newCategoryDiv);

        var newSliderSelector = '#' + newSliderID;

        $(newSliderSelector).jqxSlider({
            orientation: 'horizontal',
            width: 250,
            height: 25,
            min: 0,
            max: 100,
            showTicks: false,
            tickSize: 1,
            value: 0,
            step: 0.01,
        });

        $(newSliderSelector).on('change', function(event){
            // Ta event ob spremembi na desni strani sliderja izpiše njegovo vrednost.

            var insertedValue = $(event.currentTarget).jqxSlider('val');
            if(typeof(insertedValue) == 'undefined'){
                return;
            }

            var textDiv = $(event.target.parentNode.parentNode).find('.categoryValueText');

            // Ali je spremenjen programsko z itntervalom ali pa ga je spremenil uporabnik
            var val;
            if(insertedValue.hasOwnProperty("interval")){
                val = event.target.value;
            }else{
                val = parseFloat(insertedValue).toFixed(2);
            }

            textDiv.html(val);
        });

        $(newSliderSelector).on('change', function(event){
            // Ta event ob spremembi sliderja v primeru uporabe MACBETH-a poskrbi, da slider ne izstopi iz vrednosti intervala, ki mu je dodeljen.

            var catName = $(event.target).closest('.categoryDiv').find('.categoryName .categoryNameText span').html();

            if(!valueFunctionData.usingMACBETH || ! _self._categoryIsUsedInMacbeth(catName, valueFunctionData)){
                return;
            }

            var catInterval = valueFunctionData.MACBETHIntervals[catName];
            if($(event.target).val() > catInterval.interval.upperBound){
                $(this).jqxSlider('setValue', catInterval.interval.upperBound);
            }
            else if($(event.target).val() < catInterval.interval.lowerBound){
                $(this).jqxSlider('setValue', catInterval.interval.lowerBound);
            }
        });

        // Kadar kriterij uporablja MACBETH se ob spremembi spremenijo intervali.
        $(newSliderSelector).on('slideEnd', function (event) { 

            var movedCategoryName = $(event.target).attr('categoryName');

            _self._recalculateIntervals(movedCategoryName);

            _self.URManager.saveState();
        }); 
        // Event za spremembo intervalov je potreben tudi kadar se slider spreminja z pomočjo gumbov ob levi in desni.
        $(newCategoryDiv).find('.jqx-icon-arrow-right').on('click', function(e){

            var movedCategoryName = $(this).parents('.categoryDiv').find('.categoryName').text();

            _self._recalculateIntervals(movedCategoryName);
        });
        $(newCategoryDiv).find('.jqx-icon-arrow-right').mouseup(function(){
            _self.URManager.saveState();
        });
        $(newCategoryDiv).find('.jqx-icon-arrow-left').on('click', function(e){
            
            var movedCategoryName = $(this).parents('.categoryDiv').find('.categoryName').text();
            _self._recalculateIntervals(movedCategoryName);
        });

        // Poskrbi za prikaz tooltipa z intervalom kadar se uporablja macbeth.
        $(newCategoryDiv).hover(
            function(event){
                // Kadar z miško stopimo nad div kategorije prikaže tooltip.

                // Tooltip se prikaže samo ob uporabi MACBETHA.
                if(!valueFunctionData.usingMACBETH){
                    return;
                }

                var categoriesNames = Object.keys(valueFunctionData.MACBETHIntervals);

                var categoryDiv = $(event.currentTarget);
                var slider = categoryDiv.find('.categorySliders');
                var categoryName = slider.attr('categoryName');

                // Če kategorija še ne obstaja pomeni, da je bila ravno dodana (oz. je bila dodana in še ne uporabljena v  MACBETHU) in tudi v tem primeru se tooltip ne prikaže.
                if(categoriesNames.indexOf(categoryName) == -1){
                    return;
                }

                var interval = valueFunctionData.MACBETHIntervals[categoryName].interval;

                var leftOffset = categoryDiv.width() / 2;
                $('#macbethIntervalTooltip').tooltipMACBETHInterval('setValues', interval.lowerBound, interval.upperBound);
                $('#macbethIntervalTooltip').tooltipMACBETHInterval('showAt', categoryDiv.offset(), leftOffset);
            }, 
            function(event){ 
                // Kadar z miško stopimo izven div kategorije skrije tooltip.

                // To seveda naredi če kriterij uporablja macbeth in če je trenutno viden tooltip.
                if(!valueFunctionData.usingMACBETH || ! $('#macbethIntervalTooltip').tooltipMACBETHInterval('isVisible')){
                    return;
                }

                $('#macbethIntervalTooltip').tooltipMACBETHInterval('hide');
            }
        );
        
        // Če se uporablja MACBETH in je dodana nova kategorija jo obarva rdečkasto.
        if(valueFunctionData.usingMACBETH){
            var macbethCats = Object.keys(valueFunctionData.MACBETHDifferenceMatrix);
            if(macbethCats.indexOf(newCategoryName) == -1){
                $(newCategoryDiv).addClass('categorySliderDivUnusedInMacbeth');
            }
        }
        
        $('.categoryImageDiv img:last').on('click', function(event){
            
            $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                headerText: 'Opozorilo!',
                contentText: 'Ali res želite odstraniti kategorijo?',
                yesAction: function(){
                    // Fukcija proži brisanje kategorije.

                    $(event.target).closest('.categoryDiv').remove();
                }
            });
        });
    }

    FVDialogValueFunctionDiscrete.prototype._addAllCategoriesFromComboBox = function(){
        // Metoda doda vse kategorije iz kombo boxa (torej tiste ki obstajajo v variantah) na panel oz. v kriterij.
        var _self = this;

        var allUnaded = $('#cobCategoryName').jqxComboBox('source');

        allUnaded.forEach(function(el){
            _self._addCategoryToPanel(el, _self.criterion.valueFunction);
        });
    }

    FVDialogValueFunctionDiscrete.prototype._saveDataToCriterion = function(){
        var _self = this;

        var categories = _self.getCategoriesFromUi();
        _self.criterion.valueFunction.categories = categories;
    }

    FVDialogValueFunctionDiscrete.prototype._setValueOfSlidersOnValueOfIntervals = function(valueFunctionData){
        // Metoda nastavi vrednost sliderjem na vrednosti, ki se nahajajao v criterion.valueFunction.MACBETHIntervals.value...
        var _self = this;

        var sliders = $('.categorySliders');
        for(var i=0; i < sliders.length; i++){

            var slider = $(sliders[i]);
            var categoryName = slider.attr('categoryName');

            if(!_self._categoryIsUsedInMacbeth(categoryName, valueFunctionData)){
                continue;
            }

            var value = valueFunctionData.MACBETHIntervals[categoryName].value;

            var sliderSelector = '#' + slider.attr('id');
            $(sliderSelector).jqxSlider('setValue', value);
        }
    }

    FVDialogValueFunctionDiscrete.prototype._categoryIsAlreadyAddedToModel = function(categoryName){
        // Metoda vrne true, če je kategorije še dodana v model ali je dodana samo kot slider na panel.
        var _self = this;

        var catNames = Object.keys(_self.criterion.valueFunction.categories);

        return catNames.indexOf(categoryName) > -1;
    }

    FVDialogValueFunctionDiscrete.prototype._getTooltipIntervalForValue = function(value){
        var _self = this;

        var intervals = _self.criterion.valueFunction.MACBETHIntervals;

        var catKeys = Object.keys(intervals);
        var intervalOfValue;

        for(var i=0; i < catKeys.length; i++){

            var interval = intervals[catKeys[i]];

            if(interval.interval.upperBound >= value  && interval.interval.lowerBound <= value){
                intervalOfValue = interval.interval;
                break;
            }
        }

        return intervalOfValue.lowerBound + " - " + intervalOfValue.upperBound
    }

    FVDialogValueFunctionDiscrete.prototype._getMACBETHScaleFromSliders = function(){
        // Iz vrednosti, ki so trenuto v sliderju sestavi MACBETHscale, ki je primeren za ponovni izračun intervalov.
        // Vrnjeni scale ne sme vsebovati kategorij, ki so bile dodane na panel, niso pa bile uporabljene v MACBETHU!
        var _self = this;

        var scale = [];
        var sliders = $('.categorySliders');

        var macbethCategories = Object.keys(_self.criterion.valueFunction.MACBETHDifferenceMatrix);
        for(var i=0; i < sliders.length; i++){
            
            var slider = $(sliders[i]);

            var categoryName = slider.attr('categoryName');
            if(macbethCategories.indexOf(categoryName) == -1 ){
                continue;
            }

            scale.push({
                name: categoryName,
                value: slider.jqxSlider('val')
            });
        }
        
        return scale;
    }

    FVDialogValueFunctionDiscrete.prototype._recalculateIntervals = function(movedCategoryName){
        // Preračuna intervale, glede na trenutno nastavljene sliderje in jih nastavi.
        var _self = this;

        if(!_self.criterion.valueFunction.usingMACBETH){
            return;
        }

        var categoryName = $(event.currentTarget).attr('categoryName');
        var scale =_self._getMACBETHScaleFromSliders();
        var differenceMatrix = _self.criterion.valueFunction.MACBETHDifferenceMatrix;

        var intervals = MacbethIntervalCalculator.calculateIntervalsFor(scale, differenceMatrix, movedCategoryName);

        _self.criterion.valueFunction.MACBETHIntervals = intervals;
        _self._setValueOfSlidersOnValueOfIntervals(_self.criterion.valueFunction);

        _self._disableAllBoundedSliders();
    }

    FVDialogValueFunctionDiscrete.prototype._disableAllBoundedSliders = function(){
        // Metoda onemogoči vse sliderje, katerih interval ima enako vrednosti upper in lower bound-a.
        var _self = this;

        var sliders = $('.categorySliders');
        for(var i = 0; i < sliders.length; i++){
            var slider = $(sliders[i]);

            var catName = slider.attr('categoryName');

            slider.jqxSlider('enable');

            var interval = _self.criterion.valueFunction.MACBETHIntervals[catName];
            if(typeof(interval) === 'undefined'){
                continue;
            }

            if(interval.interval.upperBound == interval.interval.lowerBound){
                slider.jqxSlider('disable');
            }

        }
    }

    FVDialogValueFunctionDiscrete.prototype._categoryIsUsedInMacbeth = function(categoryName, valueFunctionData){
        // Metoda vrne boolean vrednost, ki pove ali je bila kategorija že uporabljena v MACBETHU.
        // Kategorija je bila uporabljena v MACBETHU če ima kriterij podatek o njenem intervalu.
        var _self = this;

        if(!valueFunctionData.usingMACBETH){
            return false;
        }

        var macbethCategories = Object.keys(valueFunctionData.MACBETHDifferenceMatrix);

        return macbethCategories.indexOf(categoryName) > -1;
    }

    FVDialogValueFunctionDiscrete.prototype.popupMACBETHDialog = function(){
        // Funkcija prikaže MACBETH dialog. Ob prikazu se shranijo tudi vse trenutno vnešena kategorije. (zaradi konsistentnosti z MACBETH podatki)
        var _self = this;

        if(typeof(_self.criterion) == 'undefined'){
            return;
        }

        _self._saveDataToCriterion();

        $('#dialogMACBETH').DialogMACBETHH({
            onClose: function(){
                _self._setValueOfSlidersOnValueOfIntervals(_self.criterion.valueFunction);

                // Vsem kategorijam, ki so bile neuporabljene v MACBETHU (in so bile obarvane rdeče) sedaj odstran barvo...
                $('.categorySliderDivUnusedInMacbeth').removeClass('categorySliderDivUnusedInMacbeth');

                _self._disableAllBoundedSliders();
            }
        });
        $('#dialogMACBETH').DialogMACBETHH('open', _self.criterion);
    }

    FVDialogValueFunctionDiscrete.prototype.getStateOfWindow = function(){
        // Funkcija vrne stanje okna. (vse trenutne nastavitve za undo/redo).
        // Funkcija mora vrniti objekt po katerem (z takimi lastnostmi) lahko funkcija setDialogContent nastavi lastnosti okna
        // Stanje mora biti v obliki stringa.
        var _self = this;

        // Glede macbetha, so vrednosti (intervalov) direktno povezane s spremembo sliderjev, zato hrani UMR vse valfunction macbeth podatke...
        var valFunctionSubobject = _self.criterion.valueFunction;        
        valFunctionSubobject.categories = _self.getCategoriesFromUi();

        var objState = {
            valueFunction: valFunctionSubobject
        };

        var strState = JSON.stringify(objState);

        return strState;
    }

    FVDialogValueFunctionDiscrete.prototype.setStateOfWindow = function(strState){
        // Funkcija nastavi stanje okna. (vse trenutne nastavitve za undo/redo)
        var _self = this;

        var objState = JSON.parse(strState);

        _self.resetDialogContent();

        _self.setDialogContent(objState);
    }


    //////////////////////////////////
    //////      DIALOG WEIGHTS
    //////////////////////////////////

    function FVDialogWeights(selector){

        var windowOptions = {
            width: 450,
            height: 500,
        };

        FVDialogWindow.call(this, selector, windowOptions);

        this.criterion = {};

        this.URManager = new UMG(this.getStateOfWindow, this.setStateOfWindow, 100, false, this);
    }
    FVDialogWeights.prototype = Object.create(FVDialogWindow.prototype);
    FVDialogWeights.prototype.constructor = FVDialogWeights;

    FVDialogWeights.prototype.initDialogContent = function(){
        var _self = this;

        $('#btnShowAllWeights').jqxButton({width:95});
        $('#btnShowAllWeights').on('click', function(){

            _self._saveAndUpdateInput();

            $('#dialogAllWeight').DialogAllWeights('open');
        });

        $('#btnSaveWeight').jqxButton({width:55});
        $('#btnSaveWeight').on('click', function(){

           _self._saveAndUpdateInput();

            window.valueTree.URManager.setAsCurrentUMG();
           _self.close();
        });

        $('#btnCloseWeight').jqxButton({width:55});
        $('#btnCloseWeight').on('click', function(){
            
            window.valueTree.URManager.setAsCurrentUMG();
            _self.close();
        });
    }

    FVDialogWeights.prototype.resetDialogContent = function(){
        

        $('#weightsPanelLayoutDiv').html('');
    }

    FVDialogWeights.prototype.setDialogContent = function(criterion){
        var _self = this;

        var criteria = _self.getAllCireteriaUnder(criterion);
        
        $('#weightsPanel').weightsPanel({
            panelSource: criteria,
            URManager: _self.URManager
        });

        $('#weightsPanel').weightsPanel('refresh');
    }
    
    FVDialogWeights.prototype.open = function(criterion){
        var _self = this;

        _self.criterion = criterion;

        _self.resetDialogContent();

        _self.setDialogContent(criterion);

        _self.URManager.setAsCurrentUMG();
        _self.URManager.saveState();

        $(_self.selector).jqxWindow('open');
    }

    FVDialogWeights.prototype.getAllCireteriaUnder = function(node){
        // Metoda pridobi vozlišča, ki jih v podanem vozlišču utežujemo. 

        var _self = this;

        if(typeof(node.children) == 'undefined'){

            $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                contentText: "Vozlišče ne vsebuje nobenega otroka!",
                onlyYes: true,
                yesAction: function(){}
            })

            throw 'Vozlišče ' + node.name + ' nima otrok!';
        }

        var panelSource = [];
        var criteriaForWieghting = node.children;
        criteriaForWieghting.forEach(function(el, indx){
            panelSource.push({
                weightedCriteria: el
            });
        });

        return panelSource;
    }
    
    FVDialogWeights.prototype._saveAndUpdateInput = function(){
        var _self = this;

        // Shrani podatke, ki jih je vnesel uporabnik.
        $('#weightsPanel').weightsPanel('save');

        // Preračuna normalizirane uteži.
        // Prvo preračuna na nivoju levela. (Na vozliščih, ki jim je uporabnik nastavljal uteži)
        // Potem pa končno utež za analizo na celotnem poddreveseu vozlišča.
        model.normalizeLevelWeightsOnNode(_self.criterion);
        model.normalizeFinalWeightRecursivelyOnChildrenOf(_self.criterion);
    }

    FVDialogWeights.prototype.getStateOfWindow = function(){
        var _self = this;

        var dataFromUi = $('#weightsPanel').weightsPanel('getDataFromUi');

        var children = [];
        for(var i in dataFromUi){
            var pnlSrc = dataFromUi[i];

            children.push(pnlSrc.weightedCriteria);
        }

        var objState = {
            name: _self.criterion.name,
            children: children
        }

        var strState = JSON.stringify(objState);
        
        return strState;
    }

    FVDialogWeights.prototype.setStateOfWindow = function(strState){
        var _self = this;

        var objState = JSON.parse(strState);

        _self.setDialogContent(objState);
    }



    // INICIALIZACIJA POPUP OKEN.

    function InitializeDialogs(){
        
        window.dialogCriteriaDetails = new FVDialogCriteriaDetails('#dialogCriteriaDetails');
                
        window.dialogNodeDetails = new FVDialogNodeDetails('#dialogNodeDetails');

        window.dialogValFuncPiecewise = new FVDialogValueFunctionPicewise('#dialogValFuncPiecewise');

        window.dialogValFuncLinear = new FVDidalogValueFunctionLinear('#dialogValFuncLinear');

        window.dialogValFuncDiscrete = new FVDialogValueFunctionDiscrete('#dialogValFuncDiscrete');

        window.dialogWeights = new FVDialogWeights('#dialogWeight');

    }

    InitializeDialogs();
});


//////////////////////////////////
//////    TOOLTIP ZA MACBETH INTERVAL
//////////////////////////////////

(function($){

    $.widget('myWidget.tooltipMACBETHInterval', {

        visible: false,

        _create: function(){
            var _self = this;

            _self.hide();
        },

        showAt: function(position, leftOffset, topOffset){
            // Metoda postavi tooltip na podano pozicijo, z podanima zamikoma.

            var _self = this;

            if(typeof(leftOffset) === 'undefined'){
                leftOffset = 0;
            }
            if(typeof(topOffset) === 'undefined'){
                topOffset = 0;
            }

            var left = position.left;
            left -= this.element.width() / 2;
            left += leftOffset;

            var top = position.top;
            top -= this.element.height();
            top += topOffset

            this.element.css('display', 'block');
            this.element.css('left', left);  
            this.element.css('top', top);  

            _self.visible = true;
        },

        hide: function(){
            var _self = this;

            _self.visible = false;

            this.element.css('display', 'none');
        },

        setValues: function(valueFrom, valueTo){

            $('#fromValue').text(valueFrom);
            $('#toValue').text(valueTo);

        },

        isVisible: function(){
            var _self = this;

            return _self.visible;
        }


    });
})(jQuery);


//////////////////////////////////
//////    DIALOG MACBETH
//////////////////////////////////

(function( $ ){

    $.widget("myWidget.DialogMACBETHH", {

        options: {
            width: 600,
            height: 480,
            categories: [],
            criterion: {},
            onClose: function(){}
        },

        macbethBasicScale: {},

        // Spremenljivka silentSliderChange se uporablja, ker se celica ne sme izpolniti kadar je slider 
        // spremenjen programsko.
        silentSliderChange: false,

        _create: function(){
            var _self = this;

            $("#dialogMACBETH").jqxWindow({
                height: this.options.height,
                width: this.options.width,
                resizable: false,
                isModal: true,
                autoOpen: false,
                draggable: true,
                position: 'center',
                animationType: 'none',
                showAnimationDuration:  1000,
                initContent: function(){

                    // Inicializacija gumba shrani oz OK.
                    $('#btnDialogMACBETHOK').jqxButton({width:55});
                    $('#btnDialogMACBETHOK').on('click', function(){

                        // Shranjevanje podatkov.
                        var macData = $('#MACBETHgrid').MCGrid('getMACBETHDataFromGrid');

                        // Preveri ali je vstavljen katerikoli podatek. (je različen od '-').
                        var hasDataInserted = _self.checkMacbethDataIfAny(macData);

                        if(hasDataInserted == false){
                            _self.close();
                            return;
                        }

                        var macOptions = $('#MACBETHgrid').MCGrid('getCriterionOptions');
                        _self.options.criterion.valueFunction.MACBETHData = macData;
                        _self.options.criterion.valueFunction.MACBETHOptions = macOptions;

                        var hasMacData = _self._existsMACBETHData(macData);
                        _self.options.criterion.valueFunction.usingMACBETH = hasMacData;

                        _self.options.criterion.valueFunction.MACBETHIntervals = {}

                        if(hasMacData){
                            // Pridobi izračunane vrednosti kategorij.
                            var result = $('#MACBETHgrid').MCGrid('calculateMacbethValuesFromCriteiron');

                            if(!result.validResult){
                                _self.options.criterion.valueFunction.usingMACBETH = false;
                                return;
                            }

                            var catValues = {};

                            var intervalResultKeys = Object.keys(result.intervalResults);
                            intervalResultKeys.forEach(function(el, indx){
                                catValues[el] = result.intervalResults[el].value;
                            });

                            _self.options.criterion.valueFunction.categories = catValues;

                            _self.options.criterion.valueFunction.MACBETHIntervals = result.intervalResults;
                            _self.options.criterion.valueFunction.MACBETHScale = result.MACBETHScale;
                            _self.options.criterion.valueFunction.MACBETHDifferenceMatrix = result.MACBETHDifferenceMatrix;
                        }

                        _self.close();
                    });

                    // Inicializacija gumba preklica.
                    $('#btnDialogMACBETHCancle').jqxButton({width:55});
                    $('#btnDialogMACBETHCancle').on('click', function(){

                        _self.close();
                    });

                    $('#btnDeleteMacbethData').jqxButton({
                        width:16, height: 16
                    });
                    $('#btnDeleteMacbethData').jqxTooltip({content: "Počisti vse podatke MACBETH.", animationShowDelay: 1000});
                    $('#btnDeleteMacbethData').on('click', function(){

                        $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                            contentText: "Vsi podatki MACBETH bojo izgubljeni. Želite nadaljevati?",
                            yesAction: function(){

                                model.resetMacbethDataToCriterion(_self.options.criterion);

                                $('#MACBETHgrid').MCGrid('resetInconsistentCells');

                                _self._refreshDialog();
                            }
                        });
                    });

                    $('#btnClearSelectedCell').jqxButton({
                        width: 150,
                    });
                    $('#btnClearSelectedCell').on('click', function(){
                        $('#MACBETHgrid').MCGrid('changeSelectedCellValue', '-');
                    });

                    // Inicializacija MCGrida.
                    $('#MACBETHgrid').MCGrid({
                        width:500, 
                        height:200
                    });

                    // Inicializacija sliderja za določanje razlike med vrednostmi.
                    $('#sliderMacRelation').jqxSlider({
                        orientation: 'horizontal',
                        height: 50, 
                        width: 450,
                        mode: 'fixed',
                        min: 0,
                        max: macbethDifferenceLabels.length - 1,
                        ticksFrequency: 1,
                        tooltip: false,
                        showTickLabels: true,
                        tickLabelFormatFunction: function(value){

                            // Naredi kopijo seznama, da ne spremeni originalnih oznak.
                            var labels = macbethDifferenceLabels.slice();
                            
                            return labels[value];
                        }
                    });
                    
                    // Obnašanje ob spremembi vrednosti slider-ja.
                    $('#sliderMacRelation').on('change', function(event){

                        if(_self.silentSliderChange){
                            return;
                        }
                     
                        var isSelected = $('#MACBETHgrid').MCGrid('isNowSelected', value);
                        if( !isSelected ){
                            return;
                        }

                        var valueIndex = event.args.value;
                        var value = macbethDifferenceLabels[valueIndex];
                        $('#MACBETHgrid').MCGrid('changeSelectedCellValue', value);
                    });

                    // Obnašanje, kadar prvič klikne na Extreme, ki je že izbran, da se vseeno izpolni celica.
                    $('#sliderMacRelation .jqx-slider-slider').on('click', function(event){
                        
                        var valueIndex = $('#sliderMacRelation').val();
                        var value = macbethDifferenceLabels[valueIndex];
                        $('#MACBETHgrid').MCGrid('changeSelectedCellValue', value);                      
                    });

                    $('#MACBETHgrid').MCGrid('getJqxGrid').on('cellselect', function(){

                        var selectedValue = $('#MACBETHgrid').MCGrid('getSelectedCellValue');

                        _self.silentSliderChange = true;

                        if(selectedValue == ''){
                            $('#sliderMacRelation').jqxSlider('val', 0);
                            _self.silentSliderChange = false;
                            return;
                        }

                        var indx = macbethDifferenceLabels.indexOf(selectedValue);
                        if(indx == -1){
                            $('#sliderMacRelation').jqxSlider('val', 0);
                            _self.silentSliderChange = false;
                            return;
                        }

                        $('#sliderMacRelation').jqxSlider('val', indx);

                        _self.silentSliderChange = false;
                     });

                    // Inicializacija Swap drop down menija. (za menjavo stolpcev)
                    $('#ddlSwapCategories').jqxMenu({ 
                        height: '150px', 
                        width: '110px',
                        autoOpenPopup: false, 
                        mode: 'popup',
                        popupZIndex: 1000000
                    });
                    // $('#ddlSwapCategories').jqxMenu('source', [{label: 'label1'}, {label: 'label2'}]);

                    // // Obnašanje ob kliku na kategorijo v swap ddl-ju.
                    $('#ddlSwapCategories').on('itemclick', function (event)
                    {
                        // Prva kategorija je kliknjeni stolpec, druga pa je izbrana iz swap ddl menija.
                        var firstCategory = $(event.args).html()
                        var secondCategory = $('#ddlSwapCategories').attr('currentClickedColumn');

                        $('#MACBETHgrid').MCGrid('swapColumns', firstCategory, secondCategory);
                    });
                }
            });
        },

        open: function(criterion){
            var _self = this;

            this.options.criterion = criterion;
            this._regenerateMACBETHData();
            
            var categories = criterion.valueFunction.MACBETHOptions;
            this.options.categories = categories;

            this._refreshDialog();

            $("#dialogMACBETH").jqxWindow('open');
        },

        close: function(){
            // Resetiranje gradnikov.
            var _self = this;

            _self.options.onClose();

            $('#MACBETHgrid').MCGrid('getJqxGrid').jqxGrid('clearselection');
            $('#sliderMacRelation').jqxSlider('setValue', 0);

            $('#dialogMACBETH').jqxWindow('close');
        },

        _refreshDialog: function(){

            this._silentSliderChange = false;

            var MCData = this.options.criterion.valueFunction.MACBETHData;
            var criterionOptions = this.options.categories;

            $('#MACBETHgrid').MCGrid({
                criterionOptions: criterionOptions,
                MCData: MCData,
            });

            $('#MACBETHgrid').MCGrid('initMCGrid');
        },

        _regenerateMACBETHData: function(){
            // MACBETH podatki se lahko razlikujejo, če je bila dodana/izbrisana kaka nova kategorija od zadnjega urejanja MACBETH podatkov.
            // Zato jih ponovno zgenerira, če je to potrebno.
            var _self = this;

            //Sprva ugotovi ali je prišlo do spremembe. (sprememba = true se zgodi tudi če macbeth podatkov ni).
            var critCat = Object.keys(_self.options.criterion.valueFunction.categories);
            // .slice() ker se spreminja seznam ob brisanju in bi se sicer brisanje izvajalno nepravilno.
            var macCat = _self.options.criterion.valueFunction.MACBETHOptions.slice();

            // Onravnavanje dodanih kategorij.
            for(var i = 0; i < critCat.length; i++){
                var critCatName = critCat[i];

                // Če je bila kategorija dodana jo doda med kategorije in ji da vrednost 0 ter je na koncu seznama...
                if(macCat.indexOf(critCatName) == -1){
                    _self.options.criterion.valueFunction.MACBETHOptions.push(critCatName);
                    _self.options.criterion.valueFunction.categories[critCatName] = 0;
                }
            }

            // Onravnavanje odstranjenih kategorij.
            // Pomoč z deleted names, zaradi spremembe indexov ob izbrisu elementov v seznamu....
            var deletedNames = [];
            for(var i = 0; i < macCat.length; i++){
                var macCatName = macCat[i];

                // Če je bila kategorija odstranjeno.
                if(critCat.indexOf(macCatName) == -1){
                    _self._deleteMacBethDataOfCriterion(macCatName);
                }
            }
        },

        _deleteMacBethDataOfCriterion: function(criterionName){

            var critIndex = this.options.criterion.valueFunction.MACBETHOptions.indexOf(criterionName);
            
            if(critIndex == -1){
                throw "Napaka: ne morem izbrisati kategorije, ki je kriterij nima.";
            }

            // Izbris iz CBETHOptions.
            this.options.criterion.valueFunction.MACBETHOptions.splice(critIndex, 1);

            var macData = this.options.criterion.valueFunction.MACBETHData
            delete macData[criterionName];

            var keys = Object.keys(macData);
            keys.forEach(function(key, indx){
                if(typeof(macData[key][criterionName]) != 'undefined'){
                    delete macData[key][criterionName];
                }
            });
        },

        _existsMACBETHData: function(macData){

            var result = false;

            var k1 = Object.keys(macData);
            k1.forEach(function(el, indx){
                var kat = macData[el];

                var k2 = Object.keys(kat);
                if(k2.length > 0){
                    result = true;
                    return;
                }

            })
            return result;
        },

        getCurrentCriterion: function(){
            var _self = this;

            return _self.options.criterion;
        },

        checkMacbethDataIfAny: function(macData){
            var _self = this;
            for(var rowName in macData){
                var row = macData[rowName];

                for(var colName in row){
                    var val = row[colName];

                    if(val != '-'){
                        return true;
                    }
                }
            }

            return false;
        }
    });
})(jQuery);


//////////////////////////////////
//////    MACHBET - GRID
//////////////////////////////////

(function( $ ) {

    $.widget('myWidget.MCGrid', {

        // Default vrednosti lastnosti, ki so lahko podane objektu MCGrid.
        options: {
            width: 500,
            height: 200,
            cellWidth: 75,
            criterionOptions: [],
        },

        _columns: [],
        _dataFields: [],
        // Grid data vsebuje ključe, ki so vsebovani v MCData in katerim pripada vrednost celice v kateri je ključ.
        _gridData: [],
        // MCData hrani povezane podatke. (lažja hramba zaradi premešavanja stolpcev in vrstic...).
        // Vzorec podatka v MCData: { 'imeVrste-imeStolpca': 'vrednost', ....}
        _MCData: {},

        // Kadar je grid nekonsistenten uporabi objekt _inconsistencyChanges za pomoč pri barvanju celic, ki jih je potrebno popravit.
        _inconsistencyChanges: {},

        // ID-grida. (uporabljen ob rebuildanju...)
        gridDivID: "",

        initMCGrid: function(){
            //"Public metoda" za inicializacijo grida (z podanimi kriteriji in MCDataModelom...).
            var _self = this;
            
            this._generateGridDataFields();
            this._generateColumns();

            this._generateMCData();
            this._generateGridDataFromMCData();

            this._buildGrid();

            // Odstrani obarvane celice, zaradi nekonsistentosti.
            $('.MCCellInconsistentUp').removeClass('MCCellInconsistentUp');
            $('.MCCellInconsistentDown').removeClass('MCCellInconsistentDown');
        },

        get_MCData: function(){

            return this._MCData;
        },

        changeSelectedCellValue: function(value){
            // Metoda v gridu nastavi izbrani celici podano vrednost. In spremeni MCData model.
            var _self = this;

            var selectedCell = $(this.gridDivID).jqxGrid('selectedCell');

            if(selectedCell == null){
                return;
            }

            var columnsInOrder = _self._columns;
            var columnDataField = selectedCell.datafield;

            var colIndx = columnsInOrder.findIndex(function(col){
                return col.datafield == columnDataField;
            });
            var rowIndx = selectedCell.rowindex;

            var macbethData = _self.getMACBETHDataFromGrid();

            var rowIndex = selectedCell.rowindex;
            var dataField = selectedCell.datafield;

            var isConsistent = _self._checkInconsistencies(rowIndex, colIndx-1, value);

            $(this.gridDivID).jqxGrid('setcellValue', rowIndex, dataField, value);
        },

        getSelectedCellValue: function(){
            // Metoda v gridu nastavi izbrani celici podano vrednost.

            var selectedCell = $(this.gridDivID).jqxGrid('selectedCell');
            
            return selectedCell.value;
        },

        isNowSelected: function(){
            var _self = this;

            var selectedCell = $(this.gridDivID).jqxGrid('getselectedcell');

            if(selectedCell == null){
                return false;
            }

            // Celica mora biti nad diagonalo.
            var rowIndex = selectedCell.rowindex;
            var colIndex = _self.options.criterionOptions.indexOf(selectedCell.column);

            if(colIndex == -1){
                return false;
            }

            return colIndex > rowIndex;
        },

        getJqxGrid: function(){

            return $(this.gridDivID).jqxGrid();
        },

        getMACBETHDataFromGrid: function(){
            // Metoda naredi MCData iz podatkov, ki so vstavljeni v Grid.
            var _self = this;

            var MCData = {};

            var rows = $(this.gridDivID).jqxGrid('getrows');

            // Za vsako vrstico naredi object ki pripada vrstici v MCData.
            rows.forEach(function(el, indx){
                
                var rowName = _self.options.criterionOptions[indx];

                var rowData = {};

                // V object vključi samo imena stolpcev. (tistih, ki imajo veljaven indeks).
                var keys = Object.keys(el);
                var columns = $.grep(keys, function(el1, indx1){
                    return _self.options.criterionOptions.indexOf(el1) > -1;
                });

                // Prepis vrednosti v rowData.
                columns.forEach(function(el2, indx2){
                    
                    if(el[el2] == ""){
                        // Ker pri barvanju celic uporablj nastavitev prazne vrednosti prvi celici .... jo mora tukaj spustiti, sicer vrne dodaten podatek...
                    }
                    else{
                        rowData[el2] = el[el2];   
                    }
                });

                // Zapis v MCData.
                MCData[rowName] = rowData;
            });

            return MCData;
        },

        getCriterionOptions: function(){
            // Metoda vrne criterionOptions. Pomembno je da so v zadnjem vrstem redu tako kot v gridu.

            return this.options.criterionOptions;
        },

        _create: function(){
            var _self = this;

            this.gridDivID = "#" + $(this.element).prop('id');
        },

        _buildGrid: function(){
            var _self = this;

            // Kreiranje dataAdapter-ja kot vira podatkov (sestavljen iz pridobljenih objektov).
            var source = {
                localdata: this._gridData,
                totalrecords: 100,
                datafields: this._dataFields
            };
            var dataAdapter = new $.jqx.dataAdapter(source);

            // Kreiranje grida.
            $(this.gridDivID).jqxGrid(
            {
                width: _self.options.width,
                height: _self.options.height,
                source: dataAdapter,
                editable: false,
                columnsresize: true,
                columnsreorder: true,
                selectionmode: 'singlecell',
                columns: _self._columns,
                scrollmode: 'logical'
            });

            // Obnašanje ob kliku na celico.
            $(this.gridDivID).on('cellclick', function (event) {

                $('#MCMinimalChange').html('');

                var colIndx = event.args.columnindex - 1;
                var rowIndx = event.args.rowindex;
                
                // Kadar se zgodi klik na "onemogočeno celico" se ne zgodi nič.
                if(colIndx <= rowIndx){
                    return;
                }

                // Nastavitev naslovnega texte (opt1 - opt3)
                var rowName = _self.options.criterionOptions[rowIndx];
                var colName = _self.options.criterionOptions[colIndx]
                $('#MCFirstOption').html(rowName);
                $('#MCSecondOption').html(colName);

                var inconsistencyChanges = $('#MACBETHgrid').MCGrid('getInco');
                var change = inconsistencyChanges[rowName + '-' + colName];
                if(change != null){
                    $('#MCMinimalChange').html('Sprememba na: ' + change.differenceValue);
                }
            });

            $(this.gridDivID).on('columnclick', function (event) {
                // Funkcija prikaže dropdown z izbiro kategorij s katero naj se zamenja kliknjeni stolpec.

                // Kadar je kliknjen prvi stolpec ne naredi nič.
                if(event.args.column.text == ""){
                    return;
                }

                // Naredi dropdown za menjavo vrstnega reda kategorij.
                var source = [];
                _self.options.criterionOptions.forEach(function(el){
                    source.push({
                        label: el
                    });
                });
                $('#ddlSwapCategories').jqxMenu('source', source);

                var scrollTop = $(window).scrollTop();
                var scrollLeft = $(window).scrollLeft();
                $('#ddlSwapCategories').jqxMenu('open', 
                    parseInt(event.args.originalEvent.clientX) + 5 + scrollLeft, 
                    parseInt(event.args.originalEvent.clientY) + 5 + scrollTop
                );

                // Shrani podatek o kliknjenem stolpcu. Uporabi ga pri menjavi stolpcev.
                $('#ddlSwapCategories').attr('currentClickedColumn', event.args.column.text);
            });
            
            // Obnašanje ob zamenjavi stolpca.
            $(this.gridDivID).on('columnreordered', function (event) {
                var column = event.args.columntext;
                var newindex = event.args.newindex
                var oldindex = event.args.oldindex;
                
                _self._swapRows(oldindex, newindex);
            });
        },

        _refreshGrid: function(){
            // Osvežitev grida ob spremebi (zamnejava stolpcev oz. vrstic).
            // Grid se destroja in ponovno naredi.
            var _self = this;

            // Začasna shranitev podatkov, za kasnejšo ponovno kreacijo grida.
            var options = this.options;
            var MCGridID = this.gridDivID;
            options.MCData = this._MCData;

            // Shranitev scroll pozicije, da se ob refreshu grid ne zamakne na začetek.
            var scrollPosition = $(this.gridDivID).jqxGrid('scrollposition');

            // Sprva pobriše celoten grid z vsebino. Potem ga zgradi na novo.
            $(this.gridDivID).jqxGrid('destroy');

            // Zaradi bug-a v trenutni verziji jqWidgets-a ostane kljub destroyu zelen div, 
            // ki se generira ob zamenjavi stolpcev. Zato ga tukaj posebaj pobriše.
            $("div[class='jqx-grid-group-drag-line']").remove();
            //Te se ne pojavijo, ker niso v ospredju... jih prekrivata pop up okni....

            $('.MCGridParentDiv').prepend('<div id="' + this.gridDivID.substring(1, this.gridDivID.length) + 
                '" class="MCGrid"></div>');

            $(MCGridID).MCGrid(options);
            $(MCGridID).MCGrid('initMCGrid');

            // Nastavitev scroll pozicije na prejšnjo.
            $('#MACBETHgrid').jqxGrid('scrolloffset', scrollPosition.top, scrollPosition.left);

            // Osvežitev nekonsistentnosti.
            _self.refreshInconsistentCells();
        },

        _generateColumns: function(){
            // Metoda generira stolpce grida.

            var _self = this;

            _self._columns = [];

            // Prvi stolpec, je pripet (se ne skrola) in ima prazen nasov. 
            // Prvi stolpec ima posebno render metodo, ki poskrbi, da se ob prikazu
            // v prvi stolpec ustrezno zapišejo imena.
            var firstColumnRenderer = function(row, column, value){
                return '<div class="MCFirsColumnCellDiv">' + _self.options.criterionOptions[row] + '</div>';
            }

            _self._columns[_self._columns.length] =  {
                pinned: true, 
                exportable: false, 
                text: "", 
                columntype: 'number', 
                cellsrenderer: firstColumnRenderer,
                width: this.options.cellWidth
            };

            var cellClassAppender = function(rowIndx, colName, value){
                // Fukcija vrne razred, ki obarva celico. Na sivo če je pod diagonalo. 
                // Obarva tudi "nekonsistentne" celice...

                var colIndx = _self.options.criterionOptions.indexOf(colName);

                if(colIndx == -1){
                    throw "Napaka: imena stolpcev in vrednosti v criterionOptions se ne ujemajo!";
                }

                // Razred dodeli samo tistim pod in v diagonali.
                if(colIndx <= rowIndx){
                    return 'MCUnderDiagonalCell'
                }

                // Barvanje nekonsistentnih celic...
                var rowName = _self.options.criterionOptions[rowIndx];

                // Prvi stolpec ni povezan z kategorijami in ima columnfield == null.
                if(rowName == null || colName == null){
                    return '';
                }

                var incoChanges = $('#MACBETHgrid').MCGrid('getInco');
                var consistencyChange = incoChanges[rowName + '-' + colName];
                // var consistencyChange = _self._inconsistencyChanges[rowName + '-' + colName];

                if(consistencyChange == null){
                    return '';
                }
                else if(consistencyChange.direction == 'up'){
                    return 'MCCellInconsistentUp';
                }
                else if(consistencyChange.direction == 'down'){
                    return 'MCCellInconsistentDown';
                }

                return '';
            }

            var cellRenderer = function(row, column, value){
                // poskrbi za pravilen prikaz vsebine v celici grida.
                // value, ki je podan je ključ s katerim dostopa do podatkov v MCData.
                
                var columnIndex = _self.options.criterionOptions.indexOf(column);

                return '<div class="MCCell">' + value + '</div>'
            }

            // Kreiranje stolpcev. Vsi stolpci imajo tip text.
            // Iztočasno kreira še datafield vrednosti (uporaba v datasourcu za povezavo med stolpci in podanimi podatki)
            for(var i=0; i < this.options.criterionOptions.length; i++){

                var optionName = this.options.criterionOptions[i];

                this._columns[this._columns.length] = { 
                    text: optionName, 
                    datafield: optionName,
                    width: this.options.cellWidth, 
                    align: 'center',
                    cellclassname: cellClassAppender,
                    cellsrenderer: cellRenderer
                };
            }
        },

        _generateGridDataFields: function(){
            // Metoda zgenerira dataFields object, ki je v gridu uporabljen za povezavo med stolpci in podatki,
            // pri bind-anju vira podatkov.

            this._dataFields = [];

            for(var i=0; i < this.options.criterionOptions.length; i++){

                var optionName = this.options.criterionOptions[i];

                this._dataFields[this._dataFields.length] = {
                    name: optionName
                };
            }
        },

        _generateMCData: function(){
            // Metoda napolni oz. nastavi _MCData, ki se uporabijo za kasnejše generiranje podatkov za sam jqxGrid.

            // Če so MCGridu že bili posredovani podatki potem jih ne generira!
            if(this.options.MCData){

                this._MCData = this.options.MCData;
                return;
            }

            // Sprva generira prazen objekt MCData, kjer je ključ "imevrstice-imestolpca"
            // vrednost pa vrednost razmerja med elementoma ključa
            this._MCData = {};

            for(var i=0; i < this.options.criterionOptions.length; i++){

                var alaVrstica = this.options.criterionOptions[i];

                var MCSubData = {};
                for(var j=0; j < this.options.criterionOptions.length; j++){

                    // Vrednosti pod in na diagonali ne obstajajo.
                    if(j <= i){
                        continue;
                    }

                    var alaStolpec = this.options.criterionOptions[j];

                    // MCSubData[alaStolpec] = (i + 1) + ' -- ' + (j + 1);
                    MCSubData[alaStolpec] = '-';

                }    

                this._MCData[alaVrstica] = MCSubData;
            }
        },

        _generateGridDataFromMCData: function(){
            // Za pravilno delovanje mora biti pred klicem te funkcije že izvedena generateMCData.
            // Metoda zgenerira podatke _gridData, ki se pošljejo render metodi celice.
            // _gridData vsebuje ključe, preko katere render metoda celice dobi vrednost iz _MCData objekta.

            this._gridData = [];
            for(var i=0; i < this.options.criterionOptions.length; i++){

                var row = {};
                var rowName = this.options.criterionOptions[i];

                for(var j=0; j < this.options.criterionOptions.length; j++){
                    
                    // Generira se samo podatke nad diagonalo. Če bi generiral tudi spodnje,
                    // bi ob shranjevanju oz. zapisu nazaj iz grida pridobil dvojne podatke,
                    // zaradi katerih bi prihajalo do nekonsistentnosti.
                    if(j <= i){
                        continue;
                    }

                    var colName = this.options.criterionOptions[j];
                    // var key = rowName + '-' + colName;
                    
                    var value = this._getMCDAtaFor(rowName, colName);

                    if(value == null){
                        row[colName] = '-';
                        continue;
                    }

                    row[colName] = value; 
                }

                this._gridData[this._gridData.length] = row;
            }
        },

        _swapRows: function(indexOne, indexTwo){
            // Metoda zamenja vrstici, katerih indeksa sta podana.
            // V resnici spremeni samo vrstni red v criterionOptions in ponovno zgradi celoten grid.

            // Pred zamenjavo mora shraniti trenutne podatke v celicah c MCData.
            this._MCData = this.getMACBETHDataFromGrid();

            // Indexa zmanjša za eno, saj se v seznamu začne z pozicijo 0.
            indexOne -= 1;
            indexTwo -= 1;

            // Zamneja vrednosti.
            var tempObject = this.options.criterionOptions[indexOne];
            this.options.criterionOptions[indexOne] = this.options.criterionOptions[indexTwo];
            this.options.criterionOptions[indexTwo] = tempObject;

            // Osveži grid (oz. ga zgenerira na novo)
            this._refreshGrid();
        },

        swapColumns: function(firstCategory, secondCategory){
            var _self = this;

            // Kadar bi zamenjali kategorijo samo s seboj ne narediti nič.
            if(firstCategory == secondCategory){
                return;
            }

            // Pred zamenjavo mora shraniti trenutne podatke v celicah MCData.
            this._MCData = this.getMACBETHDataFromGrid();
            
            var indexOne = _self.options.criterionOptions.indexOf(firstCategory);
            var indexTwo = _self.options.criterionOptions.indexOf(secondCategory);

            var tempObject = this.options.criterionOptions[indexOne];
            this.options.criterionOptions[indexOne] = this.options.criterionOptions[indexTwo];
            this.options.criterionOptions[indexTwo] = tempObject;

            // Osveži grid (oz. ga zgenerira na novo)
            this._refreshGrid();
        },

        _getMCDAtaFor: function(firstOption, secondOption){
            // Metoda vrne vsebino (podatek), ki je v celici, kjer se primerjata firstOption in secondOption.
            // Če podatka ni vrne null.

            if(typeof(this._MCData[firstOption]) != 'undefined' && typeof(this._MCData[firstOption][secondOption]) != 'undefined' && this._MCData[firstOption][secondOption] != ''){
                return this._MCData[firstOption][secondOption];
            }

            if(typeof(this._MCData[secondOption]) != 'undefined' && typeof(this._MCData[secondOption][firstOption]) != 'undefined' && this._MCData[secondOption][firstOption] != ''){
                return this._MCData[secondOption][firstOption];
            }

            return null;
        },

        calculateMacbethValuesFromCriteiron: function(){
            // Metoda izračuna in vrne vrednosti kategorij iz podatkov MACBETH, ki so v kriteriju.
            var _self = this;

            var criterion = $('#dialogMACBETH').DialogMACBETHH('getCurrentCriterion');
            var macData = model.getCriteria(criterion.name).valueFunction.MACBETHData;
            var macOptions = model.getCriteria(criterion.name).valueFunction.MACBETHOptions;

            var macbethResult = MacbethCalculator.calculateMacbeth(macData, macOptions);

            if(macbethResult.validResult == false){
                $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                    headerText: 'Opozorilo!',
                    contentText: 'Vnešeni podatki MACBETH so neveljavni!',
                    onlyYes: true
                });

                return {
                    validResult: false
                }
            }
            
            // Kadar je v panelu dodana kaka kategorije več, pride do tega, da ji ni bil dodeljen noben interval (redko ... če sta dve na novo dodani, in če niso vnešeni novi podatki v macbeth grid...)
            // Zato tukaj tistim kategorijam, ki niso dobile intervala doda interval od 0 do 0.
            // Zadeva se bo mogoče kasneje sama uredila, ko bom v macbeth implementiral še prazne vrednosti...
            macOptions.forEach(function(el, indx){
                if(!macbethResult.intervalResults.hasOwnProperty(el)){
                    macbethResult.intervalResults[el] = {
                        interval: {upperBound: 0, lowerBound: 0},
                        value: 0
                    };
                }
            });

            return macbethResult;
        },

        refreshInconsistentCells: function(){
            // Refresha nekonsistentne celice.
            var _self = this;
            
            var macData = _self.getMACBETHDataFromGrid();
            var criterion = $('#dialogMACBETH').DialogMACBETHH('getCurrentCriterion');
            var macOptions = model.getCriteria(criterion.name).valueFunction.MACBETHOptions;

            var consistencyResult = MacbethInconsistencyChecker.checkMacbethMatrix(macData, macOptions);

            // Nastavi popravke, ki se uporabijo za barvanje celic ...
            $(this.gridDivID).MCGrid('setInco', consistencyResult.feasibleChanges);

            //Barvanje celic proži z nastavitvijo prazne vrednosti prazni celici... (v 1. vrstici 1. stolpec je zmeraj prazen....)
            $(this.gridDivID).jqxGrid('setcellValue', 0, macOptions[0], '');
        },

        _checkInconsistencies: function(rowIndex, columnIndex, value){
            // Metoda prevei, ali je matrika konsistenta, če za podan par vrstica, stolpec vstavi vrednost value.
            // V primeru neveljavne ....

            var _self = this;

            var macData = _self.getMACBETHDataFromGrid();

            var criterion = $('#dialogMACBETH').DialogMACBETHH('getCurrentCriterion');
            var macOptions = model.getCriteria(criterion.name).valueFunction.MACBETHOptions;

            var rowCategoryName = macOptions[rowIndex];
            var columnCategoryName = macOptions[columnIndex];

            macData[rowCategoryName][columnCategoryName] = value;

            var consistencyResult = MacbethInconsistencyChecker.checkMacbethMatrix(macData, macOptions);

            // Nastavi popravke, ki se uporabijo za barvanje celic ...
            _self._inconsistencyChanges = consistencyResult.feasibleChanges;

            if(consistencyResult.isConsistent == true){
                return true;
            }

            return false;
        },

        resetInconsistentCells: function(){
            // Resetira nekonsistentne celice.
            var _self = this;

            _self._inconsistencyChanges = {};
        },

        getInco: function(){
            var _self = this;

            return _self._inconsistencyChanges;
        },

        setInco: function(feasibleChanges){
            var _self = this;

            _self._inconsistencyChanges = feasibleChanges;
        }
    });
})(jQuery);


//////////////////////////////////
//////    MACHBET - Izračuni
//////////////////////////////////

function MacbethCalculator(){

        var sumnikiMapReverse = {};
        var sumnikiMapSplx = {};

        MacbethCalculator.calculateMacbeth = function(macData, macOptions){
            // Metoda izračuna in vrne vrednosti kategorij iz podatkov MACBETH, ki so v kriteriju.

            var _self = this;

            // JSLP (linearni program) mora dobiti malo obrnjene omejitve (neenačbe). (zato metoda _constraintsMatrixToMatrixForSimplex)
            // - na desni so samo konstane.
            // - izraz mora biti poenostavljen.
            // - PAZI ne sme biti šumnikov (in presledkov, ...)!

            sumnikiMapReverse = {};
            sumnikiMapSplx = {};

            var bestCategory = macOptions[0];
            var worstCategory = macOptions[macOptions.length-1];

            var mappedMacbethMatrix = _mapDifferences(macData);
            var constraintsMatrix = _createConstraintMatrixFrom(mappedMacbethMatrix);

            // Preslikava imen zaradi šumnikov, imen z presledki in posebnmimi znaki.. (x * y)

            constraintsMatrix = _mapSumniki(macOptions, constraintsMatrix);
            bestCategory = sumnikiMapReverse[bestCategory];
            worstCategory = sumnikiMapReverse[worstCategory];

            var matrixForSimplex = _constraintsMatrixToMatrixForSimplex(constraintsMatrix, bestCategory, worstCategory);

            var basicScale;
            try{
                basicScale = _solveSimplex(matrixForSimplex);
            }
            catch(ex){
                if(ex == "Simplex ne najde rešitve za podan problem!"){
                    return {
                        validResult: false
                    }
                }
                else{
                    throw ex;
                }
            }
            
            // Preslikava nazaj v originalna imena
            basicScale = _mapSumnikiBack(basicScale);

            var macbethTransformedScale = _transformBasciScale(basicScale);
            
            // Pridobitev intervalov kategorij.
            var intervals = MacbethIntervalCalculator.calculateIntervalsFor(macbethTransformedScale, mappedMacbethMatrix);

            return {
                intervalResults: intervals,
                MACBETHScale: macbethTransformedScale,
                MACBETHDifferenceMatrix: mappedMacbethMatrix,
                validResult: true
            }
        }

        this._mapDifferences = function(macData){
            // Metoda mapira macbeth matriko razlik v matriko številčnih vrednosti, ki predstavljajo razliko (njeno moč).
            var _self = this;

            var mapDiff = { "-" : -99};

            for(var i = 0; i < macbethDifferenceLabels.length; i++){
                var diffName = macbethDifferenceLabels[i]; 
                mapDiff[diffName] = macbethDifferenceLabels.length - 1 - i;
            }

            var x = Object.keys(macData);

            var mapedMatrix = {};
            x.forEach(function(el, indx){

                mapedMatrix[el] = {};   
                var xd = macData[el];
                var xk = Object.keys(xd);

                xk.forEach(function(el1, indx1){
                    mapedMatrix[el][el1] = mapDiff[macData[el][el1]];
                });
            });

            return mapedMatrix;
        }

        this._createConstraintMatrixFrom = function(mapedMatrix){
            // Metoda naredi seznam omejitev za podano macbeth matriko. (z številčnimi vrednostmi namesto imeni)
            var _self = this;

            // Prvo sortira matriko po velikosti razlik. (za lažjo obdelavo spodaj).
            // Za sortiranje se matrika preoblikuje v seznam z elementi oblike: { x: ime kateg. v stolpcu, y:ime kat. v vrstici, val: vrednost razlike kategorije}
            var sortedMatrix = [];
            var x = Object.keys(mapedMatrix);
            x.forEach(function(xe, indx){

                var xd = mapedMatrix[xe];
                var xk = Object.keys(xd);
                xk.forEach(function(ye, indx1){

                    sortedMatrix.push({
                        x: xe,
                        y: ye,
                        val: mapedMatrix[xe][ye]
                    });
                });
            });
            sortedMatrix.sort(function(a, b){
                return b.val - a.val;
            });

            // Sedaj ima sortirano po razlikah.
            // Prvo naredi omejitve tipa 1: Če x-y > 0, potem dodamo omejitev: v(x) >= v(y) + 1
            // in omejitev tipa2: Če x-y = 0, potem  dodamo omejitev: v(x) = v(y)
            // Če je prazna celica (vrednost je -99) doda samo ordinalni pogoj (tip 1):  v(x) >= v(y) + 1 oziroma: v(x) - v(y) >= 1, ko se preslika za simplex
            var constraintsMatrix = [];
            sortedMatrix.forEach(function(el, indx){

                var str = ""
                
                if(el.val > 0){
                    str = el.x + " >= " + el.y + " + " + el.val;
                }
                else if(el.val == -99){
                    str = el.x + " >= " + el.y + " + 1";
                }
                else if(el.val == 0){
                    str = el.x + " = " + el.y;
                }
               
                constraintsMatrix.push(str);
            });

            // Potem naredi omejitve tipa 3: Za vse četvorke x,y,z,w, kjer velja x-y > z-w, dodamo omejitev: v(x)-v(y) >= v(z)-v(w) + (x-y)-(z-w).
            // Pogojev tipa 3 za prazne celice ni, zato preskoči (valu == -99)
            for(var i = 0; i < sortedMatrix.length; i++){

                var xy = sortedMatrix[i];
                
                if(xy.val == -99){
                    continue;
                }

                for(var j = i + 1; j < sortedMatrix.length; j++){

                    var zw = sortedMatrix[j];

                    if(zw.val == -99){
                        continue;
                    }

                    if(xy.val > zw.val){
                        var str = xy.x + ' - ' + xy.y + ' >= ' + zw.x + ' - ' + zw.y + ' + ' + xy.val + ' - ' + zw.val
                        constraintsMatrix.push(str);
                    }
                }
            }

            // Odstrani prazne pogoje
            constraintsMatrix = $.grep(constraintsMatrix, function(cond){
                return cond.trim().length > 0 
            });

            return constraintsMatrix;
        }

        this._constraintsMatrixToMatrixForSimplex = function(constraintsMatrix, bestCategory, worstCategory){
            // Metoda spremeni (preoblikuje) podno metriko omejitev.
            // Omejitve so primerne za uporabo SIMPLEX algoritma (v JSLPSolver-ju).
            var _self = this;

            var matrixForSimplex = [];

            var matrixForSimplex = ["min: " + bestCategory];
            constraintsMatrix.forEach(function(el, indx){

                var newLine = "";

                var splitedConstraint = el.split(">=");
                // Kadar gre za omejitve tipa 2 je v obliki: v(x) = v(y) kar tukaj spremeni v v(x) - v(y) = 0.
                if(splitedConstraint.length == 1){
                    var splEq = splitedConstraint[0].split("=");
                    newLine = splEq[0] + "-" + splEq[1] + " = 0";
                }
                else{

                    var left = splitedConstraint[0];
                    var right = splitedConstraint[1];

                    var rspl = right.split("+");

                    if($.isNumeric(rspl[1])){
                        // Kadar gre za omejitve tipa 1 samo spravi prvo spremenljivko na levo.
                        var toLeft = rspl[0];
                        var toRight = rspl[1];

                        newLine = left + "-" + toLeft + ">=" + toRight; 
                    }
                    else{
                        // Kadar gre za omejitve tipa 3 sprevi spremenljivke na drugo stran poenostavi izraz.

                        var toRight = eval(rspl[1]);
                        var toLeft = "-" + rspl[0].replace("-", "+");
                        toLeft = toLeft.substring(1, toLeft.length);

                        // console.log(left + "-" + toLeft)
                        var expression = algebra.parse(left + "-" + toLeft);
                        left = expression.toString();

                        newLine = left + " >= " + toRight;
                    }
                }
                
                matrixForSimplex.push(newLine);
            });

            matrixForSimplex.push(worstCategory + " = 0");

            return matrixForSimplex;
        }

        this._solveSimplex = function(simplexMatrix){
            var _self = this;

            var model = solver.ReformatLP(simplexMatrix);
            
            var result = solver.Solve(model, null, true);

            if(!result.feasible){
                throw "Simplex ne najde rešitve za podan problem!";
            }

            var values = [];
            result._tableau.variables.forEach(function(el, indx){
                values.push({
                    name: el.id,
                    value: el.value
                });
            });

            return values;
        }

        this._transformBasciScale = function(basicScale){
            var _self = this;

            var max = -1;
            basicScale.forEach(function(el){
                if(el.value > max){
                    max = el.value;
                }
            });

            var transformedScale = [];

            basicScale.forEach(function(el){

                transformedScale.push({
                    name: el.name,
                    value: model.linearInterpolation(el.value, 0, 0, max, 100)
                });
            });

            transformedScale.sort(function(a, b) {
                return parseFloat(b.value) - parseFloat(a.value);
            });

            return transformedScale;
        }

        this._mapSumniki = function(macOptions, constraintsMatrix){
            // Simplex solver ne more prejeti šumnikov, zato se mapira vrednosti.
            var _self = this;

            for(var i = 0; i < macOptions.length; i++){
                var option = macOptions[i];

                var codeName = "x" + i;

                sumnikiMapSplx[codeName] = option;
                sumnikiMapReverse[option] = codeName;

                // Preimenovanje v matrki za simplex
                for(var j = 0; j < constraintsMatrix.length; j++){

                    while(constraintsMatrix[j].indexOf(option) != -1){
                        constraintsMatrix[j] = constraintsMatrix[j].replace(option , codeName);
                    }
                }
            }

            return constraintsMatrix;
        }

        this._mapSumnikiBack = function(basicScale){
            var _self = this;

            for(var i=0; i < basicScale.length; i++){

                basicScale[i].name = sumnikiMapSplx[basicScale[i].name];
            }

            return basicScale;
        }
}

function MacbethIntervalCalculator(){

    MacbethIntervalCalculator.calculateIntervalsFor = function(basicScale, macbethMatrix, movedCategory){
        // Metoda izračuna intervale za vse kategorije podane v basicScale seznamu.
        // macbethMatrix je macbeth matrika, ki ima mapirane vrednosti vnešenih razlik iz imenskih v številske (weak = 1, ...)

        // Parameter: movedCategory predstavlja ime kategorij katere vrednost vzamemo pri stapljajnju scale-a. Torej kadar pride do 
        // kategorij ki nimajo razlike (NO oz. 0) je v basicScale potrebno od ene vzeti vrednost. Ponavadi so iste, kadar pa uporabnik spremeni slider, je potrebno vzeti
        // vrednost kategorij katere slider je spremnijal.

        var _self = this;

        var mappedReuslt = mapSumnikiInterval(basicScale, macbethMatrix);

        basicScale = mappedReuslt.basicScale;
        macbethMatrix = mappedReuslt.macbethMatrix;
        movedCategory = mapperSumnikiInterval[movedCategory];

        if(basicScale.length == 0){
            return;
        }

        basicScale.sort(function(a, b){
            return b.value - a.value;
        });

        // Pravilno obravnava kategorije, ki so bile ocenjnene z razloko NO oz. 0
        var noDifferenceCatogories = getCategoriesNoDifference(macbethMatrix);
        var unmergedCategoriesNames =Object.keys(basicScale);
        var mergedResult = mergeSameCategories(basicScale, macbethMatrix, noDifferenceCatogories, movedCategory);

        basicScale = mergedResult.scale;
        macbethMatrix = mergedResult.matrix;

        var intervals = {};
        var categories = Object.keys(basicScale);

        var bestCategoryName = basicScale[0].name;
        var worstCategoryName = basicScale[basicScale.length-1].name;

        // Vrednosti najboljše in najslabše kategorije so zmeraj 100 in 0.
        var categoryResults = {};
        categoryResults[bestCategoryName] = {
            interval: {upperBound: 100, lowerBound: 100},
            value: 100
        }
        categoryResults[worstCategoryName] = {
            interval: {upperBound: 0, lowerBound: 0},
            value: 0
        }

        // Za najboljšo in najslabšo kategorijo se intervali ne računajo.
        for(var i=1; i < basicScale.length - 1; i++){

            var categoryName = basicScale[i].name;
            var categoryInterval = calculateIntervalFor(categoryName, basicScale, macbethMatrix);
            
            // console.log("-")
            // console.log(categoryName + ": " + categoryInterval.lowerBound.interpolatedValue + " - " + categoryInterval.upperBound.interpolatedValue);

            // Odšteje/prišteje še 0.01 zato ker se intervali ne smejo prekrivati... (ne sme pa tega storiti kadar sta lower in upper enaka, ker ni smisla...)
            if(categoryInterval.lowerBound.interpolatedValue != categoryInterval.upperBound.interpolatedValue){
                categoryInterval.lowerBound.interpolatedValue += 0.01
                categoryInterval.upperBound.interpolatedValue -= 0.01   
            }
            categoryInterval.lowerBound.interpolatedValue = categoryInterval.lowerBound.interpolatedValue.myRound(2);
            categoryInterval.upperBound.interpolatedValue = categoryInterval.upperBound.interpolatedValue.myRound(2);

            // console.log(categoryName + ": " + categoryInterval.lowerBound.interpolatedValue + " - " + categoryInterval.upperBound.interpolatedValue);

            intervals[categoryName] = {
                upperBound: categoryInterval.upperBound.interpolatedValue,
                lowerBound: categoryInterval.lowerBound.interpolatedValue
            };

            var categoryValue = basicScale[i].value;

            // Vrednost ne sme biti manjša do lower bound-a in večja od upper bounda (zaradi tistih +/- 0.01 ....)
            if(categoryValue < categoryInterval.lowerBound.interpolatedValue){
                categoryValue = categoryInterval.lowerBound.interpolatedValue
            }
            if(categoryValue > categoryInterval.upperBound.interpolatedValue){
                categoryValue = categoryInterval.upperBound.interpolatedValue
            }

            categoryResults[categoryName] = { 

                value: categoryValue,
                interval: intervals[categoryName]
            };
        }

        categoryResults = unmergeSameCategories(categoryResults, mergedResult.mergedPairs, unmergedCategoriesNames.length);

        categoryResults = mapBackSumnikiInterval(categoryResults);

        return categoryResults;
    }

    this.getCategoriesNoDifference = function(macbethMatrix){

        var sameCategories = {};

        var cbGetCategoriesWithNoDifference = function(rowCatName, colCatName, difference, rowIndex, colIndex){

            if(difference == 0){

                if(typeof(sameCategories[rowCatName]) == 'undefined'){
                    sameCategories[rowCatName] = [];
                }
                // if(typeof(sameCategories[colCatName]) == 'undefined'){
                //     sameCategories[colCatName] = [];
                // }
                
                sameCategories[rowCatName].push(colCatName);
                // sameCategories[colCatName].push(rowCatName);
            }
        }

        foreachMcbethMatrix(macbethMatrix, cbGetCategoriesWithNoDifference);
		
        return sameCategories;
    }

    this.mergeSameCategories = function(scale, macbethMatrix, sameCategories, movedCategory){
        var _self = this;

        var margedMatrix = macbethMatrix;
        var mergedScale = scale;

        // V spremenljivko mergedPairs se shranjujejo, vsi stopljeni pari. Z pomočjo tega se na koncu nazaj razširi vrednosti na originalne kategorije.
        var mergedPairs = {};

        for(var firstSameCategory in sameCategories){
            
            var otherSameCategories = sameCategories[firstSameCategory];
            for(var i in otherSameCategories){
                var secondSameCategory = otherSameCategories[i];
				
                // Klic metode, ki stopi matriko.
                margedMatrix = mergeMatrixTwoSameCategories(mergedScale, margedMatrix, firstSameCategory, secondSameCategory, movedCategory);
               
			   // Klic metode, ki stopi skalo.
                mergedScale = mergeScaleTwoSameCategories(mergedScale, margedMatrix, firstSameCategory, secondSameCategory, movedCategory);
                // Naredi rekurzivni klic stapljanja na novih podatkih.
                var sameCategories = getCategoriesNoDifference(margedMatrix);
                var mergedResult = mergeSameCategories(mergedScale, margedMatrix, sameCategories, movedCategory);

                // Doda kateri dve kategoriji sta bili stopljeni v rezultat.
                var combinedName = firstSameCategory.trim() + secondSameCategory.trim();
                mergedResult.mergedPairs[combinedName] = [firstSameCategory, secondSameCategory];
                
                return mergedResult;
            }
        }

        // Vrne matriko kadar ni več enakih kategorij.
        return {
            matrix: margedMatrix,
            scale: mergedScale,
            mergedPairs: {}
        }
    }

    this.mergeScaleTwoSameCategories = function(scale, macbethMatrix, catOneName, catTwoName, movedCategory){
		
        var mergedScale = [];
        var combinedName = catOneName.trim() + catTwoName.trim();
		
        var mergeDone = false;

        // Pridobi vrednost obeh kategorij, ki se združujeta.
        var catOneValue, catTwoValue;
        scale.forEach(function(el, indx){
            if(el.name == catOneName){
                catOneValue = el.value;
            }
            else if(el.name == catTwoName){
                catTwoValue = el.value
            }
        });

        // Vrednost, ki jo zapiše na mesto, kjer se staplajta kategoriji.
        // Ta vrednost mora biti v primeru kadar imamo movedCategory enaka vrednosti kategorije, ki jo je uporabnik premaknil.
        // Kadar te kategorije ni pomeni, da sta vrednosti od catOneName in catTwoName enaki.
        var megreToValue = catOneValue;
        if(movedCategory == catTwoName){
            megreToValue = catTwoValue;
        }

        // Prepis vrednosti v novo stopljeno skalo.
        for(var i in scale){
            var cat = scale[i];
			
            if(!mergeDone){
                if(cat.name == catOneName || cat.name == catTwoName){
                    mergedScale.push({
                        name: combinedName,
                        value: megreToValue
                    });
                    mergeDone = true;
                }
            }
			
            if(cat.name != catOneName && cat.name != catTwoName){
                mergedScale.push(scale[i]);
            }
        }
        return mergedScale;
    }  

    this.mergeMatrixTwoSameCategories = function(scale, macbethMatrix, catOneName, catTwoName, movedCategory){
        // Metoda stopi dve kategorije.
        // Na mesto stopljene kategorij zapiše podatke prve kategorije. Podatke druge kategorije preskoči (morali bi biti isti kot pri prvi kategoriji).

        var combinedName = catOneName.trim() + catTwoName.trim();
        var combinedMatrix = {};

        var cb = function(rowCatName, colCatName, difference, rowIndex, colIndex){
			
            // Preskok podatkov druge kategorije.
            if(rowCatName == catTwoName || colCatName == catTwoName){
                return;
            }
			
            var rowName =  rowCatName != catOneName ? rowCatName : combinedName;
            var colName = colCatName != catOneName  ? colCatName : combinedName;

            if(typeof(combinedMatrix[rowName]) === 'undefined'){
                combinedMatrix[rowName] = {};
            }
			
            combinedMatrix[rowName][colName] = difference;
        }
		
        foreachMcbethMatrix(macbethMatrix, cb);
		
        // Na koncu doda še najmanj pomembno kategorijo, kjer se primerja sama s sabo in ni nikoli nobene razlike (zadnja celica v grid-u je zmeraj NO).
        var cats = Object.keys(macbethMatrix);
        combinedMatrix[cats[cats.length-1]] = {};

        return combinedMatrix;
    }

    this.unmergeSameCategories = function(categoryResults, mergedPairs, numOfCats){
        // Meotda pretvori izračunane intervale, kjer so stopljene kategorije brez razlike nazaj v kategorije, ki niso stopljene.
        // Metoda se kliče rekurzivno, saj je bila lahko stopljena kategorija sestavljena tudi iz "pod" stopljene kategorije.

        var mappedIntervals = [];
		
        for(var catName in categoryResults){
            var interval = categoryResults[catName];

            if(mergedPairs.hasOwnProperty(catName)){
				
                for(var j in mergedPairs[catName]){
                    var catOriginalName = mergedPairs[catName][j];
                    mappedIntervals[catOriginalName] = interval
                }
            }
            else{
                mappedIntervals[catName] = interval;
            }
        }

        // Nadaljuje postopek, dokler obstaja še kaka stopljena kategorije. (Dokler število kategorij ni enko št. kat. pred stapljanjem)
        if(Object.keys(mappedIntervals).length != numOfCats){
            mappedIntervals = unmergeSameCategories(mappedIntervals, mergedPairs, numOfCats);
        }
		
        return mappedIntervals;
    }

    this.foreachMcbethMatrix = function(macbethMatrix, callBackFunct){
        
        var rowCategoryNames = Object.keys(macbethMatrix);
        for(var i = 0; i < rowCategoryNames.length; i++){

            var rowCatName = rowCategoryNames[i];
            var rowCategory = macbethMatrix[rowCatName];

            var colCategoryNames = Object.keys(rowCategory);

            for(var j=0; j < colCategoryNames.length; j++){

                var colCatName = colCategoryNames[j];
                var difference = macbethMatrix[rowCatName][colCatName];
				
                var result = callBackFunct(rowCatName, colCatName, difference, i, j);
                
                if(result == false){
                    return;
                }
            }
        }
    }

    this.calculateIntervalFor = function(categoryName, basicScale, macbethMatrix){
        // Metoda izračuna zgornji in spodnji interval za podano kategorijo...
        var _self = this;

        // Pretvori basic scale iz seznama v objekt.
        var basicScaleObject = basicScaleArrayToObject(basicScale);

        // Pridobitev vseh intervalov v katerih je vključena kategorija za katero iščemo interval.
        // Pomembni so ti intervali, ker sprememba intervala vpliva na vse te intervale in ta sprememba ne sme kršiti pogojev (pogoj 1 in 2....).
        
        var categoryValue = basicScaleObject[categoryName];

        var expressions = getAllExpressionsFromConditionTwo(categoryName, basicScaleObject, macbethMatrix);
        var solutionCandidates = solveExpressions(expressions, categoryName, categoryValue);

        // Iskanje spodnje meje.
        var lowerBound = getSolutionLowerBoundOfInterval(solutionCandidates, categoryName, basicScale);
        // Iskanje zgornje meje.
        var upperBound = getSolutionUpperBoundOfInterval(solutionCandidates, categoryName, basicScale);

        var interval = {
            upperBound: upperBound,
            lowerBound: lowerBound
        }

        return interval;
    }

    this.getSolutionUpperBoundOfInterval = function(solutionCandidates, categoryName, basicScale){
        // Za rešitev zgornje meje intervala vzamemo najmanjšo rešitev, ki pa je večja(ali enaka) od vrednosti kategorije.
        // Potem še preveri pogoj ena.
        var _self = this;
        
        var basicScaleObject = basicScaleArrayToObject(basicScale);

        var categoryValue = basicScaleObject[categoryName];
        var bestValue = basicScale[0].value;

        var upperSolutions = solutionCandidates.filter(function(solution){
            return solution >= categoryValue;
        });

        if(upperSolutions.length == 0){
            return { 
                type:'upperBound', 
                basicScaleValue: categoryValue,
                interpolatedValue: model.linearInterpolation(categoryValue, 0, 0, bestValue, 100)
            }
        }

        var solutionUpperBound = upperSolutions[0]; 
        for(var i=0; i < upperSolutions.length; i++){
            var solution = upperSolutions[i];

            if(solution < solutionUpperBound){
                solutionUpperBound = solution;
            }
        }

        solutionUpperBound = checkBoundForConditionOne(categoryName, solutionUpperBound, basicScaleObject);
        var interpolated = model.linearInterpolation(solutionUpperBound, 0, 0, bestValue, 100);
        // console.log(categoryName + " " + solutionUpperBound + " -> " + interpolated);

        return {
            type:'upperBound', 
            basicScaleValue: solutionUpperBound,
            interpolatedValue: interpolated
        }
    }

    this.getSolutionLowerBoundOfInterval = function(solutionCandidates, categoryName, basicScale){
        // Za rešitev spodnje meje intervala vzamemo največjo rešitev, ki pa je manjša(ali enaka) od vrednosti kategorije.
        // Potem še preveri pogoj ena.
        var _self = this;

        var basicScaleObject = basicScaleArrayToObject(basicScale);
        var categoryValue = basicScaleObject[categoryName];
        var bestValue = basicScale[0].value;

        var lowerSolutions = solutionCandidates.filter(function(solution){
            return solution <= categoryValue;
        });

        if(lowerSolutions.length == 0){
            return { 
                type:'lowerBound', 
                basicScaleValue: categoryValue,
                interpolatedValue: model.linearInterpolation(categoryValue, 0, 0, bestValue, 100)
            }
        }

        var solutionLowerBound = lowerSolutions[0]; 
        for(var i=0; i < lowerSolutions.length; i++){
            var solution = lowerSolutions[i];

            if(solution > solutionLowerBound){
                solutionLowerBound = solution;
            }
        }

        solutionLowerBound = checkBoundForConditionOne(categoryName, solutionLowerBound, basicScaleObject);

        var interpolated = model.linearInterpolation(solutionLowerBound, 0, 0, bestValue, 100);
        // console.log(categoryName + " " + solutionLowerBound + " -> " + interpolated);

        return { 
            type:'lowerBound', 
            basicScaleValue: solutionLowerBound,
            interpolatedValue: interpolated
        }
    }

    this.exprStringFor = function(categoryName, categoryNameValFor, basicScale){

        if(categoryName == categoryNameValFor){
            return categoryName;
        }

        return parseFloat(basicScale[categoryNameValFor]).myRound(2);
    }

    this.getIntervalsWith = function(categoryName, basicScale){
        // Pridobi vse intervale v basicScale-u, ki so v povezavi s kategorijo. 
        // V nekaterih intervalih je categoryName zgoraj v nekaterih pa spodaj. 
        // basicScale mora biti sortiran po velikosti.

        var _self = this;

        var intervals = [];
        var categories = Object.keys(basicScale);
        var categoryIndex = categories.indexOf(categoryName);
        
        if(categoryIndex == -1){
            throw "V basicScale ni kategorije " + categoryName + "za katero se išče interval!";
        }

        // Intervali kjer je categoryName spodnja meja.
        for(var i = 0; i < categoryIndex; i++){
            var cat = categories[i];
            intervals.push({
                upperElement: cat,
                lowerElement: categoryName
            });
        }

        // Intervali kjer je categoryName zgornja meja.
        for(var i=categoryIndex+1; i < categories.length; i++){
            var cat = categories[i];
            intervals.push({
                upperElement: categoryName,
                lowerElement: cat
            });
        }

        return intervals;
    }

    this.getAllExpressionsFromConditionTwo = function(categoryName, basicScaleObject, macbethMatrix){
        // Metoda vrne vse izraze, ki so izpeljani iz pogoja 2.

        // Pogoj dva pravi:
        // V x,y,w,z € S with (x,y) € Ci and (w,z) € Cj:
        //   i > j => o(x) - o(y) > o(w) - o(z)
        // Torej: vsi kvadratki v matriki (w,z), ki imajo manjšo vrednost od kvadratka (x,y) -> razlika med vrednosjo razlik basicScale(x) - basicScale(y)
        // mora biti večja od razlike basicScale(w) - basicScale(z)

        // Vrednost -99 je dodeljena praznim celicam (neocenjenim oz. positive...) ... jih preskoči

        var _self = this;

        var categoryIntervals = getIntervalsWith(categoryName, basicScaleObject);

        var expressions = [];
        for(var i=0; i < categoryIntervals.length; i ++){

            var interval = categoryIntervals[i];
            
            // Ime kategorije ki je v paru v inervalu z kategorijo katere interval išče.
            var pairName = interval.upperElement;
            if(pairName == categoryName){
                pairName = interval.lowerElement;
            }

            try{
                // Razlika, ki jo je uporabnik dodelil med ti dve kategoriji (številska).
                var macbethDifference = macbethMatrix[interval.upperElement][interval.lowerElement];

                // Če je razlika enaka -99 je bila neocenjene oz. (positiv). V tem primeru postavi zgolj pogoj el1 = el2,
                // torej samo ordinalni pogoj: ne sme biti manjši od spodnjega in večji od zgornjega elementa.
                if(macbethDifference == -99){

                    var first = exprStringFor(categoryName, interval.upperElement, basicScaleObject);
                    var second = exprStringFor(categoryName, interval.lowerElement, basicScaleObject);

                    var exp1 = first + ' = ' + second;

                    expressions.push(exp1);
                    continue;
                }
            }
            catch(e){
                throw e;
            }

            // Pari, ki jim je uporabnik dodelil večjo vrednost kot trenutnemu paru (na intervalu).
            var uppers = getUpperPairs(macbethMatrix, macbethDifference);
            // Pari, ki jim je uporabnik dodelil manjšo vrednost kot trenutnemu paru (na intervalu).
            var lowers = getLowerPairs(macbethMatrix, macbethDifference);

            var el1 = exprStringFor(categoryName, interval.upperElement, basicScaleObject);
            var el2 = exprStringFor(categoryName, interval.lowerElement, basicScaleObject);
            //Pridobi izraze z pari, ki jim je uporabnik dodelil manjšo razliko.
            var expressionLeftPart = el1 + " - " + el2 + " = "
            for(var j = 0; j < lowers.length; j++){
                var lower = lowers[j];

                if(lower.value == -99){
                    continue;
                }

                // Če je kategorije za katero se izše interval se na njenih mestih ne pojavi številka ampak ime kot spremenljivka.
                var el3 = exprStringFor(categoryName, lower.name1, basicScaleObject);
                var el4 = exprStringFor(categoryName, lower.name2, basicScaleObject);

                var exp = expressionLeftPart + el3 + " - " + el4;

                expressions.push(exp);
            }

            //Pridobi izraze z pari, ki jim je uporabnik dodelil večjo razliko.
            var expressionRightPart = " = " + el1 + " - " + el2;
            for(var j = 0; j < uppers.length; j++){
                var upper = uppers[j];

                if(upper.value == -99){
                    continue;
                }
                
                // Če je kategorija za katero se izše interval se na njenih mestih ne pojavi številka ampak ime kot spremenljivka.
                var el3 = exprStringFor(categoryName, upper.name1, basicScaleObject);
                var el4 = exprStringFor(categoryName, upper.name2, basicScaleObject);

                var exp = el3 + " - " + el4 + expressionRightPart;

                expressions.push(exp);
            }

            // Doda še pogoje, ki narekujejo, da interval ne sme biti manjši od spodnjega elmenta na lestvici.  (oz. večji od zgornjega ...)
            var leftExp = exprStringFor(categoryName, interval.upperElement, basicScaleObject);
            var rightExp = exprStringFor(categoryName, interval.lowerElement, basicScaleObject);

            var exp3 = leftExp + ' = ' + rightExp;

            expressions.push(exp3);
        }

        return expressions;
    }

    this.checkBoundForConditionOne = function(categoryName, currentSolution, basicScaleObject){
        // Pridobljen rezultat je pridobljen iz pogoja 2 (Condition 2).
        // Ta rezultat ne sme kršiti pogoja 1! Tako da preveri še za ta pogoj in po potrebi nastavi novo vrednost.
        // Pogoj1: vse kategorije, ki jih je uporabnik ocenil kot manj vredne (z rzporeditvijo) morajo imeti na koncu tudi manjšo vrednost!
        // Ravno tako morajo vse višje kategorije imeti višjo vrednost.
        
        var _self = this;

        var categories = Object.keys(basicScaleObject);
        var catIndx = categories.indexOf(categoryName);
        if(catIndx == -1){
            throw "Napaka: za izračun intervala kategorije ni podanih kategorij!";
        }
        
        // Preveri tiste, ki so višje ocenjeni.
        for(var i=0; i < catIndx; i++){
            
            var higherCategoryName = categories[i];
            var higherValue = basicScaleObject[higherCategoryName];

            if(higherValue < currentSolution){
                currentSolution = higherValue;
            }
        }

        // Preveri tiste, ki so nižje ocenjeni.
        for(var i=catIndx+1; i < categories.length; i++){
            
            var lowerCategoryName = categories[i];
            var lowerValue = basicScaleObject[lowerCategoryName];

            if(lowerValue > currentSolution){
                currentSolution = lowerValue;
            }
        }

        return currentSolution;
    }

    this.getLowerPairs = function(mapped, value){

        var lowersResult = [];
        var k1 = Object.keys(mapped);

        for(var i = 0; i < k1.length; i++){

            var kat1Name = k1[i];
            var kat1 = mapped[kat1Name];

            var k2 = Object.keys(kat1);

            for(var j = 0; j < k2.length; j++){

                var kat2Name = k2[j];
                var diffValue = mapped[kat1Name][kat2Name];

                if(diffValue < value){

                    lowersResult.push({

                        name1: kat1Name,
                        name2: kat2Name,
                        value: diffValue
                    });
                }
            }
        } 

        return lowersResult;
    }

    this.getUpperPairs = function(mapped, value){

        var uppersResults = [];
        var k1 = Object.keys(mapped);
		
        for(var i = 0; i < k1.length; i++){

            var kat1Name = k1[i];
            var kat1 = mapped[kat1Name];
            var k2 = Object.keys(kat1);

            for(var j = 0; j < k2.length; j++){
                var kat2Name = k2[j];
                var diffValue = mapped[kat1Name][kat2Name];
				
                if(diffValue > value){
                    uppersResults.push({
                        name1: kat1Name,
                        name2: kat2Name,
                        value: diffValue
                    });
                }
            }
        } 

        return uppersResults;
    }

    this.basicScaleArrayToObject = function(basicScaleArray){

        var basicScale = {};

        basicScaleArray.forEach(function(el){
            basicScale[el.name] = el.value;
        });

        return basicScale;
    }

    this.solveExpressions = function(expressions, solvingKat, sovlingKatValue){

        var solutions = [];

        expressions.forEach(function(expression){
            try{
                var exprRes = algebra.parse(expression).solveFor(solvingKat);
                var res = exprRes.numer / exprRes.denom;

                solutions.push(res);
                //console.log(expression);
            }
            catch(ex){
                if(ex.message == "No Solution"){
                    // console.log(expression  + " !! NO SOLUTION");
                }
                else{
                    throw ex;
                }
            }
        });

        return solutions;
    }

    mapperSumnikiInterval = {}
    mapperReverseSumnikiInterval = {}

    this.mapSumnikiInterval = function(basicScale, macbethMatrix){
        var _self = this;

        // Mapiranje basic scalea.
        var newBasicScale = [];

        for(var i=0; i < basicScale.length; i++){

            var categoryName = basicScale[i].name;

            var newCodeName = 'x' + i;

            mapperSumnikiInterval[categoryName] = newCodeName;
            mapperReverseSumnikiInterval[newCodeName] = categoryName;

            newBasicScale.push({
                name: newCodeName,
                value: basicScale[i].value
            });
        }
		
        // Mapiranje macbeth matrike.
        var newMacbethMatrix = {};

        var macMatxCategoryNames = Object.keys(macbethMatrix);
        for(var i=0; i < macMatxCategoryNames.length; i++){

            var catOneName = macMatxCategoryNames[i];
            var macbethRow = macbethMatrix[catOneName];
            var codeNameCatOne = mapperSumnikiInterval[catOneName];

            newMacbethMatrix[codeNameCatOne] = {};

            var macRowCategoryNames = Object.keys(macbethRow);
            for(var j=0; j < macRowCategoryNames.length; j++){

                var catTwoName = macRowCategoryNames[j];
                var codeNameCatTwo = mapperSumnikiInterval[catTwoName];

                newMacbethMatrix[codeNameCatOne][codeNameCatTwo] = macbethMatrix[catOneName][catTwoName];
            }
        }
		
        return {
            basicScale: newBasicScale,
            macbethMatrix: newMacbethMatrix
        }
    }

    this.mapBackSumnikiInterval = function(resultIntervals){

        var mappedIntervals = {};

        var catNames = Object.keys(resultIntervals);
        catNames.forEach(function(el, indx){

           var originalName =  mapperReverseSumnikiInterval[el];
           mappedIntervals[originalName] = resultIntervals[el];
        });
        
        return mappedIntervals;
    }
}

function MacbethInconsistencyChecker(){

    MacbethInconsistencyChecker.checkMacbethMatrix = function(macData, macOptions){
        // Metoda preveri konsistentnost macbeth podatkov. V primeru nekonsistentnosti 
        // z poskušanjem išče možne spremembe, ki bi spremenile podatke v konsistentne.
        var macResult = MacbethCalculator.calculateMacbeth(macData, macOptions);

        if(macResult.validResult == true){
            return {
                feasibleChanges: {},
                isConsistent: true
            };
        }

        var feasibleChanges = {};

        for(var rowName in macData){
            var row = macData[rowName];

            for(var colName in row){
                var cellValue = row[colName];

                // if(cellValue == '-'){
                //     continue;
                // }

                // var indexOfCellValue = macbethDifferenceLabels.indexOf(cellValue);

                var indexOfCellValue;
                if(cellValue == '-'){
                    indexOfCellValue = macbethDifferenceLabels.length;
                }
                else{
                    indexOfCellValue = macbethDifferenceLabels.indexOf(cellValue);                    
                }

                // Sprva testira konsistentost z premikom razlike za ena potem dva, tri, ... (navzgor in navzdol)
                var stepSizeUp = 1;
                var indexOfTryValueUp = indexOfCellValue - stepSizeUp;
                var indexOfTryValueDown = indexOfCellValue + stepSizeUp;
                while(indexOfTryValueUp >= 0 || indexOfTryValueDown < macbethDifferenceLabels.length - 1){

                    // TESTIRANJE NAVZGOR
                    if(indexOfTryValueUp >= 0){
                        var tryResultUp = tryConsistency(macData, macOptions, rowName, colName, indexOfTryValueUp);

                        // Če je najedena konsistenta sprememba jo zapiše in trenutne celice več ne preiskuje.
                        if(tryResultUp != null){
                            tryResultUp.direction = "up";
                            feasibleChanges[rowName + '-' + colName] = tryResultUp;
                            break;
                        }
                        // Indexi za na gor se odštevajo, saj je v seznamu macbethDifferenceLabels najmočnejša razlika na prvem mestu...
                        indexOfTryValueUp -= 1;
                    }
                    
                    // TESTIRANJE NAVZDOL
                    if(indexOfTryValueDown < macbethDifferenceLabels.length - 1){

                        var tryResultDown = tryConsistency(macData, macOptions, rowName, colName, indexOfTryValueDown);

                        if(tryResultDown != null){
                            tryResultDown.direction = "down";
                            feasibleChanges[rowName + '-' + colName] = tryResultDown;
                            break;
                        }
                        // Indexi za navzdol se odštevajo, saj je v seznamu macbethDifferenceLabels najmočnejša razlika na prvem mestu...
                        indexOfTryValueDown += 1;
                    }
                }
            }
        }

        return {
            feasibleChanges: feasibleChanges,
            isConsistent: false
        };
    }

    this.tryConsistency = function(macData, macOptions, rowName, colName, indexOfTryValue){

        var tryValue = macbethDifferenceLabels[indexOfTryValue];

        var originalValue = macData[rowName][colName];
        macData[rowName][colName] = tryValue;

        var macResult = MacbethCalculator.calculateMacbeth(macData, macOptions);

        macData[rowName][colName] = originalValue;

        if(macResult.validResult){

            return {
                rowName: rowName,
                colName: colName,
                differenceIndex: indexOfTryValue,
                differenceValue: tryValue
            };
        }

        return null;
    }
}



//////////////////////////////////
//////    WEIGHTS PANEL
//////////////////////////////////

(function( $ ){

    $.widget('myWidget.weightsPanel', {

        options: {
            panelSource: [],
            URManager: {}
        },

        _create: function(){
            
            $('#weightsPanel').jqxPanel({
                width: 400,
                height: 360,
                sizeMode: 'fixed'
            });

            this.refresh();
        },

        refresh: function(){
            var _self = this;

            $('#weightsPanelLayoutDiv').html('');

            for(var i = 0; i < this.options.panelSource.length; i++){
                var obj = this.options.panelSource[i];

                if(typeof(obj.weightedCriteria.userWeight) == 'undefined'){
                    obj.weightedCriteria.userWeight = 0;
                }

                var pnlContent = "" + 
                    "<div class='weightsPanelContent'>" +
                        "<div class='weightPanelName'>" +
                            "<div class='weightedCriteriaText'>Kriterij:</div>" +
                            "<div class='weightedNodeText'>" + this._abbreviateForName(obj.weightedCriteria.name) + "</div>" +
                        "</div>" +
                        "<div class='weightPanelSwing'>" +
                        "</div>" +
                        "<div class='weightPanelWeighte'>" +
                            "<input class='weightPanelWeight' type='text' maxlength='100' value='" +  obj.weightedCriteria.userWeight  + "'/>" + 
                        "</div>" +
                        "<div class='weightPanelSliderHolder slider-demo-slider-container'>" +
                            "<div class='weightSlider' class='weightPanelSlider'></div>" +
                        "</div>" +
                    "</div>";

                    $('#weightsPanelLayoutDiv').append(pnlContent);
            }

            $('#weightsPanelLayoutDiv .weightPanelWeight').on('change', function(event){
                // Kadar uporabnik vpiše vrednost uteži ročno skozi textbox, je potrebno vpisano vrednost nastaviti pripadajočemu slider-ju.
                var insertedValue = event.target.value;
                var slider = $(event.target).parents('.weightsPanelContent').find('.weightSlider');
                var sliderValue = slider.jqxSlider('val');

                if( ! $.isNumeric(insertedValue) ){
                    $(event.target).val(sliderValue);
                    return;
                }
                
                insertedValue = parseInt(insertedValue);
                if(insertedValue > 100){
                    insertedValue = 100;
                }
                else if(insertedValue < 0){
                    insertedValue = 0;
                }

                slider.jqxSlider('setValue', insertedValue);
                $(event.target).val(insertedValue);

                _self.options.URManager.saveState();
            });

            // Nastavitev in pridobitev končne širine dodanih panelov za nastaljanje uteži.
            var widthOfweightsPanelContent = parseInt($(".weightsPanelContent").css("width"));
            $('#weightsPanelLayoutDiv').css('width', (i * widthOfweightsPanelContent) + (i * 4));
            var totalWidth = $('#weightsPanelLayoutDiv').width();

            var widthOfScrollPanel = $("#weightsPanel").width();
            $('#weightsPanelLayoutDiv').css('margin-left', '0');
            
            // Kadar je koncna sirina manjsa, jih z pomocjo margina postavi v center po horizontali. V nasprotnem primeru zmanjsa visino zaradi scrollbara.
            if ( totalWidth < widthOfScrollPanel ){
                var diff = widthOfScrollPanel - totalWidth;
                $('#weightsPanelLayoutDiv').css('margin-left', (diff / 2))
            }
            else{
                $('#weightsPanelLayoutDiv').css('height', 'calc(100% - 23px)')
            }

            $('.weightedCriteriaText').css('width', 'widthOfweightsPanelContent');
            $('.weightedNodeText').css('width', 'widthOfweightsPanelContent');

            var sliders = $('.weightSlider').jqxSlider({
                orientation: 'vertical',
                width: 25,
                height: 220,
                min: 0,
                max: 100,
                showTicks: false,
                tickSize: 1,
                value: 0
            });

            // Nastavitev sliderjev na vrednosti uteži kriterijev, ki se utežujejo.
            for(var i = 0; i < sliders.length; i++){
                var slider = sliders[i];
                var obj = this.options.panelSource[i];
                var value = obj.weightedCriteria.userWeight;

                $(slider).jqxSlider('value', value);
            }

            $('.weightSlider').on('change', function(event){
                var textDiv = $(event.target.parentNode.parentNode.getElementsByClassName("weightPanelWeight"));
                var val = parseInt(event.args.value)
                textDiv.val(val);
            });

            $('.weightSlider').on('slideEnd', function(e, ee, eee, eeee){
                _self.options.URManager.saveState();
            });
        },

        _abbreviateForName: function(str){
            if(str.length > 8)
            {
                str = $.trim(str.substring(0, 8)) + "."
            }
            return str;
        },

        save: function(){
            var sliders = $('.weightSlider');
            for(var i = 0; i < this.options.panelSource.length; i++){
                var obj = this.options.panelSource[i];
                var slider = $(sliders[i]);
                obj.weightedCriteria.userWeight = parseInt(slider.jqxSlider('value'));
            }
        },

        getDataFromUi: function(){

            var dataSourceFromUi = [];

            var sliders = $('#weightsPanel .weightSlider');

            for(var i = 0; i < sliders.length; i++){
                var slider = $(sliders[i]);

                var valueOfSlider = slider.jqxSlider('value');
                var nameOfWeightedCategory = slider.closest('.weightsPanelContent').find('.weightedNodeText').text();

                dataSourceFromUi.push({
                    weightedCriteria: {
                        name: nameOfWeightedCategory,
                        userWeight: parseInt(valueOfSlider)
                    }
                });
            }

            return dataSourceFromUi;
        },

        _weightChangeEvent: function(){
            var _self = this;

            _self.options.onWeightChange();
        }
    });
})(jQuery);


//////////////////////////////////
//////      DIALOG ALL WEIGHTS 
//////////////////////////////////

(function( $ ){

    $.widget("myWidget.DialogAllWeights", {

        options: {
            width: 600,
            height: 480,
        },

        criterion: {},

        _create: function(criterion){
            var _self = this;

            var dialogWeHeight = 380;
            var dialogWeWidth = 600;
            $("#dialogAllWeight").jqxWindow({
                height: dialogWeHeight,
                width: dialogWeWidth,
                resizable: true,
                isModal: true,
                autoOpen: false,
                draggable: true,
                position: 'center',
                initContent: function(){

                    $('#btnCloseAllWeights').jqxButton({width:55});
                    $('#btnCloseAllWeights').on('click', function(){
                         $('#dialogAllWeight').jqxWindow('close');
                    });

                    _self.refreshGrid();
                    
                },
            });
        },

        open: function(criterion){
            var _self = this;

            _self.criterion = criterion;

            _self._refreshDialog();

            $("#dialogAllWeight").jqxWindow('open');
        },

        close: function(){
            // Resetiranje gradnikov.
     
            $('#dialogAllWeight').jqxWindow('close');
        },

        refreshGrid: function(){
            var _self = this;

            var gridData = _self._generateAllWeightsGridData();

            $('#allWeightsGrid').jqxGrid({
                source: gridData.dataAdapter,
                width: 550,
                height: 250,
                autoheight: false,
                columns: gridData.columns,
                columnsresize: true,
                editable: false,
                pageable: false,
                pagermode: 'simple',
                pagesize: 10,
                enablemousewheel: false
            });
        },

        _refreshDialog: function(){
            var _self = this;

            _self.refreshGrid();
        },

        _generateAllWeightsGridData: function(){
            // Zgenerira podatke za grid popupa all weights...
            var _self = this;

            // GENERIRANJE STOLPCEV.
            var cellsCenterRenderer = function(row, columnfield, value, defaulthtml, columnproperties){
                return '<div style="text-align:center;">' + value + '</div>';
            }

            var columns = [];
            columns.push({
                width: 155,
                text: "Kriterij",
                datafield: "name"
            });
            columns.push({
                width: 90,
                text: "Končna utež",
                datafield: "finalNormalizedWeight",
                cellsrenderer: function(row, columnfield, value, defaulthtml, columnproperties){
                    return '<div style="text-align:center;">' + parseFloat(value).myRound(3) + '</div>';
                }
            });
            columns.push({
                width: 90,
                text: "Relativna utež",
                datafield: "levelNormalizedWeight",
                cellsrenderer: function(row, columnfield, value, defaulthtml, columnproperties){
                    return '<div style="text-align:center;">' + parseFloat(value).myRound(3) + '</div>';
                }
            });
            columns.push({
                width: 65,
                text: "Min",
                datafield: "minValue",
                cellsrenderer: cellsCenterRenderer
            });
            columns.push({
                width: 65,
                text: "Max",
                datafield: "maxValue",
                cellsrenderer: cellsCenterRenderer
            });
            columns.push({
                width: 85,
                text: "Tip skale",
                datafield: "scaleType",
                cellsrenderer: cellsCenterRenderer
            });

            // GENERIRANJE DATA ADAPTERJA.
            try{
                model.refreshMinMaxValueOFAllRelativeCriteria();
            }
            catch(ex){
                
                $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                    height: 180,
                    contentText: "Napaka pri vnešenih podatkih. Preverite pravilnost podatkov variant.",
                    onlyYes: true
                });                

            }
            
            var datFields = [ {name: 'name', type: 'string'}, {name:'finalNormalizedWeight', type:'string'}, {name:'levelNormalizedWeight', type:'string'},
            , {name:'minValue', type:'string'}, {name:'maxValue', type:'string'}, {name:'scaleType', type:'string'}];

            var allWeightsGridData = [];

            var allNodes = model.getNodesToList();
            allNodes.forEach(function(node){
                if(node.type == 'criterion'){

                    var minVal = node.minValue;
                    var maxVal = node.maxValue;

                    // Diskratnim kriterijem namesto vrednosti 0 in 100 do najboljšo in najslabšo vrednost.
                    if(node.scaleType == 'fixed' && typeof(node.valueFunction) != 'undefined' && node.valFuncType == 'discrete'){

                        var categories = node.valueFunction.categories;
                        if(typeof(categories) != 'undefined'){
                            
                            var min = 100;
                            var max = 0;

                            for (var catName in categories){
                                var value = parseFloat(categories[catName]);
                                
                                if(value > max){
                                    maxVal = catName;
                                    max = value;
                                }
                                if(value < min){
                                    minVal = catName;
                                    min = value;
                                }
                            }
                        }
                    }
                    // Linearno odsekovnim funkcijam določi prvo max  vrednost in prvo najmanjšo (prvo, če se kasneje ponovi...)
                    else if(typeof(node.valueFunction) != 'undefined' && node.valFuncType == 'piecewise' && typeof(node.valueFunction.points) != 'undefined'){

                        var minPiecewise = 1000;
                        var maxPiecewise = -100;
                        for(var indx in node.valueFunction.points){
                            var point = node.valueFunction.points[indx];
                            if(point.y > maxPiecewise){
                                maxPiecewise = point.y;
                                maxVal = point.x;
                            }
                            if(point.y < minPiecewise){
                                minPiecewise = point.y;
                                minVal = point.x;
                            }
                        }
                    }
                    // Linearnim obratnim funkcijam morar min in max obrniti.
                    else if(typeof(node.valueFunction) != 'undefined' && node.valFuncType == 'linear' && node.inverseScale == 'true'){
                        var tempMin = minVal;
                        minVal = maxVal;
                        maxVal = tempMin;
                    }

                    allWeightsGridData.push({
                        name: node.name,
                        finalNormalizedWeight: parseFloat(node.finalNormalizedWeight) * 100,
                        levelNormalizedWeight: parseFloat(node.levelNormalizedWeight) * 100,
                        minValue: minVal,
                        maxValue: maxVal,
                        scaleType: node.scaleType
                    });
                }
            });

            // var filteredNodes = $.grep(allNodes, function(node){ 
            //     return node.type == 'criterion'
            // });

            var source = {
                localdata: allWeightsGridData,
                datafields: datFields,
                datatype: 'array',
            };
        
            var dataAdapter = new $.jqx.dataAdapter(source);

            return {
                columns: columns,
                dataAdapter: dataAdapter
            };
        },
    });
})(jQuery);


//////////////////////////////////
//////    YES NO DIALOG
//////////////////////////////////

(function( $ ){

    $.widget("myWidget.messageYesNoDialog", {

        // Options so reseteirane na default vrednosti ob kreiranju in odpiranju.
        options:{},
        
        openOptions: {},

        dialogID: "",

        _create: function(){
            var _self = this;

            _self._resetOptions();

            _self.dialogID =  "#" + $(this.element).prop('id');

            var height = this.options.height;
            var width = this.options.width;
            this.element.jqxWindow({
                height: height,
                width: width,
                resizable: false,
                isModal: true,
                autoOpen: false,
                draggable: true,
                position: 'center',
                initContent: function(){
                    // Inicializacija kontrol dialoga.
                    $('#btnYesNoMessageYes').jqxButton({
                        width: 55,
                    });
                    $('#btnYesNoMessageNo').jqxButton({
                        width: 55,
                    });
                    
                    _self._refreshDialog();
                }
            });

            // Odprtje dialoga ob kreaciji.
            if(_self.options.autoOpen){
                _self.open();
            }
        },

        _resetOptions: function(){
            var _self = this;

            _self.options = {
                width: 450,
                height: 160,
                headerText: "Opozorilo!",
                contentText: "",
                onlyYes: false,
                yesButtonText: "V redu",
                noButtonText: "Prekliči",
                throwException: false,
                yesAction: function(){
                },
                noAction: function(){
                }
            }
        },

        openWith: function(openOptions){
            // Dialog odpre z podanimi lastnostmi kot options.
            var _self = this;

            // Ponastavi lastnosti okna. Potem jih zmerg-a skupaj z podanimi lastnostmi.
            _self._resetOptions();            
            $.extend(_self.options, openOptions);

            _self._refreshDialog();

            _self._moveToCenter();
            _self.element.jqxWindow('open');

            if(_self.options.throwException){
                throw "Popup dialog exceptin: " + _self.options.contentText;
            }
        },

        _refreshDialog: function(){
            var _self = this;

            $(this.element).find('.dialogYesNoHeader span').html(_self.options.headerText);
            $(this.element).find('.dialogYesNoBody span').html(_self.options.contentText);

            _self.element.jqxWindow('height', _self.options.height);
            _self.element.jqxWindow('width', _self.options.width);

            $('#btnYesNoMessageYes').val(_self.options.yesButtonText);
            $('#btnYesNoMessageYes').on('click', function(event){
                if(typeof(_self.options.yesAction) != 'undefined'){
                    _self.options.yesAction();
                }
                _self._resetOptions();
                _self.element.jqxWindow('close');
            });

            $('#btnYesNoMessageNo').val(_self.options.noButtonText);
            $('#btnYesNoMessageNo').on('click', function(event){
                _self.options.noAction();
                _self._resetOptions();
                _self.element.jqxWindow('close');
            });

            if(_self.options.onlyYes){
                $('#btnYesNoMessageNo').css('display', 'none');
            }
        },

        _moveToCenter: function(){
            var _self = this;

            $(_self.dialogID).jqxWindow({        
                position: {
                    x: ($(document).width() / 2) - (_self.options.width / 2),
                    y: (($(window).height()/2) - (_self.options.height / 2) + $(document).scrollTop())
                }
            });
        },

    });
})(jQuery);


//////////////////////////////////
//////    DIALOG SHRANJEVANJA MODELA
//////////////////////////////////

(function( $ ){

    $.widget("myWidget.DialogSaveModel", {

        dialogID: "",

        options:{
            width: 400,
            height: 190
        },

        _create: function(){
            var _self = this;

            _self.dialogID =  "#" + $(this.element).prop('id');

            var height = this.options.height;
            var width = this.options.width;
            this.element.jqxWindow({
                height: height,
                width: width,
                resizable: false,
                isModal: true,
                autoOpen: false,
                draggable: true,
                position: 'center',
                initContent: function(){
                    // Inicializacija kontrol dialoga.
                    $('#btnSaveModelYes').jqxButton({
                        width: 65,
                    });
                    $('#btnSaveModelNo').jqxButton({
                        width: 65,
                    });
                    $("#tfModelName").jqxInput({height: 19, width: 250});

                    $('#formSaveModel').jqxValidator({
                        rules: [
                            { input: '#tfModelName', message: 'Polje je obvezno!', action: 'keyup, blur', rule: 'required' }
                        ]
                    });

                    $('#formSaveModel').on('validationSuccess', function(event){
                        
                        model.saveModel($("#tfModelName").jqxInput('val'));
                        _self.element.jqxWindow('close');
                    });

                    $('#btnSaveModelYes').on('click', function(events){
                        $('#formSaveModel').jqxValidator('validate');
                    });
                    $('#btnSaveModelNo').on('click', function(events){
                        _self.element.jqxWindow('close');
                    });

                    _self._refreshDialog();
                }
            });

            // Odprtje dialoga ob kreaciji.
            if(_self.options.autoOpen){
                _self.open();
            }
        },

        open: function(){
            // Dialog odpre z podanimi lastnostmi kot options.
            var _self = this;

            _self._refreshDialog();

            _self._moveToCenter();

            _self.element.jqxWindow('open');
        },

        _refreshDialog: function(){
            $("#tfModelName").jqxInput('val', '');
        },

        _moveToCenter: function(){
            var _self = this;

            $(_self.dialogID).jqxWindow({        
                position: {
                    x: ($(document).width() / 2) - (_self.options.width / 2),
                    y: (($(window).height()/2) - (_self.options.height / 2) + $(document).scrollTop())
                }
            });
        },

    });
})(jQuery);


//////////////////////////////////
//////      ANALIZA
//////////////////////////////////

/*osvezi tab z analizami*/
function refreshAnalyses(){
	try{
		
     resetContainersToDefault();   
     $('#docking').jqxDocking({ orientation: 'vertical', mode: 'docked'});
     $('#docking').jqxDocking('hideAllCloseButtons');
     $('#docking').jqxDocking('showAllCollapseButtons');
     $('#docking').jqxDocking('collapseWindow', "window1");
     $('#docking').jqxDocking('collapseWindow', "window2");
     $('#docking').jqxDocking('collapseWindow', "window3");
     $('#docking').jqxDocking('collapseWindow', "window4");    
     $('#docking').jqxDocking('collapseWindow', "window5");
     //$('#docking').jqxDocking('collapseWindow', "window6");
     //$('#docking').jqxDocking('collapseWindow', "window7");
     //$('#docking').jqxDocking('collapseWindow', "window8");
		$('#docking').jqxDocking('collapseWindow', "window9");
		$('#docking').jqxDocking('collapseWindow', "window10");
     //refreshCheckedAttributes();
     normalizeData();
		normirajUtezi();
     normalizeDataWithWeights();
     normalizeDataWithNodes();	
	 //normalizeDataWithNodesWW();	
//	 normirajUtezi();
     initializeDataAndSettingsContainers();
     refreshSpiderChart();
     calculateAttributesForSpider();
     calculateAttributesForMap();
     calculateAttributesForSensitivity();
     refreshMap();     
     refreshContribution();
     refreshSensitivity();
     lessValuableVariants();
     //maximinVariants();
     //minimaxVariants();
     estimatedValueVariants();
	 increaseDecrease();
	 normalizedGrid();
	}catch(ex){
        console.log("NAPAKA - EXCEPTION")
		console.log(ex);
	}
}


function calculateAttributesForSpider(){
    // var keysVariants = Object.keys(window.variantsModel.variants[0]);
    
    var keysVariants = window.model.getCriteriaNamesToList();
    var container = '';

    for(var k = 0; k < keysVariants.length; k++){
        var ckey = keysVariants[k];
        var box = '<tr><td><input type="checkbox" name="spiderAttributeCheck" value="' + ckey +'" onclick="refreshSpiderChart();" checked="true">' + ckey + '</input></td></tr>';
        var box1 = '<input type="checkbox" name="spiderAttributeCheck" value="' + ckey +'" onclick="refreshSpiderChart();" checked="true">' + ckey + '</input>';
        /*if(k == 0){
            container = '<table>'+ box;
        }
        else if(k == keysVariants.length -1){
            container = container + box + '</table>';
        }else{
            container = container + box;
        }*/
        
        
        if(spiderFull == false){
            
            $("#spiderAttributes").append(box1);
        }
        
        
    } //console.log(container);
   // $("#spiderAttributes").append(conatiner);
    
    if(spiderFull == false){
        spiderFull = true;
       //$('#spiderAttributes').append(container);
    }

}

function calculateAttributesForMap(){
    var dropdownX = "<select id='mapDropX' onchange='refreshMap()'>";
    var dropdownY = "<select id='mapDropY' onchange='refreshMap()'>";
    var mapButtonUpdate = "<button id='mapUpdateButton' onclick='refreshMap()'>Update</button>";
    
    for(var i = 0; i < normalizedDataWithNodes.length; i++){
        if(i == 0){
            dropdownX = dropdownX.concat("<option value='" + i + "' selected='selected'>" + normalizedDataWithNodes[i].type + "</option>");
            dropdownY = dropdownY.concat("<option value='" + i + "' selected='selected'>" + normalizedDataWithNodes[i].type + "</option>");
        }else{
            dropdownX = dropdownX.concat("<option value='" + i + "'>" + normalizedDataWithNodes[i].type + "</option>");
            dropdownY = dropdownY.concat("<option value='" + i + "'>" + normalizedDataWithNodes[i].type + "</option>");
        }
    }
    
    dropdownX = dropdownX.concat("</select>");
    dropdownY = dropdownY.concat("</select>");
    
    console.log(dropdownX);
    console.log(dropdownY);
    
    if(mapFull == false){
        $("#mapAttributes").append(dropdownX);
        $("#mapAttributes").append(dropdownY);
    }
    //$("#mapAttribtues").append(/*"<button onclick='refreshMap();'>Update</button>"*/mapButtonUpdate);
}

function calculateAttributesForSensitivity(){
    var dropdownX = "<select id='sensDrop' onchange='refreshSensitivity()'>";
   
    var mapButtonUpdate = "<button id='mapUpdateButton' onclick='refreshSensitivity()'>Update</button>";
    
    for(var i = 0; i < normalizedData.length; i++){
        if(i == 0){
            dropdownX = dropdownX.concat("<option value='" + i + "' selected='selected'>" + normalizedData[i].type + "</option>");
           
        }else{
            dropdownX = dropdownX.concat("<option value='" + i + "'>" + normalizedData[i].type + "</option>");
        }
    }
	
	for(var i = 0; i < model.getNodesToList().length; i++){
		var node = model.getNodesToList()[i];
		if(node.type == "node"){
			dropdownX = dropdownX.concat("<option value='" + (normalizedData.length+i) + "'>" + node.name + "</option>");
		}
	}
    
    dropdownX = dropdownX.concat("</select>");
    
    console.log(dropdownX);
    
    if(sensitivityFull == false){
        $("#sensitivityAttributes").append(dropdownX);
    }
    //$("#mapAttribtues").append(/*"<button onclick='refreshMap();'>Update</button>"*/mapButtonUpdate);
}

function refreshCheckedAttributes(){
    var chkAttr = document.getElementsByName("spiderAttributeCheck");
    var checked = [];
    
    
    //if(chkAttr.length == 0) return null;
    
    for(var i = 0; i < chkAttr.length; i++){
        if(chkAttr[i].checked == true){ 
            checked.push(chkAttr[i].value);
        }
    }
    //console.log(checked);
    return checked;
}

function refreshSpiderChart(){
    spiderData = [];
    spiderSettings.seriesGroups[0].series = [];
    
    $("#spiderVariants").innerHTML ="";
    console.log("refreshSpiderChart called");
    
    rawVariants = window.model.getVariants();
    if(rawVariants == null || jQuery.isEmptyObject(rawVariants)){
            alert("Ni variant!"); 
            console.log("WARNING: ni variant.");
            return;
        };
    
    var keysVariants = window.model.getCriteriaNamesToList();
    var keysLegend = [];
    
    for(var k = 0; k < keysVariants.length; k++){
        var ckey = keysVariants[k];
        var cattribute = [];
        for(var i in Object.keys(rawVariants)){
            var cvariant = rawVariants[i];            
            cattribute.push(cvariant[ckey]);
        }        
        
        
        var min = 0;
        var max = Number(cattribute[0]);
                        
        for(var imax = 0; imax < cattribute.length; imax++){
            if(!isNaN(max) && Number(cattribute[imax]) > max) max = cattribute[imax];
        }
        
    
       var adata = {};
        
       adata.type = ckey;
        
       for(var d = 0; d < cattribute.length; d++){
                var dkey = "var"+d;
                //alert(cattribute[i]);
                var dvalue = ((cattribute[d]*100)/max);
                //console.log(dvalue); 
                if(isNaN(dvalue)) dvalue = 0;
                adata[dkey] = dvalue;
                
                if(k == 0){
                 seriesData = { opacity: 0.7, radius: 2, lineWidth: 2, symbolType: 'circle' };
                seriesData.dataField = dkey;
                seriesData.displayText = rawVariants[d].Option;
                spiderSettings.seriesGroups[0].series.push(seriesData);
                }
                
            }
        
        /*if(spiderFull){
                    var visibleAttribtues = refreshCheckedAttributes();
                    if(visibleAttribtues.indexOf(adata.type) != -1) spiderData.push(adata);
        }else{
            //spiderData.push(adata);
        }*/
        
        //normalizedData.push(adata);
    }
    
    
    
    normalizeData();
    for(var x = 0; x < normalizedData.length; x++){
        if(spiderFull){
            var visibleAttribtues = refreshCheckedAttributes();
            if(visibleAttribtues.indexOf(normalizedData[x].type) != -1) spiderData.push(normalizedData[x]);
        }else{
            spiderData.push(normalizedData[x]);
        }
        
    }
    
    
	if(spiderFull){
        console.log("spiderFull TRUE");
                
                
                //var dataAdapter = new $.jqx.dataAdapter(spiderData, { autoBind: true });
            //$('#jqxChart').jqxChart({ _renderData: new Array() });
            //$('#jqxChart').jqxChart({ source: dataAdapter });
                
                
        $('#spiderVariants').jqxChart({ _renderData: new Array() });
        $('#spiderVariants').jqxChart({ source: spiderData });
        //$('#spiderVariants').jqxChart(spiderSettings);
        $('#spiderVariants').jqxChart('refresh');
                
                
    }else{
        console.log("spiderFull FALSE");
        spiderSettings.source = spiderData;
        $("#spiderVariants").jqxChart(spiderSettings);
       
    }
            //$('#mapVariants').jqxChart('showToolTips', false);
}


function refreshMap(){
    //NASTAVITEV PODATKOV ZA MAP
    mapData = [];
    mapSettings.seriesGroups[0].series = [];
    mapSettings.seriesGroups[1].series = [];
    var yPrefix = "norm_var";
    var xPrefix = "norm_var";


    var dropX = document.getElementById("mapDropX");
    var xIndex = dropX.options[dropX.selectedIndex].value;
    
    var dropY = document.getElementById("mapDropY");
    var yIndex = dropY.options[dropY.selectedIndex].value;


    var mapXAttr = normalizedDataWithNodes[xIndex];
    var mapYAttr = normalizedDataWithNodes[yIndex];
    
	var xName = dropX.options[dropX.selectedIndex].innerText;
	var yName = dropY.options[dropY.selectedIndex].innerText;

	//var mapXAttr = window.model.getNode(xName);
	//var mapYAttr = window.model.getNode(yName);

	var criteriaNames = window.model.getCriteriaNamesToList();
	
	if(criteriaNames.indexOf(xName) != -1){
	    xPrefix = "var";
		mapXAttr = normalizedData[xIndex];
	}
	
	if(criteriaNames.indexOf(yName) != -1){
	    yPrefix = "var";
		mapYAttr = normalizedData[yIndex];
	}	
	
    console.log("refreshMap: " + mapXAttr.type);
    console.log("refreshMap: " + mapYAttr.type);
    
    
    mapSettings.xAxis.title.text = mapXAttr.type;
    mapSettings.valueAxis.title.text = mapYAttr.type;
    //mapSettings.description = ((mapXAttr.type).concat(" VS ")).concat(mapYAttr.type);
    
    var yMax = 0;
    var xMax = 0;
    var yMaxInd = "";
    var xMaxInd = "";
    //var yMaxInd = 0;
    
    for(var m = 0; m < Object.keys(mapYAttr).length -1; m++){
        /*var indX =  xPrefix + m;//"var"+m;
        var indY =  yPrefix + m;//"var"+m;*/
        var ind = "var" + m;
        /*if(mapYAttr[ind] > yMax){
            yMax = mapYAttr[ind];
            //yMaxInd = m;
        }*/
        
        if(mapYAttr[ind] > yMax){
            yMax = mapYAttr[ind];
            yMaxInd = ind;
        }
        
        if(mapXAttr[ind] > xMax){
            xMax = mapXAttr[ind];
            xMaxInd = ind;
        }
        
    }
    
    var xMaxX = mapXAttr[xMaxInd];
    var xMaxY = mapYAttr[xMaxInd];
    var yMaxX = mapXAttr[yMaxInd];
    var yMaxY = mapYAttr[yMaxInd];
    
    var maptempx = {};
    maptempx.varx = undefined;
    maptempx.BackFill = yMax;//100;
    maptempx.Atr1 = 0;
    mapData.push(maptempx);
    
    
    for(var a = 0; a < Object.keys(mapXAttr).length -1; a++){
        var mapser = { symbolSize: 20, symbolType: 'circle'};
        var mapser2 = {fillColor: "#72C468"};
        var maptemp = {};
        var index = "var" + a;
        maptemp.Atr1 = mapXAttr[index];
        maptemp[index] = mapYAttr[index];
        
        
       /* if((mapXAttr[index] >= yMaxX && mapYAttr[index] >= xMaxY
           &&  mapXAttr[index] <= xMaxX && mapYAttr[index] <= yMaxY)
           || index == yMaxInd || index == xMaxInd){
            //mapXAttr[index] != yMax && mapYAttr[index] != yMax && a < yMaxInd
            
           if(isInTriangle(mapXAttr[index], mapYAttr[index], xMaxX, xMaxY, yMaxX, yMaxY, 100, 100)
                ){
               
               console.log(index + "[" + maptemp.Atr1 + "," + maptemp[index] + "] in triangle:  " + isInTriangle(mapXAttr[index], mapYAttr[index], xMaxX, xMaxY, yMaxX, yMaxY, 100, 100));
               
            maptemp.BackFill = mapYAttr[index];
           }else{
            maptemp.BackFill = model.linearInterpolation(mapXAttr[index], xMaxX, xMaxY, yMaxX, yMaxY);
           }
            
        }else{
            maptemp.BackFill = yMax;
            
        }*/
        
        
        if(isInTriangle(mapXAttr[index], mapYAttr[index], xMaxX, xMaxY, yMaxX, yMaxY, 100, 100) || index == yMaxInd || index == xMaxInd){ 
             /*console.log(index + "[" + maptemp.Atr1 + "," + maptemp[index] + "] in triangle:  " + isInTriangle(mapXAttr[index], mapYAttr[index], xMaxX, xMaxY, yMaxX, yMaxY, 100, 100));*/
            
            if(xMaxX == yMaxX){
                maptemp.BackFill = yMax;
            }else{
                maptemp.BackFill = mapYAttr[index];
            }
        }else if((mapXAttr[index] >= yMaxX //&& mapYAttr[index] >= xMaxY 
           /*&&  mapXAttr[index] <= xMaxX*/ && mapYAttr[index] <= yMaxY)){
            maptemp.BackFill = model.linearInterpolation(mapXAttr[index], xMaxX, xMaxY, yMaxX, yMaxY);
        }else{
            maptemp.BackFill = yMax;
        }
        
        mapser.dataField = index;//"var99";
        mapser.displayText = rawVariants[a].Option;
        
        mapData.push(maptemp);
        //mapSettings.seriesGroups[1].series.push(mapser);
        
        mapData.sort(function(a, b) {
            return parseFloat(a.Atr1) - parseFloat(b.Atr1);
            //return parseFloat(a.BackFill) - parseFloat(b.BackFill);
            });
        
        mapSettings.seriesGroups[1].series.push(mapser);
        mapSettings.xAxis.maxValue = xMaxX + 10;
        mapSettings.valueAxis.maxValue = yMaxY + 10;
        if(a ==  0){
            mapser2.dataField = "BackFill";
            mapser2.displayText = "Ozadje";
            mapSettings.seriesGroups[0].series.push(mapser2);
        }
        
    }
    
    if(mapFull){
        $('#mapVariants').jqxChart({ _renderData: new Array() });
        $('#mapVariants').jqxChart({ source: mapData });
        $('#mapVariants').jqxChart('refresh');
    }else{
        mapFull = true;
        mapSettings.source = mapData;
        $("#mapVariants").jqxChart(mapSettings); 
    }
    
}

function refreshContribution(){
    //NASTAVITEV PODATKOV ZA CONTRIBUTION
    for(var b = 0; b < Object.keys(normalizedData[0]).length - 1; b++){
        criteriatemp ={};
        var varindex = "var"+b;
        criteriatemp.variant = rawVariants[b].Option;//varindex;
        for(var c = 0; c < normalizedData.length; c++){
            var index = "criteria"+c;
            criteriatemp[index] = normalizedData[c][varindex] * getCriteriaWeight(normalizedData[c].type);
            
            if(b == 0){
                var contser = { dataField: 'criteria3', displayText: 'criteria3' };
                contser.dataField = index;
                contser.displayText = normalizedData[c]["type"];
                contributionSettings.seriesGroups[0].series.push(contser);
            }
            
        }
        
        contributionData.push(criteriatemp);
    }
    
            //$("#mapVariants").jqxChart(mapSettings);
            $("#contributionVariants").jqxChart(contributionSettings);
    
            //$('#mapVariants').jqxChart('showToolTips', false);
}


function refreshSensitivity(){
    sensitivitySettings.seriesGroups[0].series = [];
    sensitivityData = [];
    
	var variants = window.model.getVariants();
	
	var seznamVariantIzr = [];
	var seznamVariantVre = [];
	
    var dropX = document.getElementById("sensDrop");
    var xIndex = dropX.options[dropX.selectedIndex].value;
    var attributeName = dropX.options[dropX.selectedIndex].innerHTML;
	
	var attrWeight = 0;
	
	if(model.getNode(attributeName).type == "criterion"){
	
		var attribute = normalizedData[xIndex];
		attrWeight = getCriteriaWeight(attribute.type);
		

		for(var a = 0; a < Object.keys(attribute).length -1; a++){
			var v = "var"+a;
			var variantaIzracun = 0;

			for(var b = 0; b < normalizedData.length; b++){
				var currentCriteria = normalizedData[b];

				var currW = getCriteriaWeight(currentCriteria.type) / 100;
				variantaIzracun = variantaIzracun + (currW * currentCriteria[v]);
			}       

			seznamVariantIzr.push(variantaIzracun);
			seznamVariantVre.push(attribute[v]);
		}
		
	}else{
		var root = model.getRootNode();
		
		for(var i = 0; i < Object.keys(variants).length; i++){
			var izrVar = "norm_var"+ i;
			seznamVariantIzr.push(root[izrVar] / 100);
		}
		
		var attribute = model.getNode(attributeName);
		attrWeight = attribute.finalNormalizedWeight;
		for(var i = 0; i < Object.keys(variants).length; i++){
			var vreVar = "norm_var"+ i;
			seznamVariantVre.push(attribute[vreVar]);
		}
	}
    
	console.log("seznamVariantIzr: " + seznamVariantIzr);
	console.log("seznamVariantVre: " + seznamVariantVre);
    var startData = {Label:0};
    var endData = {Label:100};
	var midData = {Label:attrWeight*100};
	var midData2 = {Label:attrWeight*100};
	var leftSens = {Label:null,right:null,trenutnaVred:null};
	var leftSens2 = {Label:null,left: 0, right:null,trenutnaVred:null};
	var rightSens = {Label:null,left:null,trenutnaVred:null};
	var rightSens2 = {Label:null,right: 0, left:null,trenutnaVred:null};
	
	sensitivitySettings.seriesGroups[0].series.push({dataField: "trenVred", displayText: "Trenutna vrednost", color: "red"});
	sensitivitySettings.seriesGroups[0].series.push({dataField: "left", displayText: "Levo", color:"green"});
	sensitivitySettings.seriesGroups[0].series.push({dataField: "right", displayText: "Desno", color: "green"});
    for(var c = 0; c < seznamVariantIzr.length; c++){
        var v = "var"+c;
        //startData[v] = getSensitivityStartY(attrWeight, seznamVariantIzr[c], 100, seznamVariantVre[c]) * 100;
		console.log("getSensitivityStartY(100,"+ seznamVariantVre[c]+","+ attrWeight+","+ seznamVariantIzr[c]+")");
		startData[v] = getSensitivityStartY(100, seznamVariantVre[c], attrWeight*100, seznamVariantIzr[c]*100);// * 100;
		
        endData[v] = seznamVariantVre[c];
		
		midData[v] = seznamVariantIzr[c] * 100;
		midData2[v] = null;
		leftSens[v] = 0;
		leftSens2[v] = null;
		rightSens[v] = 0;
		rightSens2[v] = null;
		
		midData["trenVred"] = 100;
		midData2["trenVred"] = 0;
		startData["trenVred"] = null;
		endData["trenVred"] = null;
		
		startData["left"] = null;		
		midData["left"] = null;	
		midData2["left"] = null;	
		endData["left"] = null;
		
		startData["right"] = null;		
		midData["right"] = null;	
		midData2["right"] = null;	
		endData["right"] = null;
		
		//sensitivityData.push({Label:attrWeight*100, trenVred: seznamVariantIzr[c] * 100})
        
        var sensser = { dataField: "a", displayText: "b"};
         sensser.dataField = v;
         sensser.displayText = rawVariants[c].Option;
         //sensser.opacity = 0.3;
        sensitivitySettings.seriesGroups[0].series.push(sensser);
    }
    
	var sensMax = 0;
	var sensIntersectionsArray = [];
	for(var d = 0; d < Object.keys(window.model.getVariants()).length; d++){
		var vv = "var" + d;
		if(midData[vv] > sensMax){
			sensMax = midData[vv];
		}			
	}
	
	for(var d = 0; d < Object.keys(window.model.getVariants()).length; d++){
		var vvv = "var" + d;
		if(midData[vvv] == sensMax){
			var sensStartEndData = [];
			sensStartEndData.push(startData);
			sensStartEndData.push(endData);
			
			
			sensIntersectionsArray = findSensitivityIntersections(vvv, attrWeight * 100, sensStartEndData);
			break;
		}			
	}
	
	for(var d = 0; d < sensIntersectionsArray.length; d++){
		if(sensIntersectionsArray[d].position == "left"){
			leftSens.left = 100;//sensIntersectionsArray[d].y;
			leftSens.Label = sensIntersectionsArray[d].x;
			leftSens2.Label = sensIntersectionsArray[d].x;
		}
		
		if(sensIntersectionsArray[d].position == "right"){
			rightSens.right = 100;//sensIntersectionsArray[d].y;
			rightSens.Label = sensIntersectionsArray[d].x;
			rightSens2.Label = sensIntersectionsArray[d].x;
		}
	}
	
	
	
	sensitivityData.push(leftSens);
	sensitivityData.push(leftSens2);
	sensitivityData.push(rightSens);
	sensitivityData.push(rightSens2);
	sensitivityData.push(midData);
	sensitivityData.push(midData2);
    sensitivityData.push(startData);	
    sensitivityData.push(endData);
	
    
	/*sensitivityData = [
	{Label: 35, trenVred: 100, var0: 67, var1: 72, var2: 27},
	{Label: 35, trenVred: 0, var0: null, var1: null, var2: null},
	{Label: 0, trenVred: null, var0: 86, var1: 56, var2: 41},
	{Label: 100, trenVred: null, var0: 33, var1: 100, var2: 0}];*/
	
	/*sensitivitySettings.seriesGroups[0].series.push({dataField: "vara", displayText: "meja", color: "red"});
	sensitivityData = [		
	{Label: 20, trenVred: null, var0: 67, var1: 72, var2: 27 ,vara:100},
	{Label: 20, trenVred: null, var0: null, var1: null, var2: null, vara:0},
	{Label: 35, trenVred: 100, var0: 67, var1: 72, var2: 27 ,vara:null},
	{Label: 35, trenVred: 0, var0: null, var1: null, var2: null,vara:null},
	{Label: 0, trenVred: null, var0: 86, var1: 56, var2: 41,vara:null},
	{Label: 100, trenVred: null, var0: 33, var1: 100, var2: 0,vara:null}];*/
	
    
    if(sensitivityFull){
        $('#sensitivityVariants').jqxChart({ _renderData: new Array() });
        $('#sensitivityVariants').jqxChart({ source: sensitivityData });
        $('#sensitivityVariants').jqxChart('refresh');
    }else{
        sensitivityFull = true;
        sensitivitySettings.source = sensitivityData;
        $("#sensitivityVariants").jqxChart(sensitivitySettings); 
    }
	//$('#sensitivityVariants').jqxChart(sensitivitySettings);
}


function initializeDataAndSettingsContainers(){
    spiderData = [
                /*{
                    type: 'Organic Search',
                    month1: 17,
                    month2: 31
                },
                {
                    type: 'Paid Search',
                    month1: 92,
                    month2: 21
                },
                {
                    type: 'Direct',
                    month1: 42,
                    month2: 93
                },
                {
                    type: 'Referral',
                    month1: 12,
                    month2: 25
                },
                {
                    type: 'Twitter',
                    month1: 35,
                    month2: 68
                },
                {
                    type: 'Facebook',
                    month1: 38,
                    month2: 83
                }*/
            ];
    
    
    spiderSettings = {
                title: "Razlike med variantami po atributih",
                description: "",
                enableAnimations: false,
                showLegend: true,
                padding: { left: 5, top: 5, right: 5, bottom: 5 },
                titlePadding: { left: 0, top: 0, right: 0, bottom: 5 },
                source: spiderData,
                colorScheme: 'scheme05',
                xAxis:
                {
                    dataField: 'type',
                    displayText: 'Atribut',
                    valuesOnTicks: true,
                    labels: { autoRotate: false }
                },
                valueAxis:
                {
                    unitInterval: 100,
                    labels: {
                        formatSettings: { decimalPlaces: 0 },
                        formatFunction: function (value, itemIndex, serieIndex, groupIndex) {
                            return Math.round(value / 10) + '';
                        }
                    }
                },
                seriesGroups:
                    [
                        {
                            spider: true,
                            startAngle: 0,
                            endAngle: 360,
                            radius: 80,//120,
                            type: 'line',//'spline',
                            series: [
                                    //{ dataField: 'month1', displayText: 'January 2014', opacity: 0.7, radius: 2, lineWidth: 2, symbolType: 'circle' },
                                    //{ dataField: 'month2', displayText: 'February 2014', opacity: 0.7, radius: 2, lineWidth: 2, symbolType: 'square' }
                                ]
                        }
                    ]
            };
    
    
    
    mapData = [
                    /*{ City: 'New York', SalesQ1: 330500, SalesQ2: 210500, YoYGrowth: 1.05 },
                    { City: 'London', SalesQ1: 120000, SalesQ2: 169000, YoYGrowth: 1.15 },
                    { City: 'Paris', SalesQ1: 205000, SalesQ2: 275500, YoYGrowth: 1.45 },
                    { City: 'Tokyo', SalesQ1: 187000, SalesQ2: 130100, YoYGrowth: 0.45 },
                    { City: 'Berlin', SalesQ1: 187000, SalesQ2: 113000, YoYGrowth: 1.65 },
                    { City: 'San Francisco', SalesQ1: 142000, SalesQ2: 102000, YoYGrowth: 1.25 },
                    { City: 'Chicago', SalesQ1: 171000, SalesQ2: 124000, YoYGrowth: 0.75 }*/
                    /*{ Atr1: 50, var1: 50},
                    { Atr1: 60, var2: 90},
                    { Atr1: 10, var3: 10},
                    { Atr1: 70, var4: 60},
                    { Atr1: 20, var5: 50}*/
         //{ Atr1:73.17073170731707,  var1:50}, { Atr1:8.130081300813009,  var2:50}, { Atr1:100,  var3:50}/*,  { Atr1:undefined,  var4:undefined},  { Atr1:undefined,  var5:undefined}*/
         
                ];
    
   
   
            // prepare jqxChart settings
    mapSettings = {
                title: "Map analiza",
                description: "",
                enableAnimations: true,
                showLegend: true,
                padding: { left: 5, top: 5, right: 5, bottom: 5 },
                titlePadding: { left: 90, top: 0, right: 0, bottom: 10 },
                source: mapData,
                colorScheme: 'scheme01',
                xAxis:
                {
                    dataField: 'Atr1',
                    valuesOnTicks: true,
                    minValue: 0,
                    //maxValue: 110,
                    unitInterval: 10,
                    title: {text: "Teza"}
                    
                },
                valueAxis:
                {
                    minValue: 0,
                    //maxValue: 110,
                    unitInterval: 10,
                    title: {text: 'RAM<br>'},
                    labels: {
                        formatSettings: { prefix: '', thousandsSeparator: ',' },
                        horizontalAlignment: 'right'
                    }
                },
                seriesGroups:
                    [
                        {
                            type: 'area',
                            series: [
                                    /*{ dataField: 'var1', symbolSize: 20, symbolType: 'circle', displayText: 'var1'},
                                    { dataField: 'var2', symbolSize: 20, symbolType: 'circle', displayText: 'var2'},
                                    { dataField: 'var3', symbolSize: 20, symbolType: 'circle', displayText: 'var3'},
                                    { dataField: 'var4', symbolSize: 20, symbolType: 'circle', displayText: 'var4'},
                                    { dataField: 'var5', symbolSize: 20, symbolType: 'circle', displayText: 'var5'}*/
                                ]
                        },
                        {
                            type: 'scatter',
                            series: [
                                    /*{ dataField: 'var1', symbolSize: 20, symbolType: 'circle', displayText: 'var1'},
                                    { dataField: 'var2', symbolSize: 20, symbolType: 'circle', displayText: 'var2'},
                                    { dataField: 'var3', symbolSize: 20, symbolType: 'circle', displayText: 'var3'},
                                    { dataField: 'var4', symbolSize: 20, symbolType: 'circle', displayText: 'var4'},
                                    { dataField: 'var5', symbolSize: 20, symbolType: 'circle', displayText: 'var5'}*/
                                ]
                        }
                    ]
            };
    
    contributionData = [
                /*    { variant: 'Monday', criteria1: 30, criteria2: 0, criteria3: 25 },
                    { variant: 'Tuesday', criteria1: 25, criteria2: 25, criteria3: 0 },
                    { variant: 'Wednesday', criteria1: 30, criteria2: 0, criteria3: 25 },
                    { variant: 'Thursday', criteria1: 35, criteria2: 25, criteria3: 45 }*/
                ];
            // prepare jqxChart settings
    contributionSettings = {
                title: "Prispevek k koristnosti",
                description: "",
                enableAnimations: true,                
                showLegend: true,
                padding: { left: 5, top: 5, right: 5, bottom: 5 },
                titlePadding: { left: 90, top: 0, right: 0, bottom: 10 },
                source: contributionData,
                xAxis:
                    {
                        dataField: 'variant',
                        unitInterval: 1,
                        axisSize: 'auto',
                        tickMarks: {
                            visible: true,
                            interval: 1,
                            color: '#BCBCBC'
                        },
                        gridLines: {
                            visible: true,
                            interval: 1,
                            color: '#BCBCBC'
                        }
                    },
                valueAxis:
                {
                    unitInterval: 20,
                    //minValue: 0,
                    //maxValue: 300,
                    title: { text: 'Prispevek posameznega kriterija k koristnosti' },
                    labels: { horizontalAlignment: 'right' },
                    tickMarks: { color: '#BCBCBC', visible: false }
                },
                colorScheme: 'scheme06',
                seriesGroups:
                    [
                        {
                            type: 'stackedcolumn',
                            columnsGapPercent: 50,
                            seriesGapPercent: 0,
                            series: [
                                    //{ dataField: 'criteria1', displayText: 'criteria1' },
                                    //{ dataField: 'criteria2', displayText: 'criteria2' },
                                    //{ dataField: 'criteria3', displayText: 'criteria3' }
                                ]
                        }
                    ]
            };
    
    
    
    
    
    sensitivityData = [
	/*{Label: '0', Value1: '100', Value2: '30'},
	{Label: '100', Value1: '50', Value2: '90'}*/];
	
	/* data adapter settings */
	/*var dataAdapter = new $.jqx.dataAdapter({
		localdata: data,
		datafields: [
			{name: "Label", type: "number"},
			{name: "Value1", type: "number"},
			{name: "Value2", type: "number"}
		]
	});*/

	
	sensitivityDataAdapter = new $.jqx.dataAdapter({
		localdata: sensitivityData,
		datafields: [
			{name: "Label", type: "number"},
			{name: "trenVred", type: "string"},
			{name: "var0", type: "string"},
			{name: "var1", type: "string"},
			{name: "var2", type: "string"}
		]
	});
	/* chart settings */
	sensitivitySettings = {
		source: /*sensitivityDataAdapter,*/sensitivityData,
		title: "Občutljivost navzgor",
		description: "",
		padding: {
			left: 5,
			top: 5,
			right: 5,
			bottom: 5
		},
		titlePadding: {
			left: 5,
			top: 5,
			right: 5,
			bottom: 5
		},
		enableAnimations: false,
		xAxis: {
			dataField: "Label",
			valuesOnTicks: true
		},
		valueAxis: {
			valuesOnTicks: true,
			maxValue: 100
		},
		seriesGroups: [			
			{
				type: "line",
				series: [					
					/*{
						dataField: "Value1"
					},
					{
						dataField: "Value2"
					},
                    {
						dataField: "Value3"
					}*/
				]
			}/*,
			{
				type: "line",
				series:[]
			}*/
		]
	}
	
    
    maximinData = [
              /*  { Country: 'China', Population: 1347350000, Percent: 19.18 },
                { Country: 'India', Population: 1210193422, Percent: 17.22 },
                { Country: 'USA', Population: 313912000, Percent: 4.47 },
                { Country: 'Indonesia', Population: 237641326, Percent: 3.38 },
                { Country: 'Brazil', Population: 192376496, Percent: 2.74}*/];
            // prepare jqxChart settings
    maximinSettings = {
                title: "Maximin analiza",
                description: "",
                showLegend: true,
                enableAnimations: true,
                padding: { left: 20, top: 5, right: 20, bottom: 5 },
                titlePadding: { left: 90, top: 0, right: 0, bottom: 10 },
                source: maximinData,
                xAxis:
                {
                    dataField: 'Label',
                    gridLines: { visible: true },
                    flip: false,
                    labels: {
                        angle: 90
                    }
                },
                valueAxis:
                {
                    flip: true,
                    labels: {
                        visible: true,
                        formatFunction: function (value) {
                            return value;//parseInt(value / 1000000);
                        }
                    }
                },
                colorScheme: 'scheme01',
                seriesGroups:
                    [
                        {
                            type: 'column',
                            orientation: 'horizontal',
                            columnsGapPercent: 50,
                            toolTipFormatSettings: { thousandsSeparator: ',' },
                            series: [
                                    { dataField: 'Value', displayText: 'Največji minimum variante' }
                                ]
                        }
                    ]
            };
    
    minimaxData = [
              /*  { Country: 'China', Population: 1347350000, Percent: 19.18 },
                { Country: 'India', Population: 1210193422, Percent: 17.22 },
                { Country: 'USA', Population: 313912000, Percent: 4.47 },
                { Country: 'Indonesia', Population: 237641326, Percent: 3.38 },
                { Country: 'Brazil', Population: 192376496, Percent: 2.74}*/];
            // prepare jqxChart settings
    minimaxSettings = {
                title: "Minimax/Maximax analiza",
                description: "",
                showLegend: true,
                enableAnimations: true,
                padding: { left: 20, top: 5, right: 20, bottom: 5 },
                titlePadding: { left: 90, top: 0, right: 0, bottom: 10 },
                source: minimaxData,
                xAxis:
                {
                    dataField: 'Label',
                    gridLines: { visible: true },
                    flip: false,
                    labels: {
                        angle: 90
                    }
                },
                valueAxis:
                {   
                    minValue: "0",
                    flip: true,
                    labels: {
                        visible: true,
                        formatFunction: function (value) {
                            return value;//parseInt(value / 1000000);
                        }
                    }
                },
                colorScheme: 'scheme01',
                seriesGroups:
                    [
                        {
                            type: 'column',
                            orientation: 'horizontal',
                            columnsGapPercent: 50,
                            toolTipFormatSettings: { thousandsSeparator: ',' },
                            series: [
                                    { dataField: 'Value', displayText: 'Maximum variante' }
                                ]
                        }
                    ]
            };
    
    
    estimatedValueData = [
              /*  { Country: 'China', Population: 1347350000, Percent: 19.18 },
                { Country: 'India', Population: 1210193422, Percent: 17.22 },
                { Country: 'USA', Population: 313912000, Percent: 4.47 },
                { Country: 'Indonesia', Population: 237641326, Percent: 3.38 },
                { Country: 'Brazil', Population: 192376496, Percent: 2.74}*/];
            // prepare jqxChart settings
    estimatedValueSettings = {
                title: "Pričakovana vrednost",
                description: "",
                showLegend: true,
                enableAnimations: true,
                padding: { left: 20, top: 5, right: 20, bottom: 5 },
                titlePadding: { left: 90, top: 0, right: 0, bottom: 10 },
                source: estimatedValueData,
                xAxis:
                {
                    dataField: 'Label',
                    gridLines: { visible: true },
                    flip: false,
                    labels: {
                        angle: 90
                    }
                },
                valueAxis:
                {   
                    minValue: "0",
                    flip: true,
                    labels: {
                        visible: true,
                        formatFunction: function (value) {
                            return value;//parseInt(value / 1000000);
                        }
                    }
                },
                colorScheme: 'scheme01',
                seriesGroups:
                    [
                        {
                            type: 'column',
                            orientation: 'horizontal',
                            columnsGapPercent: 50,
                            toolTipFormatSettings: { thousandsSeparator: ',' },
                            series: [
                                    { dataField: 'Value', displayText: 'Pričakovana vrednost variante' }
                                ]
                        }
                    ]
            };
	normalizedGridData = [];
    normalizedGridSource =
            {
                localdata: normalizedGridData,
                datatype: "array"
            };
    normalizedGridSettings = {
                width: 780,
                source: normalizedGridSource,
                pageable: true,
				columnsresize: true,
                autoheight: true,
				altrows: true,
                columns: [/*
                  { text: 'Kriterij', datafield: 'criteria', width: 100 },
                  { text: 'Decrease k', datafield: 'candidateDec', width: 100, cellsrenderer: cellsrendererText},
                  { text: 'Decrease', datafield: 'decreaseKor', width: 150,  /*cellsrenderer: cellsrenderer,*//*cellclassname: cellclassa, align:'center' },                  
                  { text: 'Inrease', datafield: 'increaseKor', width: 150,  /*cellsrenderer: cellsrenderer*//*cellclassname: cellclassa },
					{ text: 'Increase k', datafield: 'candidateInc', width: 100, cellsrenderer: cellsrendererText },*/
                ]
            };
	
    normalizedData = [];
}

function lessValuableVariants(){   
    
    for(var i = 0; i < Object.keys(normalizedData[0]).length - 1; i++){
        var currentKey = "var" + i;
        
        for(var j = 0; j < Object.keys(normalizedData[0]).length - 1; j++){
            var observedKey = "var" + j;
            var lessVal = true;
            if(i != j){
                for(var k = 0; k < normalizedData.length; k++){
                    var a = normalizedData[k][currentKey];
                    var b = normalizedData[k][observedKey];
                    
                    if(a > b) lessVal = false;
                }
                
                if(lessVal && lessValuables.indexOf(i) == -1) lessValuables.push(i);
            }
            
            
        }
    }
    
    var test = [];
    for(var x = 0; x < lessValuables.length; x++){        
        var variants = window.model.getVariants();
        
        test.push(variants[lessValuables[x]].Option);
    }
    //alert(lessValuables);
    $("#lessValuableVariants").jqxListBox({selectedIndex:0, source: test, width: 200, height: 250 });//$("#jqxWidget").jqxListBox({ selectedIndex: 3, source: source, width: 200, height: 250 });
}

function maximinVariants(){   
    var minimums = [];    
    
    for(var i = 0; i < Object.keys(normalizedData[0]).length - 1; i++){
        var currentKey = "var" + i;
        var min = 100;
        
        for(var j = 0; j < normalizedData.length; j++){
            var currData = normalizedData[j][currentKey];
            
            if(currData < min){
                min = currData;
            }
        }
        
        minimums.push(min);
        
    }
    
    /*var maxMinimum = 0;
    var maxMinimumIndex = -1;
    
    for(var k = 0; k < minimums.length; k++){
        if(minimums[k] > maxMinimum){
            maxMinimum = minimums[k];
            maxMinimumIndex = k;
        }
    }*/
    
    
    var test = [];
    for(var x = 0; x < minimums.length; x++){        
        var variants = window.model.getVariants();
        var currentVar = { Label: 'China', Value: 1347350000/*, Percent: 19.18*/ };
        
        currentVar.Label = variants[x].Option;
        currentVar.Value = minimums[x];
        
        maximinData.push(currentVar);
        //test.push(variants[minimums[x]].Label);
    }
    
    //$("#minimaxVariants").jqxListBox({selectedIndex:0, source: test, width: 200, height: 250 });
    $('#maximinVariants').jqxChart(maximinSettings);
}

function minimaxVariants(){   
    var maximums = [];    
    
    for(var i = 0; i < Object.keys(normalizedData[0]).length - 1; i++){
        var currentKey = "var" + i;
        var max = 0;
        
        for(var j = 0; j < normalizedData.length; j++){
            var currData = normalizedData[j][currentKey];
            
            if(currData > max){
                max = currData;
            }
        }
        
        maximums.push(max);
        
    }
    
    /*var maxMinimum = 0;
    var maxMinimumIndex = -1;
    
    for(var k = 0; k < minimums.length; k++){
        if(minimums[k] > maxMinimum){
            maxMinimum = minimums[k];
            maxMinimumIndex = k;
        }
    }*/
    
    
    var test = [];
    for(var x = 0; x < maximums.length; x++){        
        var variants = window.model.getVariants();
        var currentVar = { Label: 'China', Value: 1347350000/*, Percent: 19.18*/ };
        
        currentVar.Label = variants[x].Option;
        currentVar.Value = maximums[x];
        
        minimaxData.push(currentVar);
        //test.push(variants[minimums[x]].Label);
    }
    
    //$("#minimaxVariants").jqxListBox({selectedIndex:0, source: test, width: 200, height: 250 });
    $('#minimaxVariants').jqxChart(minimaxSettings);
}

function estimatedValueVariants(){   
    var estValues = [];    
    expectedValues = [];
    
    for(var i = 0; i < Object.keys(normalizedData[0]).length - 1; i++){
        var currentKey = "var" + i;
        var currentValue = 0;
        
        for(var j = 0; j < normalizedData.length; j++){
            var currData = normalizedData[j][currentKey];
            
            currentValue = currentValue + (currData * getCriteriaWeight(normalizedData[j].type));            
        }
        
        estValues.push(currentValue);
        expectedValues.push(currentValue);
    }
    
    /*var maxMinimum = 0;
    var maxMinimumIndex = -1;
    
    for(var k = 0; k < minimums.length; k++){
        if(minimums[k] > maxMinimum){
            maxMinimum = minimums[k];
            maxMinimumIndex = k;
        }
    }*/
    
    
    var test = [];
    for(var x = 0; x < estValues.length; x++){        
        var variants = window.model.getVariants();
        var currentVar = { Label: 'China', Value: 1347350000/*, Percent: 19.18*/ };
        
        currentVar.Label = variants[x].Option;
        currentVar.Value = estValues[x];
        
        estimatedValueData.push(currentVar);
        //test.push(variants[minimums[x]].Label);
    }
    
    //$("#minimaxVariants").jqxListBox({selectedIndex:0, source: test, width: 200, height: 250 });
    //$('#estimatedValueVariants').jqxChart(estimatedValueSettings); ZAKOMENTIRANO KER NE RIŠEMO VEČ GRAFA POTREBUJEJO SE SAMO PODATKI
}

function increaseDecrease(){ console.log("INCREASE/DECREASE");
    var preferred = getMaxOfArray(expectedValues, "I");
    var prefEV = expectedValues[preferred];
    var increaseDecreaseData = [];

    var criteria = window.model.getCriteriaNamesToList();

    for(var i = 0; i < criteria.length; i++){
        var criteriaName = criteria[i];
        var criteriaWeight = getCriteriaWeight(criteriaName) * 100;
        var row = {}
        row.criteria = criteriaName;
        row.decreaseKor = "";
        row.candidateDec = "";
        row.increaseKor = "";
        row.candidateInc = "";
        var criteriaSens = calculateSensitivityDown(criteriaName);

        for(var j = 0; j < criteriaSens.length; j++){
            var incDec = criteriaSens[j];

            if(incDec.position == "left"){
                row.decreaseKor = Math.ceil(Math.abs(incDec.x - criteriaWeight));
                row.candidateDec = getVariantNameByIndex((incDec.vara).substring(3));
            }else if(incDec.position == "right"){
                row.increaseKor = Math.ceil(Math.abs(incDec.x - criteriaWeight));
                row.candidateInc = getVariantNameByIndex((incDec.vara).substring(3));
            }
        }
        increaseDecreaseData.push(row);
    }


	 increaseDecreaseDataGlobal = increaseDecreaseData;
     //increaseDecreaseDataGlobal[2].increaseKor = 1;
     var source =
            {
                localdata: increaseDecreaseData,
                datatype: "array"
            };
            var cellsrenderer = function (row, columnfield, value, defaulthtml, columnproperties) {
                if (value < 50) {
                    return '<div style="float: ' + columnproperties.cellsalign + '; color: green;">' + value + '</div>';
                }
                else {
                    return '<span style="color: red; background-color:blue;">' + value + '</span>';
                }
            }

			var cellsrendererText = function (row, columnfield, value, defaulthtml, columnproperties) {
                    return '<div style="text-align:center;">' + value + '</div>';
            }

			var cellclassa = function (row, columnfield, value) {
				if(value == ""){
					return "x";
				}

                if (value <= 5) {
                    return 'red';
                }
                else if (value > 5 && value < 15) {
                    return 'yellow';
                }
                else return 'green';
            }

            $("#increaseDecreaseVariants").jqxGrid(
            {
                width: 640,
                source: source,
                pageable: true,
                autoheight: true,
				altrows: true,
                columns: [
                  { text: 'Kriterij', datafield: 'criteria', width: 100 },
                  { text: 'Kandidat -', datafield: 'candidateDec', width: 100, cellsrenderer: cellsrendererText, align:'center'},
                  { text: 'Zmanjšanje uteži', datafield: 'decreaseKor', width: 150,  /*cellsrenderer: cellsrenderer,*/cellclassname: cellclassa, align:'center' },
                  { text: 'Povečanje uteži', datafield: 'increaseKor', width: 150,  /*cellsrenderer: cellsrenderer*/cellclassname: cellclassa, align:'center' },
					{ text: 'Kandidat +', datafield: 'candidateInc', width: 100, cellsrenderer: cellsrendererText, align:'center' },
                ]
            });




}

function increaseDecreaseOLD(){ console.log("INCREASE/DECREASE");
    var preferred = getMaxOfArray(expectedValues, "I");
    var prefEV = expectedValues[preferred];
    var increaseDecreaseData = [];
    for(var x = 0; x < normalizedDataWithWeights.length; x++){console.log("PREF  " +preferred);
        var prefValue = normalizedDataWithWeights[x]["var" + preferred];
        var candidateInc = undefined;
        var candidateDec = undefined;
        
        var currentInc = null;
        var currentDec = null;
		console.log("*candidateDec = " + candidateDec + " currentDec = " + currentDec);
        console.log("*candidateInc = " + candidateInc  + " currentInc = " + currentInc);
															  
        for(var j = 0; j < Object.keys(normalizedDataWithWeights[x]).length - 1; j++){
            var current = "var" + j;
            var differ = prefValue - normalizedDataWithWeights[x][current];
			
            if(j != preferred /*&& differ != prefValue*//*&& prefValue != 0 || normalizedDataWithWeights[x][current]*/){
                
                
                if(differ < 0){
                    //decreases[current] = differ;    
                    if(currentDec == null){
                        currentDec = differ;
                        candidateDec = current;
                    }else{
                        if(differ > currentDec){
                            curentDec = differ;
                            candidateDec = current;
                        }
                    }
                }if (differ > 0){
                    //increases[current] = differ;
                    if(currentInc == null){
                        currentInc = differ;
                        candidateInc = current;
                    }else{
                        if(differ < currentInc){
                            currentInc = differ;
                            candidateInc = current;
                        }
                    }
                }
				
				console.log("diff " + prefValue + " " + normalizedDataWithWeights[x][current] + " " + differ);
				console.log("candidateDec = " + candidateDec + " currentDec = " + currentDec);
				console.log("candidateInc = " + candidateInc  + " currentInc = " + currentInc);
				
            }
        }
        
	    var koristnostInc = undefined;
	    var cumulativeWInc = undefined;
        //INCREASE
        if(typeof candidateInc !== "undefined"/* && currentInc != null*/){
        var incEV = expectedValues[Number(candidateInc.substring(3))];
        var incEvDiff = prefEV - incEV;
        
        koristnostInc = (incEvDiff + normalizedDataWithWeights[x][candidateInc]) /       getCriteriaWeight(normalizedDataWithWeights[x].type);
        cumulativeWInc /*koristnostInc*/ = (incEvDiff + normalizedDataWithWeights[x][candidateInc]) / normalizedData[x][candidateInc];   
        
        }
        
        var koristnostDec = undefined;
	    var cumulativeWDec = undefined

        //DECREASE
        if(typeof candidateDec !== "undefined"/* && currendDec != null*/){
        var decEV = expectedValues[Number(candidateDec.substring(3))];
        var decEvDiff = prefEV - decEV;
        
        koristnostDec = (decEvDiff + normalizedDataWithWeights[x][candidateDec]) /       getCriteriaWeight(normalizedDataWithWeights[x].type);
            
        cumulativeWDec/*koristnostDec*/ = (decEvDiff + normalizedDataWithWeights[x][candidateDec]) / normalizedData[x][candidateDec];
        }
        
        console.log("za kriterij: " + normalizedDataWithWeights[x].type + " INCREASE: var=" + candidateInc + " korist=" + koristnostInc + "    DECREASE: var=" + candidateDec + " korist=" + koristnostDec);
        var row = {};
        var variante = window.model.getVariants();
															  
        row.criteria = normalizedData[x].type;
															  
		row.increaseKor = parseFloat(koristnostInc).toFixed(2);//Math.round(koristnostInc);
        row.decreaseKor = parseFloat(koristnostDec).toFixed(2);//Math.round(koristnostDec);

		if(typeof candidateInc !== "undefined"  && row.increaseKor < 101){													  
        	row.candidateInc = variante[candidateInc.substring(3)].Option + " (" + Math.round(calculateValueDifference(row.criteria, koristnostInc, "I")) + ")";
		}else{
			row.candidateInc = "";//candidateInc;
		}
		if(typeof candidateDec !== "undefined" && row.decreaseKor < 101){															  
 			row.candidateDec = variante[candidateDec.substring(3)].Option + " (" + Math.round(calculateValueDifference(row.criteria, koristnostDec, "D")) + ")";
		}else{
			row.candidateDec = "";//candidateDec;
		}
		
															 
		
		
		if(isNaN(row.increaseKor) || row.increaseKor > 100){
			row.increaseKor = "";//row.increaseKor = Math.round(koristnostInc);
		}
															  
		if(isNaN(row.decreaseKor) || row.decreaseKor > 100){
			row.decreaseKor = "";//row.decreaseKor = Math.round(koristnostDec);
		}
															  
															  
		increaseDecreaseData.push(row);													  
															  
		candidateDec = undefined;
		currentDec = null;
	    candidateInc = undefined;
		currentInc = null;
		}
		
	    increaseDecreaseDataGlobal = increaseDecreaseData;
		var source =
            {
                localdata: increaseDecreaseData,
                datatype: "array"
            };
            var cellsrenderer = function (row, columnfield, value, defaulthtml, columnproperties) {
                if (value < 50) {
                    return '<div style="float: ' + columnproperties.cellsalign + '; color: green;">' + value + '</div>';
                }
                else {
                    return '<span style="color: red; background-color:blue;">' + value + '</span>';
                }
            }
			
			var cellsrendererText = function (row, columnfield, value, defaulthtml, columnproperties) {                
                    return '<div style="text-align:center;">' + value + '</div>';
            }
			
			var cellclassa = function (row, columnfield, value) {
				if(value == ""){
					return "x";
				}
				
                if (value < 50) {
                    return 'green';
                }
                else if (value >= 50 && value < 100) {
                    return 'yellow';
                }
                else return 'red';
            }
			
            $("#increaseDecreaseVariants").jqxGrid(
            {
                width: 640,
                source: source,
                pageable: true,
                autoheight: true,
				altrows: true,
                columns: [
                  { text: 'Kriterij', datafield: 'criteria', width: 100 },
                  { text: 'Decrease k', datafield: 'candidateDec', width: 100, cellsrenderer: cellsrendererText},
                  { text: 'Decrease', datafield: 'decreaseKor', width: 150,  /*cellsrenderer: cellsrenderer,*/cellclassname: cellclassa, align:'center' },                  
                  { text: 'Inrease', datafield: 'increaseKor', width: 150,  /*cellsrenderer: cellsrenderer*/cellclassname: cellclassa },
					{ text: 'Increase k', datafield: 'candidateInc', width: 100, cellsrenderer: cellsrendererText },
                ]
            });
							

							
					
}

function normalizedGrid(){
	//nastavi stolpce
	var criteriaNameList = window.model.getCriteriaNamesToList();
	
	//var lexicographicOrder = lexicographicOrder();
	
	var maximinIndex = calcualteMaxiMin(0);
	var maximaxIndex = calcualteMaxiMax(0);
	
	var maximinLabel = " [MAXIMIN]";
	var maximaxLabel = " [MAXIMAX]";
	
	
	var labelColumn = {text:"Varianta", datafield:"label"};
	labelColumn.width = (100 / (criteriaNameList.length + 1)) + "%";
	normalizedGridSettings.columns.push(labelColumn);
	
	
	var ngTempCriteria = []
	
	for(var crit in criteriaNameList){	
		var column = {};	
		column.text = criteriaNameList[crit];
		column.weight =  parseFloat(getCriteriaWeight(criteriaNameList[crit])).toFixed(2);
		ngTempCriteria.push(column);
		/*var column = {};	
		column.text = criteriaNameList[crit] + "[" + getCriteriaWeight(criteriaNameList[crit]) + "]";
		column.datafield = criteriaNameList[crit];
		column.width = (100 / (criteriaNameList.length)) + "%";
		
		
		normalizedGridSettings.columns.push(column);*/
	}
	
	ngTempCriteria.sort(function(a, b) {
    return parseFloat(b.weight) - parseFloat(a.weight);
	});
	
	for(var i = 0; i < ngTempCriteria.length; i++){
		var ngtcCurrent = ngTempCriteria[i];
		var column = {};	
		column.text = ngtcCurrent.text + "[" + ngtcCurrent.weight + "]";
		column.datafield = ngtcCurrent.text;
		column.width = (100 / (ngTempCriteria.length)) + "%";
		
		
		normalizedGridSettings.columns.push(column)
	}
	
	
	//nastavi vsebino
	for(var i = 0; i < Object.keys(normalizedDataWithWeights[0]).length - 1; i++){
		var currentNormalizedVariant = "var" + i;
		var row = {};
		
		row.label = "[" + (lexicographicOrder().indexOf(i) + 1) + "] " + window.model.getVariants()[i].Option;
		
		if(maximinIndex == i) row.label = row.label + maximinLabel;
		if(maximaxIndex == i) row.label = row.label + maximaxLabel;
		
		for(var j = 0; j < normalizedData.length; j++){
			row[normalizedData[j].type] = parseFloat(normalizedData[j][currentNormalizedVariant]).toFixed(2);
		}
		
		normalizedGridData.push(row);
	}	
	
	
	$("#normalizedGrid").jqxGrid(normalizedGridSettings);
}

function resetContainersToDefault(){
	dataAdapter = null;
 	spiderSettings = null;
 	spiderData = null;
 	mapSettings = null;
 	mapData = null;
	sensitivitySettings = null;
	sensitivityData = null;
	contributionSettings = null;
	contributionData = null;
	maximinData = null;
	maximinSettings = null;
	minimaxData = null;
	minimaxSettings = null;
	estimatedValueData = null;
	estimatedValueSettings = null;
	shownAttributes = null;
	normalizedData = null;
	normalizedDataWithWeights = null;
	normalizedGridData = null;
	normalizedGridSource = null;
	normalizedGridSettings = null;
	spiderFull = false;
	mapFull = false;
	sensitivityFull = false;
	lessValuables = [];
	expectedValues = [];
	sensitivityDataAdapter = null;
	
	var allNodes = window.model.getNodesToList();
	
	for(var i = 0; i < allNodes.length; i++){
		var node = allNodes[i];
		
		//node.weight = 0;
		//node.normWeight = 0;
		node.childrenWeights = null;
		node.normWeight = null;
		
		if(node.type == "node" || node.type == "root"){
			node.weight = null;
			for(var k = 0; k < Object.keys(window.model.getVariants()).length; k++){
					var normVarName = "norm_var"+k;
					var varName = "var"+k;
				
					node[normVarName] = null;
					node[varName] = null;
			}
			
		}
		window.model.updateNode(node.name, node);
	}
	
	/*document.getElementById("window9").innerHTML = "<div>" 
                                    +    "Kaj če..."
                                    + "</div>"
                                    + "<div style='overflow: hidden;'>"
                                    + "<div id='increaseDecreaseVariants' style='width: 640px; height: 480px'></div>"
                                    + "</div>";
	
	document.getElementById("window10").innerHTML = "<div>Normalizirani podatki</div> <div style='overflow: hidden;'>"
                                     + " <div id='normalizedGrid' style='width: 790px; height: 480px'></div>"
                                     +"</div>";*/
	
	
	document.getElementById("tabAnalyse").innerHTML = "<div id='jqxWidget'>"
+"                        <div id='docking'>"
+"                           <div>"
+"                                <div id='window1' style='height: 600px;'>"
+"                                    <div>"
+"                                        Zvezdni diagram"
+"                                    </div>"
+"                                    <div style='overflow: hidden;'>"
+""                                       
+"                                       <div id='spiderVariants' style='width: 640px; height: 480px'></div>"
+"                                        <div id='spiderAttributes' style='width: 380px; height: 300px'></div>"      
+""
+"                                    </div>"
+"                                </div>"
+"                                <div id='window2' style='height: 600px; width: 500px'>"
+"                                    <div>"
+"                                        Map"
+"                                    </div>"
+"                                    <div style='overflow: hidden;'>"
+"                                        <div id='mapVariants' style='width: 640px; height: 480px'></div>"
+"                                        <div id='mapAttributes' style='width: 380px; height: 300px'></div>     "
+"                                    </div>"
+"                                </div>"
+"                            <!--</div>"
+"                            <div>-->"
+"                                <div id='window3' style='height: 600px'>"
+"                                    <div>"
+"                                        Prispevek k koristnosti"
+"                                    </div>"
+"                                    <div style='overflow: hidden;'>"
+"                                        <div id='contributionVariants' style='width: 640px; height: 480px'></div>"
+"                                    </div>"
+"                                </div>"
+"                                <div id='window4' style='height: 350px;'>"
+"                                    <div>"
+"                                        Manjvredne variante"
+"                                   </div>"
+"                                    <div style='overflow: hidden;'>"
+"                                       <div id='lessValuableVariants' style='width: 380px; height: 300px'></div>"
+"                                    </div>"
+"                                </div>"
+"                                <div id='window5' style='height: 600px;'>"
+"                                    <div>"
+"                                        Občutljivost navzgor"
+"                                    </div>"
+"                                    <div style='overflow: hidden;'>"
+"                                       <div id='sensitivityVariants' style='width: 640px; height: 480px'></div>"
+"                                       <div id='sensitivityAttributes' style='width: 380px; height: 300px'></div>   "
+"                                    </div>"
+"                                </div>"                                
+"                                <div id='window9' style='height: 600px;'>"
+"                                    <div>"
+"                                        Občutljivost navzdol ali 'Kaj če...'"
+"                                    </div>"
+"                                    <div style='overflow: hidden;'>"
+"                                       <div id='increaseDecreaseVariants' style='width: 640px; height: 480px'></div>"
+"                                    </div>"
+"                                </div>"
+"								<div id='window10' style='height: 600px;'>"
+"                                    <div>"
+"                                        Normalizirani podatki"
+"                                    </div>"
+"                                    <div style='overflow: hidden;'>"
+"                                       <div id='normalizedGrid' style='width: 790px; height: 480px'></div>"
+"                                    </div>"
+"                                </div>"
+"                            </div>"
+"                        </div>"
+"                    </div>";
}

