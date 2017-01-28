
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
var macbethDifferenceLabels = ["extreme", "v. strong", "strong", "moderate", "weak", "v. weak", "no"];
// var macbethDifferenceLabels = ["extreme", "strong", "moderate", "weak", "no"];

// MRN: odkomentiraj...
window.addEventListener("beforeunload", function (e) {
    var confirmationMessage = 'Are you sure you want to leave page? '
                            + 'All your unsaved work will be lost.';

    (e || window.event).returnValue = confirmationMessage;
    return confirmationMessage; 
});

$(document).ready(function(){

		window.model = new Model();
        window.model.resetModel();

        window.valueTree = new ValueTree();
        window.valueTree.recalcData(model.getAllNodes());
        
        window.krozniMenu = new CircularMenu();
    	
    	window.gridVariants = new GridVariant('#gridVariants', model.getVariants());
    	window.gridVariants.setUpGridData();
    	window.gridVariants.buildGrid();

        $('#dialogMACBETH').DialogMACBETHH({autoOpen: false});
        $('#dialogCriteriaDetails').DialogCriterionDetails({autoOpen: false});
        $('#dialogNodeDetails').DialogNodeDetails({autoOpen: false});
        $('#dialogValFuncPiecewise').DialogPiecewise({autoOpen: false});
        $('#dialogValFuncLinear').DialogLinear({autoOpen: false});
        $('#dialogValFuncDiscrete').DialogDiscrete({autoOpen: false});
        $('#dialogWeight').DialogWeights({autoOpen: false});
        $('#dialogSaveModel').DialogSaveModel();

        $('#macbethIntervalTooltip').tooltipMACBETHInterval({});

        // YesNo DialogBox intialization
        $('#dialogYesNoMessage').messageYesNoDialog({autoOpen: false});

        MacbethIntervalCalculator();

        // $("#tabTree").on("click", refreshCircMenu);

        ///// Toolbar (shrani, odpri, undo, redo, ...)
        $('#toolbar').jqxToolBar({
            width:'100%',
            height: 32,
            tools: 'custom | custom custom | custom custom | custom custom',
            initTools: function(type, index, tool, menuToolInitialization){
                switch(index){
                    case 0:
                        var btnNew = $("<div><img src='images/imgNew16.png' style='float:left'/><div style='float:right; margin-left:5px;'>New</div></div>");
                        tool.append(btnNew);
                        btnNew.jqxButton({ height: 16 });
                        btnNew.on('click', function(){
                            
                            $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                                contentText: "All your unsaved data will be lost! Do you want to proceed?",
                                yesAction: function(){
                                    window.model = new Model();
                                    window.model.resetModel();

                                    var UMModel = new UMG(getWholeDataModel, updateModel, 50);

                                    window.valueTree = new ValueTree();
                                    window.valueTree.recalcData(model.getAllNodes());
                                }
                            });
                        });
                        break;
                    case 1:
                        var btnSave = $("<div><img src='images/imgSave16.png' style='float:left'/><div style='float:right; margin-left:5px;'>Save</div></div>");
                        tool.append(btnSave);
                        btnSave.jqxButton({ height: 16 });
                        btnSave.on('click', function(){
                             $('#dialogSaveModel').DialogSaveModel('open');
                        });
                        break;
                    case 2:
                        var btnOpen = $("<div style=margin-left:3px;><img src='images/imgOpen16.png' style='float:left'/><div style='float:right; margin-left:5px;'>Open</div></div>");
                        tool.append(btnOpen);
                        btnOpen.jqxButton({ height: 16 });
                        btnOpen.on('click', function(){
                            model.openModel(gridVariants.rebuildGrid);
                            gridVariants.rebuildGrid();
                        });
                        break;
                    case 3:
                        var btnUndo = $("<div style='margin-left:15px;'><img src='images/imgUndo16.png' style='float:left'/><div style='float:right;'></div></div>");
                        tool.append(btnUndo);
                        btnUndo.jqxButton({ height: 16 });
                        btnUndo.jqxTooltip({content: "Undo last action", animationShowDelay: 1000});
                        btnUndo.on('click', function(){
                            UMModel.UNDO();
                            gridVariants.rebuildGrid();
                        });
                        break;
                    case 4:
                        var btnRedo = $("<div style=margin-left:3px;><img src='images/imgRedo16.png' style='float:left'/><div style='float:right;'></div></div>");
                        tool.append(btnRedo);
                        btnRedo.jqxButton({ height: 16 });
                        btnRedo.jqxTooltip({content: "Redo last action.", animationShowDelay: 1000});
                        btnRedo.on('click', function(){
                            UMModel.REDO();
                            gridVariants.rebuildGrid();
                        });
                        break;
                }
            }
        });
        // $('#toolbar').on('click', function(event){
        //     // Kadar je kliknjen toolbar, ali katerakoli ikona na njem, se krožni menu zapre.
        //     refreshCircMenu();
        // });

        ///// Urejanje tabov: Value tree, Variants, Analyse...

        var validationBeforeAnalysis = function(){
            // Metoda validira model pred analizo. 
            // Če je model veljaven vrne OK, sicer sporočilo.
           
            // Preveri ali model vsebuje variante.
            var variants = model.getVariants();
            if(Object.keys(variants).length == 0){
                return "Model doesn't contain any variants!"
            }

            // Preveri ali model vsebuje kriterije.
            var criteria = model.getCriteriaToList();
            if(criteria.length < 2){
                return "Model must contains at least two critera."
            }

            // Preveri ali obstaja kaka nekonsistentna celica v grid-u variant.
            gridVariants.refreshInconsistentCells();
            var inconsistentVariants = Object.keys(gridVariants.inconsistentCells);
            if(inconsistentVariants.length > 0){

                var strIncoVariants = inconsistentVariants.join(', ');

                return "Variants with inconsistent data: " + strIncoVariants
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

                    break;

                case 'Variante' :
                    gridVariants.rebuildGrid();
    				
                    break;

                case 'Analiza' :
                    
                    // Kadar je model neveljaven ne napreduje na tab analize.
                    if(this.validationMessage != 'OK'){
                        $('#tabsContent').jqxTabs('select', this.goToIndex);

                        var message = "Model is not valid for analyse. " + this.validationMessage;
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

        window.gridVariants.setUpGridData();
        window.gridVariants.buildGrid();	
});

Number.prototype.myRound = function(places) {
  return +(Math.round(this + "e+" + places)  + "e-" + places);
}

//////////////////////////////////
//////      POMOŽNE FUNKCIJE
//////////////////////////////////

function popUpDialogCriteriaDetails(){

    $('#dialogCriteriaDetails').DialogCriterionDetails('open');
}

function popUpDialogNodeCriteriaDetails(){
    if(currentD.type == 'criterion'){
        $('#dialogCriteriaDetails').DialogCriterionDetails('open', currentD);
    }
    else if(currentD.type == 'node' || currentD.type == "root"){
        $('#dialogNodeDetails').DialogNodeDetails('open', currentD);
    }
}

function popUpDialogNodeDetails(){

    $('#dialogNodeDetails').DialogNodeDetails('open');
}

function popUpDialogValFunc(){
    if(currentD.valFuncType == 'piecewise'){
        $('#dialogValFuncPiecewise').DialogPiecewise('open', currentD);
    }
    else if(currentD.valFuncType == 'discrete'){
        $('#dialogValFuncDiscrete').DialogDiscrete('open', currentD);
    }
    else if(currentD.valFuncType == 'linear'){
        $('#dialogValFuncLinear').DialogLinear('open', currentD);
    }
}

function popUpDialogWeights(){

    $('#dialogWeight').DialogWeights('open', currentD);
}

function popUpMACBETHDialog(){
    // MR1: izbriši ker ni več potrebna....
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
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/removeIcon32.png)' onClick='UMModel.saveState(); model.deleteCurrentCriterion();krozniMenu.zapriMenu();'></div>") ;

    this.btnAddNode = $("<div id='menBtnAddNode' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/addIcon32.png)' onClick='popUpDialogNodeDetails()'></div>");

    this.btnAddCriteria = $("<div id='menBtnAddCriterion' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/addCriterionIcon32.png)' onClick='popUpDialogCriteriaDetails()'></div>");

    this.btnDetails = $("<div id='menBtnDetails' class='circMenuItem' style='position:absolute; visibility:hidden;" + 
                    "top:" + 0 + "px; left:" + 0 + "px; background: url(images/detailsIcon32.png)' onClick='popUpDialogNodeCriteriaDetails()'></div>");

    this.btnWeight = $("<div id='menBtnWeight' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/balanceIcon32.png)' onClick='popUpDialogWeights()'></div>");

    this.btnValFunc = $("<div id='menBtnValFunc' class='circMenuItem' style='position:absolute; visibility:hidden;"+
                    " top:" + 0 + "px; left:" + 0 + "px; background: url(images/imgValFunc32.png)' onClick='popUpDialogValFunc()'></div>");


    $(this.btnRemove).jqxTooltip({content: 'Delete node'});
    $(this.btnAddNode).jqxTooltip({content: 'Add node'});
    $(this.btnAddCriteria).jqxTooltip({content: 'Add criterion'});
    $(this.btnDetails).jqxTooltip({content: 'Properties'});
    $(this.btnWeight).jqxTooltip({content: 'Edit weights'});
    $(this.btnValFunc).jqxTooltip({content: 'Edit value function'});

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
    this.df = 'Procesor'

    // METODE ZA (RE)GENERIRANJE GRIDA.

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
                
                newColumn = {
                    width: 150,
                    text: criterion.name, 
                    datafield: criterion.name, 
                    validation: _self._cellValidation,
                    cellclassname: _self._cellClassAppender,
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
            if(criterion.valueFunction.type == 'linear' || criterion.valueFunction.type == 'piecewise'){
                dataFieldType = 'number';
            }

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

                UMModel.saveState();

                window.model.addVariant(rowdata);
                commit(true);

                setTimeout(function(){
                    gridVariants.rebuildGrid();
                }, 100);
            },
            updaterow: function(rowid, rowdata, commit){

                UMModel.saveState();

                window.model.updateVariant(rowdata);
                commit(true);
            },
            deleterow: function(rowid, commit){

                UMModel.saveState();

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
                btnExcelOpen.jqxTooltip({content: "Load variants from excel file.", animationShowDelay: 1000});

                var btnDeleteAllVariants = $("<div style='float:left;margin-left:4px;margin-top:4px;'><img src='images/imgClear16.png'/></div>");
                toolbar.append(btnDeleteAllVariants);
                btnDeleteAllVariants.jqxButton({ height: 16, disabled: false });
                btnDeleteAllVariants.on('click', function(){
                    if(!this.disabled){

                        $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                            contentText: "Are you sure you want to delete all variants?",
                            yesAction: function(){
                                UMModel.saveState();
                                window.model.resetVariants();
                                window.gridVariants.rebuildGrid();
                            }
                        });
                    }
                });
                btnDeleteAllVariants.jqxTooltip({content: "Delete all variants from grid.", animationShowDelay: 1000});

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
                btnRefreshInconsistentCells.jqxTooltip({content: "Refresh grid", animationShowDelay: 1000});

                toolbar.css('visibility', 'visible');
            }
        });

        // $('#gridVariants').on('cellendedit', function(event){
        //     // mmmm, saj jqxgrid ne ponuja druge možnosti. (ni mišljen, da bi v njem barvali celice...)
        //     // Če pa nebi bilo timeouta bi prihajalo do exceptionov (ker se grid pobriše medtem ko je v svoji cellendedit metodi in to ni OK.)

        //     setTimeout(function(){
        //         _self.rebuildGrid();
        //     }, 200)
        // });

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

    // METODE VALIDACIJE.

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

        // Validacija lastnosti z fixed skalo.
        if(criterion.scaleType == "fixed"){
            if(!$.isNumeric(value)){
                return {
                    result: false,
                    message: "Inserted value for function type: '" + criterion.valueFunction.type + "' must be numeric!"
                }
            }

            value = parseFloat(value);
            var min = parseFloat(criterion.minValue);
            var max = parseFloat(criterion.maxValue);
            if(value < min || value > max){
                return {
                    result: false,
                    message: "Inserted value is out of fixed interval: " + criterion.minValue + " - " + criterion.maxValue
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
                message: "Value for 'Option' must be inserted!"
            }
        }

        var variants = model.getVariantsToList();

        for(var i = 0; i < variants.length; i++){
            var variant = variants[i];

            // Isto ime ima lahko če gre za isto varianto (torej če ima isti ID).
            if(variant.Option == value && vid != variant.vid){
                return {
                    result: false,
                    message: "Variant with Option: '" + value + "' already exists!"
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

    // METODE - EXCEL

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
                    headerText: 'Warning!',
                    contentText: 'All variants must contains "Option" column!',
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
                contentText: "Unadded variants: " + unaddedVariants,
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

                UMModel.saveState();
                UMModel.pauseSaving = true;

                var data = e.target.result;

                var workbook = excelManipulator.read(data, {type: 'binary'});

                // Iz workbook-a prebere prvi sheet, ki ga ta vsebuje.
                var sheet = workbook.Sheets[Object.keys(workbook.Sheets)[0]];
                var variants = excelManipulator.utils.sheet_to_json(sheet);

                // Preveri Option property.
                _self._checkOptionProperty(variants);

                // Doda variante v model.
                _self._addAllExcelVariantsToModel(variants);
                
                UMModel.pauseSaving = false;

                // Na novo zgradi grid ter obarva nekonsistentne celice.
                _self.rebuildGrid();

            };

            fileReader.readAsBinaryString(excelFile);
        }
        
        fileChooser.click();
    }
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
}


//////////////////////////////////
//////    DIALOG KREIRANJA/UREJANJA KRITERIJA
//////////////////////////////////

(function( $ ){

    $.widget('myWidget.DialogCriterionDetails', {

        options: {
            width: 420,
            height: 480
        },

        criterion: {},
        dialogID: "",
        openMode: "",
        oldCriterionName: "",

        _create: function(){
            var _self = this;

            _self.dialogID =  "#" + $(this.element).prop('id');

            $(_self.dialogID).jqxWindow({
                height: _self.options.height, 
                width: _self.options.width,
                resizable: false,
                isModal: true,
                position: "center",
                autoOpen: false,
                draggable: true,
                initContent: function(){
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
                            { input: '#tfName', message: 'Field is required!', action: 'keyup, blur', rule: 'required' },
                            { input: '#selScaleType', message: 'Field is required!', action: 'keyup, blur', rule: selectValidatorNotNull},
                            { input: '#selValFuncType', message: 'Field is required!', action: 'keyup, blur', rule: selectValidatorNotNull },
                            { input: '#tfMin', message: 'Field is required!', action: 'keyup, blur', rule: 'required' },
                            { input: '#tfMin', message: 'Field must contains numer!', action: 'keyup, blur', rule: isMinMaxValidator },
                            { input: '#tfMax', message: 'Field is required!', action: 'keyup, blur', rule: 'required' },
                            { input: '#tfMax', message: 'Field must contains numer!', action: 'keyup, blur', rule: isMinMaxValidator },
                            { input: '#tfName', message: 'Name already exists!', action: 'keyup, blur', rule: function(input, commit){
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

                            _self._saveCriterionToModel();
                            _self._close();
                            return;
                        }

                        $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                            height: 180,
                            headerText: 'Warning!',
                            contentText: "Would you like to rename property on variants?",
                            yesAction: function(){
                                // Funkcija prvo preimenuje lastnosti variant potem shrani nov posodobljen kriterij.

                                model.renamePropertyOfVariants(_self.oldCriterionName, newName);

                                _self._saveCriterionToModel();
                                _self._close()
                            },
                            noAction: function(){
                                // Funkcija shrani samo kriterij.



                               // model.removePropertyOfVariants(_self.oldCriterionName);

                                _self._saveCriterionToModel();
                                _self._close();
                            }
                        });
                    });

                    btnCancel.on('click', function(){

                        _self._resetDialog();
                        $(_self.dialogID).jqxWindow('close');
                    });

                    selScaleType.on('change', function(event){

                        _self.refreshValFunctionTypeSelect();
                        // Ob spremembi je izbrana prva izbira valfunc...
                        $('#selValFuncType option:first').attr('selected', 'selected');

                        _self._refreshControls();
                    });

                    selselValFuncType.on('change', function(event){
                        var selVal = selselValFuncType.val();
                        _self._refreshControls();
                        selselValFuncType.val(selVal);
                    });                    
                }
            });

            // Odprtje dialoga ob kreaciji.
            if(this.options.autoOpen){
                this.open();
            }
        },

        open: function(criterion){
            // Metoda odpre dialog za kreiranje/spreminjanje kriterija.
            // Če ima podan kriterij je način odprtja Modification (M), sicer Creation (C).
            var _self = this;

            if(typeof(criterion) == 'undefined'){
                this.openMode = 'C';
                //Kadar je v Creation načinu prvo naredi prazen kriterij.
                _self.criterion = model.createNewEmptyModelCriterion();
            }
            else{
                this.openMode = "M";
                this.criterion = criterion;
                this.oldCriterionName = criterion.name;
            }

            this._resetDialog();

            if(this.openMode == "M"){
                this._refreshDialog();
            }

            $(_self.dialogID).jqxWindow('open');
        },

        _close: function(){
            var _self = this;

            _self._resetDialog();
            $(_self.dialogID).jqxWindow('close');
        },

        _resetDialog: function(){
            var _self = this;

            // MR: BUG če odpreš devtools dost visok se vseno odpre previsoko in polovice ne vidiš ter ne moreš premaknit...
            // Tko da to bi lahk naredu tko da bi odpiral z position "center", sam tm je pa problem, da ti ga odpre na vrhu,
            // četudi si zascrollal dol. Tko da glej ko je scrol večji od 0 al pa kj takega....
            $(_self.dialogID).jqxWindow({        
                position: {
                    x: ($(document).width() / 2) - (_self.options.width / 2),
                    y: (($(window).height()/2) - (_self.options.height / 2) + $(document).scrollTop())
                }
            });

            this._resetControls();
        },

        _refreshDialog: function(){
            
            if(this.openMode == "C"){
                this._resetControls();
            }
            else if(this.openMode == "M"){
                $("#tfName").val(this.criterion.name);
                $("#selScaleType").val(this.criterion.scaleType);
                this.refreshValFunctionTypeSelect();
                $('#selValFuncType').val(this.criterion.valueFunction.type);
                $("#tfMin").val(this.criterion.minValue);
                $("#tfMax").val(this.criterion.maxValue);
                $("#cbInverse").prop('checked', this.criterion.inverseScale);
                $("#taDescription").val(this.criterion.description);
            }

            this._refreshControls();
        },

        _resetControls: function(){

            $("#tfName").val('');
            $("#selScaleType").val('');
            $('#selValFuncType').val('');
            $('#selValFuncType').html('');
            $("#tfMin").val('');
            $("#tfMax").val('');
            $("#cbInverse").prop('checked', false);
            $("#taDescription").val('');
        },

        _refreshControls: function(){
            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno vnešene v kontrolah.
           
            var selValFunctionType = $('#selValFuncType').val();

            if($("#selScaleType").val() == 'relative'){
                $("#tfMin").jqxInput({ disabled: true });
                $("#tfMin").val('Min');
                $("#tfMax").jqxInput({ disabled: true });
                $("#tfMax").val('Max');
                $('#cbInverse').prop('disabled', false);
            }
            else if($("#selScaleType").val() == 'fixed'){
                
                if(selValFunctionType == 'linear' || selValFunctionType == 'piecewise'){
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
        },

        _saveCriterionToModel: function(){
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
            criterion.type = 'criterion';
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

            UMModel.saveState();

            if(_self.openMode == "C"){
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
        },

        refreshValFunctionTypeSelect: function(){
            if($("#selScaleType").val() == 'relative'){
                $('#selValFuncType').html('<option value="linear">Linear</option><option value="piecewise">Piecewise</option>');
            }
            else if($("#selScaleType").val() == 'fixed'){
                $('#selValFuncType').html('<option value="linear">Linear</option><option value="piecewise">Piecewise</option><option value="discrete">Discrete</option>');
            }
        }
    });
})(jQuery);


//////////////////////////////////
//////    DIALOG KREIRANJA/UREJANJA VOZLIŠČ
//////////////////////////////////

(function( $ ){

    $.widget('myWidget.DialogNodeDetails', {

        options: {
            width: 420,
            height: 250
        },

        node: {},
        dialogID: "",
        openMode: "",

        _create: function(){
            var _self = this;

            _self.dialogID =  "#" + $(this.element).prop('id');

            $(_self.dialogID).jqxWindow({
                height: _self.options.height, 
                width: _self.options.width,
                resizable: false,
                isModal: true,
                autoOpen: false,
                draggable: true,
                initContent: function(){

                    var tfName = $("#tfNameNode").jqxInput({height: 19, width: 250});
                    $("#tfNameNode").on('change', function(event){

                        // Trima vsebino:
                        var trimmedVal = $("#tfNameNode").val().trim()

                        $("#tfNameNode").val(trimmedVal);
                    });
                    var taDescription = $("#taDescriptionNode");

                    var btnSave = $('#btnSaveNodeCreate').jqxButton({width: 55});
                    var btnClose = $('#btnCloseNodeCreate').jqxButton({width: 55});

                    btnSave.on('click', function(){
                        $('#formNodeDetails').jqxValidator('validate');
                       
                    });
                    btnClose.on('click', function(){
                        _self._resetDialog();
                        $(_self.dialogID).jqxWindow('close');
                    });

                    $('#formNodeDetails').jqxValidator({
                        rules: [
                            { input: '#tfNameNode', message: 'Field is required!', action: 'keyup, blur', rule: 'required' },
                            { input: '#tfNameNode', message: 'Name already exists!', action: 'keyup, blur', rule: function(input, commit){
                                
                                var existingCriterias = model.getAllCriteraAndNodeToList();

                                var isValid = true;
                                existingCriterias.forEach(function(element, index){
                                    
                                    if(element.name == $("#tfNameNode").val()){
                                        if(_self.openMode == "M" && element.cid == _self.node.cid){
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
                        if(_self.openMode == "M" && _self.node.type == 'root'){
                            nodeDet = model.createNewEmptyRoot();
                        }
                        else{
                            nodeDet = model.createNewEmptyModelNode();
                        }

                        nodeDet.name = tfName.val();
                        nodeDet.description = taDescription.val();

                        var contains = model.containsNodeName(nodeDet.name);
                        
                        UMModel.saveState();

                        if(_self.openMode == "C"){
                            model.addNode(currentD, nodeDet);
                        }
                        else if(_self.openMode == "M"){
                            model.updateNodeProperties(currentD.name, nodeDet);

                            var oldDur = window.valueTree.translationDuration;
                            window.valueTree.translationDuration = 0;
                            window.valueTree.recalcData(model.getAllNodes());
                            window.valueTree.translationDuration = oldDur;
                        }

                        _self._resetDialog();
                        $(_self.dialogID).jqxWindow('close');
                    });
                }
            });

            // Odprtje dialoga ob kreaciji.
            if(_self.options.autoOpen){
                _self.open();
            }
        },

        open: function(node){
            // Metoda odpre dialog za kreiranje/spreminjanje vozlišča.
            // Če ima podano vozlišče je način odprtja Modification (M), sicer Creation (C).
            var _self = this;

            if(typeof(node) == 'undefined'){
                _self.openMode = 'C';
            }
            else{
                _self.openMode = "M";
            }

            _self._resetDialog();
            _self.node = node;

            if(_self.openMode == "M"){
                _self._refreshDialog();
            }

            $(_self.dialogID).jqxWindow('open');
        },

        _resetDialog: function(){
            var _self = this;

            $(_self.dialogID).jqxWindow({        
                position: {
                    x: ($(document).width() / 2) - (_self.options.width / 2),
                    y: (($(window).height()/2) - (_self.options.height / 2) + $(document).scrollTop())
                }
            });

            $("#tfNameNode").val('');
            $("#taDescriptionNode").val('');
        },

        _refreshDialog: function(){
            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno nastavljene v modelu.
            if(typeof(this.node) == 'undefined'){
                return;
            }

            $("#tfNameNode").val(this.node.name);
            $("#taDescriptionNode").val(this.node.description);

            this._refreshControls();
        },

        _refreshControls: function(){
            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno vnešene v kontrolah.

            // TRENUTNO PRAZNA METODA.            
        }
    });
})(jQuery);


//////////////////////////////////
//////    DIALOG VAL. FUNC. PIECEWISE
//////////////////////////////////

(function( $ ){

    $.widget('myWidget.DialogPiecewise', {

        options: {
            width: 550,
            height: 550,
        },

        criterion: {},
        dialogID: "",

        numOfPoints: 4,
        points: [],
        xAxisLabel: "Criterion",
        min: 0,
        max: 100,
        chart: {},

        _create: function(){
            var _self = this;

            _self.dialogID =  "#" + $(this.element).prop('id');

            $(_self.dialogID).jqxWindow({
                height: this.options.height,
                width: this.options.width,
                resizable: false,
                isModal: true,
                autoOpen: false,
                draggable: true,
                initContent: function(){
                    // _self.resetGraph();

                    $('#btnResetPiecewiseGraph').jqxButton({width:95});
                    $('#btnResetPiecewiseGraph').on('click', function(event){
                        _self._resetGraph();
                    });

                    $('#btnSavePiecewise').jqxButton({width:55});
                    $('#btnSavePiecewise').on('click', function(){
                        //MR: Kaj pa zapiranje z križcem (pri vseh dialogih....)
                        
                        var pointsToSave = [];
                        _self.chart.series[0].data.forEach(function(point, indx){
                            pointsToSave.push({
                                x: parseFloat(point.x.toFixed(2)),
                                y: parseFloat(point.y.toFixed(2)),
                                myIndex: point.myIndex
                            });
                        });

                        pointsToSave = _self._firstAndLastPointCheck(pointsToSave);

                        _self.criterion.valueFunction.points = pointsToSave;

                        _self.close();
                    });

                    $('#btnClosePiecewise').jqxButton({width:55});
                    $('#btnClosePiecewise').on('click', function(){

                        _self.close();
                    });

                    $('#selNumOfPointsPiecewise').on('change', function(event){
                        _self.numOfPoints = parseInt($('#selNumOfPointsPiecewise').val());
                    });
                }
            });

            // Odprtje dialoga ob kreaciji.
            if(this.options.autoOpen){
                this.open();
            }
        },

        open: function(criterion){
            // Metoda odpre dialog za kreiranje/spreminjanje vozlišča.
            // Če ima podano vozlišče je način odprtja Modification (M), sicer Creation (C).
            var _self = this;

            this.criterion = criterion;

            this._resetDialog();    

            var isValid = _self._validateBeforeOpen();
            if(!isValid){
                return;
            }
            if(criterion.scaleType == 'relative'){
                
                model.refreshMinMaxValueOfCriterion(criterion);
            }

            this.xAxisLabel = this.criterion.name;
            this.min = parseFloat(this.criterion.minValue);
            this.max = parseFloat(this.criterion.maxValue);

            if(this.criterion.valueFunction.points.length != 0){
                this.points = this.criterion.valueFunction.points;
                this.numOfPoints = this.criterion.valueFunction.points.length;
                this.points = _self._firstAndLastPointCheck(this.points);
            }
            else{
                this.numOfPoints
            }

            this._refreshDialog();
            
            $(_self.dialogID).jqxWindow('open');
        },

        close: function(){

            this._resetDialog();
            $('#dialogValFuncPiecewise').jqxWindow('close');
        },

        _resetDialog: function(){
            var _self = this;

            this._resetGraph();
            $('#selNumOfPointsPiecewise').val(0);
            this.numOfPoints = 4;
            this.points = [];
            this.xAxisLabel = "Criterion";
            this.min = 0;
            this.max = 100;

            $(_self.dialogID).jqxWindow({        
                position: {
                    x: ($(document).width() / 2) - (_self.options.width / 2),
                    y: (($(window).height()/2) - (_self.options.height / 2) + $(document).scrollTop())
                }
            });
        },

        _refreshDialog: function(){
            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno nastavljene v modelu.
            if(typeof(this.criterion) == 'undefined'){
                return;
            }

            if(this.criterion.valueFunction.type != 'piecewise'){
                throw "Grafa za piecewise ni mogoče generirati za tip: " + this.criterion.valueFunction.type;
            }

            if(this.points.length == 0){
                this._resetGraph();
            }
            else{
                this._setGraph();
            }

            $('#selNumOfPointsPiecewise').val(this.numOfPoints);

            this._refreshControls();
        },

        _refreshControls: function(){
            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno vnešene v kontrolah.

            // TRENUTNO PRAZNA METODA.            
        },

        _setGraph: function(){
            // Metoda nastavi graf glede na lastnosti ki jih vsebuje criterion.

            $('#selNumOfPointsPiecewise').val(this.numOfPoints);

            $('#graphValFuncPiecewise').html('');

            this._generateGraph();
        },

        _resetGraph: function(){
            var _self = this;

            // Pazi to ni najboljši način! (ne prestavljaj, čene lahko pride do napake. ali pa naredi reset grafa z series[n].remove(true))
            $('#graphValFuncPiecewise').html('');
            this.points = [];

            var xRange = this.max - this.min;
     
            // Generiranje točk na grafu.
            var x = this.min;
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

                this.points.push(newPoint);

                x += xStep;
                y -= yStep;
            }
            this.points[this.points.length-1].y = 0;
            this.points[this.points.length-1].x = this.max;

            this._generateGraph();
        },

        _generateGraph: function(){
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
                        text:'Preference value'
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
                        return '<b>Preference value:</b> ' + this.y.toFixed(2) + '</br> <b>' + _self.criterion.name + ':</b> ' + this.x.toFixed(2);
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
                    name: "minBound",
                    data: [{x: _self.min, y:0}, {x:_self.min, y:100}],
                    color: '#cccccc',
                    lineWidth: 1,
                    states: { hover: {enabled: false}},
                    enableMouseTracking: false
                },
                {
                    name: "maxBound",
                    data: [{x: _self.max, y:0}, {x:_self.max, y:100}],
                    color: '#cccccc',
                    lineWidth: 1,
                    states: { hover: {enabled: false}},
                    enableMouseTracking: false
                }]
            });


            // Skrivanje Highcharts.com napisa v spodnjem desnem kotu grafa...
            $('text:contains("Highcharts.com")').remove();
        },

        _firstAndLastPointCheck: function(points){
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
        },

        _validateBeforeOpen: function(){
            // Metoda preveri ali je model velaven za odprtje dialoga Piecewise.
            var _self = this;

            var variants = model.getVariants();
            var variantKeys = Object.keys(variants);

            if(variantKeys.length == 0){
                $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                    height: 180,
                    onlyYes: true,
                    headerText: 'Warning!',
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
                        headerText: 'Warning!',
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
    });
})(jQuery);


//////////////////////////////////
//////    DIALOG VAL. FUNC. LINEAR
//////////////////////////////////

(function( $ ){

    $.widget('myWidget.DialogLinear', {

        options: {
            width: 550,
            height: 550,
        },

        criterion: {},
        dialogID: "",

        points: [],
        pointsObjects: [],
        xAxisLabel: "Criterion",
        min: 0,
        max: 100,
        chart: {},

        _create: function(){
            var _self = this;

            _self.dialogID =  "#" + $(this.element).prop('id');

            $(_self.dialogID).jqxWindow({
                height: this.options.height,
                width: this.options.width,
                resizable: false,
                isModal: true,
                autoOpen: false,
                draggable: true,
                initContent: function(){
                    // _self.resetGraph();

                    $('#btnCloseLinear').jqxButton({width:55});
                    $('#btnCloseLinear').on('click', function(){

                        _self.close();
                    });
                }
            });

            // Odprtje dialoga ob kreaciji.
            if(this.options.autoOpen){
                this.open();
            }
        },

        open: function(criterion){
            // Metoda odpre dialog za kreiranje/spreminjanje vozlišča.
            // Če ima podano vozlišče je način odprtja Modification (M), sicer Creation (C).
            var _self = this;

            _self.criterion = criterion;

            var isValid = _self._validateBeforeOpen();
            if(!isValid){
                return;
            }

            if(criterion.scaleType == 'relative'){
                
                model.refreshMinMaxValueOfCriterion(criterion);
            }

            _self.xAxisLabel = this.criterion.name;
            _self.min = parseFloat(this.criterion.minValue);
            _self.max = parseFloat(this.criterion.maxValue);

            _self._refreshDialog();
            
            $(_self.dialogID).jqxWindow('open');
        },

        close: function(){

            this._resetDialog();
            $('#dialogValFuncLinear').jqxWindow('close');
        },

        _resetDialog: function(){
            var _self = this;

            // Pobriše vse črte na grafu.
            while(_self.chart.series.length > 0){
                _self.chart.series[0].remove(true);
            }

            this.xAxisLabel = "Criterion";
            this.min = 0;
            this.max = 100;
        },

        _refreshDialog: function(){
            var _self = this;

            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno nastavljene v modelu.
            if(typeof(this.criterion) == 'undefined'){
                return;
            }

            if(this.criterion.valueFunction.type != 'linear'){
                throw "Grafa za linear ni mogoče generirati za tip: " + this.criterion.valueFunction.type;
            }

            var xPos = ($(document).width() / 2) - (_self.options.width / 2);
            var yPos =  (($(window).height()/2) - (_self.options.height / 2) + $(document).scrollTop());
            if(xPos < 0 ){
                xPos = 0;
            }
            if(yPos < 0){
                yPos = 0;
            }
            $(_self.dialogID).jqxWindow({        
                position: {
                    x: xPos,
                    y: yPos
                }
            });

            this._refreshGraph();
        },

        _refreshGraph: function(){
            var _self = this;

            var xRange = _self.max - _self.min;
            
            // Pridobi variante in iz njih sestavi črto grafa.
            // Točke na črti so vrednosti obstoječih variant.
            _self.pointsObjects = [];

            var variants = model.getVariants();
            var variantsKeys = Object.keys(variants);
            variantsKeys.forEach(function(el, indx){
                
                var variant = variants[el];
                var val = variant[_self.criterion.name];

                // Pridobitev variant z isto vrednostsjo, ki so že dodane na točke grafa.
                var withSameVal = $.grep(_self.pointsObjects, function(el, indx){
                    return el.val == val;
                });

                // Če že obstajajo variante z enako vrdnostjo ime variante samo doda, v nasprotnem primeru ustvari novo točko.
                if(withSameVal.length == 0){

                    _self.pointsObjects.push({
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
            _self.points = [];
            _self.pointsObjects.forEach(function(el, indx){

                 _self.points.push({
                    x: parseFloat(el.val),
                    y: model.linearInterpolation(el.val, _self.min, 0, _self.max, 100)
                 });
            }); 
            
            // Popravilo intervala.
            _self._repairIntervalOfGraphForFixedCriterion();

            _self._generateGraph();
        },

        _repairIntervalOfGraphForFixedCriterion: function(){
            // Črta mora obstajati od začetka do konca! Zato kadar gre za Fixed potegne črto do obeh koncev(kadar vrednosti variant ne pokrivajo celotnega intervala).
            // MR: ja to nekak pohendli če se znajde kaka varianta čez rob.... (mogoče vindow in jim določi vrednsoti, ali poreži vse, ali odstrani te variante...)

            var _self = this;

            _self.points.sort(function(a, b){
                return b.val - a.val;
            });

            if(_self.criterion.scaleType == "fixed"){

                var minPoint = _self.points[0];
                var maxPoint = _self.points[_self.points.length - 1];

                if(minPoint.x > _self.min){
                    _self.points.unshift({
                        x: _self.min,
                        y: 0
                    });
                }
                if(maxPoint.x < _self.max){
                    _self.points.push({
                        x: _self.max,
                        y: 100
                    });
                }
            }
        },

        _generateGraph: function(){
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
                        text:'Preference value'
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
                    formatter: function(el, neki){
                        var _self2 = this;
                        // Metoda formatira tooltip, ki se prikaže nad piko v grafu.

                        var optionsList = "";
                        _self.pointsObjects.forEach(function(el){
                            if(el.val == _self2.x){
                                optionsList += "</br>&nbsp;&nbsp;" + el.variantNames.join("</br>&nbsp;&nbsp;");
                            }

                        });
                        return '<b>Preference value:</b> ' + _self2.y.toFixed(2) +
                                '</br><b>Variants value:</b> ' +  _self2.x.toFixed(2) +
                                '</br> <b>Options:</b> ' + optionsList;
                    }
                },
                series: [{
                    data: _self.points,
                    draggableY: false,
                    draggableX: false,
                    showInLegend: false
                }]
            });

            // Skrivanje Highcharts.com napisa v spodnjem desnem kotu grafa...
            $('text:contains("Highcharts.com")').remove();
        },

        _validateBeforeOpen: function(){
            // Metoda preveri ali je model velaven za odprtje dialoga Linear.
            var _self = this;

            var variants = model.getVariants();
            var variantKeys = Object.keys(variants);

            if(variantKeys.length == 0){
                $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                    height: 180,
                    onlyYes: true,
                    headerText: 'Warning!',
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
                        headerText: 'Warning!',
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

    });
})(jQuery);


//////////////////////////////////
//////    DIALOG VAL. FUNC. DISCRETE
//////////////////////////////////

(function( $ ){

    $.widget('myWidget.DialogDiscrete', {

        options: {
            width: 480,
            height: 450,
            criterion: {}
        },

        min: 0,
        max: 100,

        _create: function(){
            var _self = this;

            _self.dialogID =  "#" + $(this.element).prop('id');

            $('#dialogValFuncDiscrete').jqxWindow({
                height: _self.options.height,
                width: _self.options.width,
                resizable: true,
                isModal: true,
                autoOpen: false,
                draggable: true,
                position: 'center',
                initContent: function(){

                    $('#btnAddAllExistingCategories').jqxButton({height: 16, width: 16});
                    $('#btnAddAllExistingCategories').jqxTooltip({content: "Add all existing categories (from variants)", animationShowDelay: 1000});
                    $('#btnAddAllExistingCategories').on('click', function(event){

                        _self._addAllCategoriesFromComboBox();
                    });

                    $('#btnSortCategoryAsc').jqxButton({height: 16});
                    $('#btnSortCategoryAsc').jqxTooltip({content: "Sort categories ascending by value", animationShowDelay: 1000});
                    $('#btnSortCategoryAsc').on('click', function(event){
                        var fakeCriterion = _self.getSortedCategories();
                        _self.setSliders(fakeCriterion);
                    });

                    $('#btnSortCategoryDesc').jqxButton({height: 16});
                    $('#btnSortCategoryDesc').jqxTooltip({content: "Sort categories descending by value", animationShowDelay: 1000});
                    $('#btnSortCategoryDesc').on('click', function(event){
                        var fakeCriterion = _self.getSortedCategories(-1);
                        _self.setSliders(fakeCriterion);
                    });

                    $('#btnClearAllCategories').jqxButton({height: 16});
                    $('#btnClearAllCategories').jqxTooltip({content: "Clear all categories", animationShowDelay: 1000});
                    $('#btnClearAllCategories').on('click', function(event){
                        
                        $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                            contentText: "Are you sure you want to delete all categories?",
                            yesAction: function(){
                                $('#categorySlidersPanel .categoryDiv').remove();
                            }
                        });

                    });

                    $('#btnPopUpMACBETH').jqxButton({height: 24});
                    $('#btnPopUpMACBETH').on('click', function(event){

                        _self.popupMACBETHDialog();
                    });

                    $('#btnSaveDiscrete').jqxButton({width:55});
                    $('#btnSaveDiscrete').on('click', function(){      
                        _self._saveDataToCriterion();

                        $('#dialogValFuncDiscrete').jqxWindow('close');
                    });

                    $('#btnCloseDiscrete').jqxButton({width:55});
                    $('#btnCloseDiscrete').on('click', function(){
                         $('#dialogValFuncDiscrete').jqxWindow('close');
                    });
                    
                    
                    // $('#btnAddAllExistingCategories').jqxButton({width: 75});
                    // $('#btnAddAllExistingCategories').on('click', function(){                                                //validacija, ali že obstaja kategorija z imenom...
                        
                    //     _self._addAllCategoriesFromComboBox();
                    // });

                    $('#btnAddCategory').jqxButton({width: 95});
                    $('#btnAddCategory').on('click', function(){                                                //validacija, ali že obstaja kategorija z imenom...
                        
                        $('#formValFuncDiscrete').jqxValidator('validate');

                    });

                    $('#formValFuncDiscrete').jqxValidator({
                        rules: [
                            {input: '#cobCategoryName', message: 'Please insert name of category.', action: 'change', rule: function(event){
                                // Simulira required validator, ker combo box in <input> elemtn....

                                var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
                                return newCategoryName.trim() != "";
                            }},
                            {input: '#cobCategoryName', message: 'Category with this name alread exists.', action: 'keyup', rule: function(event){
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
                            {input: '#cobCategoryName', message: 'Inserted name: "min" is reserved. Please insert other name.', action: 'change', rule: function(event){
                                // Simulira required validator, ker combo box in <input> elemtn....

                                var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
                                return newCategoryName.trim() != "min";
                            }},
                        ]
                    });

                    $('#formValFuncDiscrete').on('validationSuccess', function(event){

                        var newCategoryName = $('#cobCategoryName').jqxComboBox('val');
                        $('#cobCategoryName').jqxComboBox('val', '');

                        _self._addCategoryToPanel(newCategoryName);
                        _self._refreshComboBoxNames();
                    });
                }
            });

            $('#cobCategoryName').jqxComboBox({
                height: 19,
                width: 300,
            });
        },

        open: function(criterion){
            // Metoda odpre dialog za kreiranje/spreminjanje vozlišča.
            // Če ima podano vozlišče je način odprtja Modification (M), sicer Creation (C).
            var _self = this;

            this.options.criterion = criterion;

            // Pozor: open se MORA zgoditi pred refreshDialogom, sicer se sliderji ne posodavljajo in jih ne obarva.... 
            // (jqxSlider očitno deluje, da če je v trenutku nastavljanja invisible, da ne refresha)
            $(_self.dialogID).jqxWindow('open');

            this._refreshDialog();
        },

        close: function(){

            this._resetDialog();
            $('#dialogValFuncPiecewise').jqxWindow('close');
        },

        _resetDialog: function(){
            var _self = this;

            $(_self.dialogID).jqxWindow({        
                position: {
                    x: ($(document).width() / 2) - (_self.options.width / 2),
                    y: (($(window).height()/2) - (_self.options.height / 2) + $(document).scrollTop())
                }
            });
        },

        _refreshDialog: function(){
            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno nastavljene v modelu.
            var _self = this;

            if(!_self.options.criterion.valueFunction){
                _self.resetSliders(this.options.criterion);
            }
            else{
                _self.setSliders(this.options.criterion);
            }

            _self._refreshControls();

            _self._disableAllBoundedSliders();
        },

        _refreshControls: function(){
            var _self = this;
            // Metoda nastavi kontrole glede na vrednosti, ki so trenutno vnešene v kontrolah.

            // Nastavi vrednosti v combo boxu -> vse obstoječe vrednosti razen dodanih.
           _self._refreshComboBoxNames();
        },
    
        _refreshComboBoxNames: function(){
            var _self = this;
            //Metoda osveži combo box za dodajanje kategorij.

            var addedCategories = Object.keys(_self.getCatogories());
            var unaddedCategories = [];

            var values = model.getAllValuesOfCategory(_self.options.criterion.name);
            values.forEach(function(el){
                if(addedCategories.indexOf(el) == -1){
                    unaddedCategories.push(el);
                }
            });

            $('#cobCategoryName').jqxComboBox('source', unaddedCategories);
        },

        getCatogories: function(){
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
        },

        getSortedCategories: function(sortOrder){
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
        },

        resetSliders: function(criterion){
            var _self = this;

            var sliders = $('.categorySliders');
            for(var i=0; i < sliders.length; i++){
                
                var slider = $(sliders[i]).jqxSlider('destroy');

            }

            $('#tableCategorySliders').html('');
            $('#tfCategoryName').val('');
            this.min = parseFloat(criterion.minValue);
            this.max = parseFloat(criterion.maxValue);
        },

        setSliders: function(criterion){
            var _self = this;

            // Resetiranje panela diskretne funkcije.
            this.resetSliders(criterion);

            // 
            if(typeof(criterion.valueFunction.categories) == 'undefined')
            {
                criterion.valueFunction.categories = {}
            }
            
            var categoryKeys = Object.keys(criterion.valueFunction.categories);
            for(var i = 0; i < categoryKeys.length; i++){
                var categoryName = categoryKeys[i];
                var categoryValue = criterion.valueFunction.categories[categoryName];
                this._addCategoryToPanel(categoryName);
            }

            var categorySliders = $('.categorySliders');

            // Vsakemu slider-ju nastavi vrednost kategorije.
            for(var i = 0; i < categorySliders.length; i++){
                var slider = categorySliders[i];
                var categoryName = categoryKeys[i];
                var categoryValue = criterion.valueFunction.categories[categoryName];

                $(slider).jqxSlider('setValue', categoryValue);
            }
        },

        _addCategoryToPanel: function(newCategoryName){
            var _self = this;

            // Se znebi presledkov.
            var newSliderID = 'slider' + newCategoryName.split(" ").join("_");

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

                if(!_self.options.criterion.valueFunction.usingMACBETH || ! _self._categoryIsUsedInMacbeth(catName)){
                    return;
                }

                var catInterval = _self.options.criterion.valueFunction.MACBETHIntervals[catName];
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
            }); 
            // Event za spremembo intervalov je potreben tudi kadar se slider spreminja z pomočjo gumbov ob levi in desni.
            $(newCategoryDiv).find('.jqx-icon-arrow-right').on('click', function(){
                // MR: NUJNO NUJNO PRIDOBI IME KATEGORIJ IN GA PODAJ (TAKO KOT PRI SLIDANJU...)

                _self._recalculateIntervals();
            });
            $(newCategoryDiv).find('.jqx-icon-arrow-left').on('click', function(){

                _self._recalculateIntervals();
            });

            // Poskrbi za prikaz tooltipa z intervalom kadar se uporablja macbeth.
            $(newCategoryDiv).hover(
                function(event){
                    // Kadar z miško stopimo nad div kategorije prikaže tooltip.

                    // Tooltip se prikaže samo ob uporabi MACBETHA.
                    if(!_self.options.criterion.valueFunction.usingMACBETH){
                        return;
                    }

                    var categoriesNames = Object.keys(_self.options.criterion.valueFunction.MACBETHIntervals);

                    var categoryDiv = $(event.currentTarget);
                    var slider = categoryDiv.find('.categorySliders');
                    var categoryName = slider.attr('categoryName');

                    // Če kategorija še ne obstaja pomeni, da je bila ravno dodana (oz. je bila dodana in še ne uporabljena v  MACBETHU) in tudi v tem primeru se tooltip ne prikaže.
                    if(categoriesNames.indexOf(categoryName) == -1){
                        return;
                    }

                    var interval = _self.options.criterion.valueFunction.MACBETHIntervals[categoryName].interval;

                    var leftOffset = categoryDiv.width() / 2;
                    $('#macbethIntervalTooltip').tooltipMACBETHInterval('setValues', interval.lowerBound, interval.upperBound);
                    $('#macbethIntervalTooltip').tooltipMACBETHInterval('showAt', categoryDiv.offset(), leftOffset);
                }, 
                function(event){ 
                    // Kadar z miško stopimo izven div kategorije skrije tooltip.

                    // To seveda naredi če kriterij uporablja macbeth in če je trenutno viden tooltip.
                    if(!_self.options.criterion.valueFunction.usingMACBETH || ! $('#macbethIntervalTooltip').tooltipMACBETHInterval('isVisible')){
                        return;
                    }

                    $('#macbethIntervalTooltip').tooltipMACBETHInterval('hide');
                }
            );
            
            // Če se uporablja MACBETH in je dodana nova kategorija jo obarva rdečkasto.
            if(_self.options.criterion.valueFunction.usingMACBETH){
                var macbethCats = Object.keys(_self.options.criterion.valueFunction.MACBETHDifferenceMatrix);
                if(macbethCats.indexOf(newCategoryName) == -1){
                    $(newCategoryDiv).addClass('categorySliderDivUnusedInMacbeth');
                }
            }
            
            $('.categoryImageDiv img:last').on('click', function(event){
                
                $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                    headerText: 'Warning!',
                    contentText: 'Are you sure you want to delete category?',
                    yesAction: function(){
                        // Fukcija proži brisanje kategorije.

                        $(event.target).closest('.categoryDiv').remove();
                    }
                });
            });
        },

        _addAllCategoriesFromComboBox: function(){
            // Metoda doda vse kategorije iz kombo boxa (torej tiste ki obstajajo v variantah) na panel oz. v kriterij.
            var _self = this;

            var allUnaded = $('#cobCategoryName').jqxComboBox('source');

            allUnaded.forEach(function(el){
                _self._addCategoryToPanel(el);
            });
        },

        _saveDataToCriterion: function(){
            var _self = this;

            var categories = _self.getCatogories();
            this.options.criterion.valueFunction.categories = categories;
        },

        _setValueOfSlidersOnValueOfIntervals: function(){
            // Metoda nastavi vrednost sliderjem na vrednosti, ki se nahajajao v criterion.valueFunction.MACBETHIntervals.value...
            var _self = this;

            var sliders = $('.categorySliders');
            for(var i=0; i < sliders.length; i++){

                var slider = $(sliders[i]);
                var categoryName = slider.attr('categoryName');

                if(!_self._categoryIsUsedInMacbeth(categoryName)){
                    continue;
                }

                var value = _self.options.criterion.valueFunction.MACBETHIntervals[categoryName].value;

                var sliderSelector = '#' + slider.attr('id');
                $(sliderSelector).jqxSlider('setValue', value);
            }
        },

        _categoryIsAlreadyAddedToModel: function(categoryName){
            // Metoda vrne true, če je kategorije še dodana v model ali je dodana samo kot slider na panel.
            var _self = this;

            var catNames = Object.keys(_self.options.criterion.valueFunction.categories);

            return catNames.indexOf(categoryName) > -1;
        },

        _getTooltipIntervalForValue: function(value){

            var intervals = this.options.criterion.valueFunction.MACBETHIntervals;

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

        },

        _getMACBETHScaleFromSliders: function(){
            // Iz vrednosti, ki so trenuto v sliderju sestavi MACBETHscale, ki je primeren za ponovni izračun intervalov.
            // Vrnjeni scale ne sme vsebovati kategorij, ki so bile dodane na panel, niso pa bile uporabljene v MACBETHU!
            var _self = this;

            var scale = [];
            var sliders = $('.categorySliders');

            var macbethCategories = Object.keys(_self.options.criterion.valueFunction.MACBETHDifferenceMatrix);
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
        },

        _recalculateIntervals: function(movedCategoryName){
            // Preračuna intervale, glede na trenutno nastavljene sliderje in jih nastavi.
            var _self = this;

            if(!_self.options.criterion.valueFunction.usingMACBETH){
                return;
            }

            var categoryName = $(event.currentTarget).attr('categoryName');
            var scale =_self._getMACBETHScaleFromSliders();
            var differenceMatrix = _self.options.criterion.valueFunction.MACBETHDifferenceMatrix;

            var intervals = MacbethIntervalCalculator.calculateIntervalsFor(scale, differenceMatrix, movedCategoryName);

            _self.options.criterion.valueFunction.MACBETHIntervals = intervals;
            _self._setValueOfSlidersOnValueOfIntervals();

            _self._disableAllBoundedSliders();
        },

        _disableAllBoundedSliders: function(){
            // Metoda onemogoči vse sliderje, katerih interval ima enako vrednosti upper in lower bound-a.
            var _self = this;

            var sliders = $('.categorySliders');
            for(var i = 0; i < sliders.length; i++){
                var slider = $(sliders[i]);

                var catName = slider.attr('categoryName');

                slider.jqxSlider('enable');

                var interval = _self.options.criterion.valueFunction.MACBETHIntervals[catName];
                if(typeof(interval) === 'undefined'){
                    continue;
                }

                if(interval.interval.upperBound == interval.interval.lowerBound){
                    slider.jqxSlider('disable');
                }

            }
        },

        _categoryIsUsedInMacbeth: function(categoryName){
            // Metoda vrne boolean vrednost, ki pove ali je bila kategorija že uporabljena v MACBETHU.
            // Kategorija je bila uporabljena v MACBETHU če ima kriterij podatek o njenem intervalu.
            var _self = this;

            if(!_self.options.criterion.valueFunction.usingMACBETH){
                return false;
            }

            var macbethCategories = Object.keys(_self.options.criterion.valueFunction.MACBETHDifferenceMatrix);

            return macbethCategories.indexOf(categoryName) > -1;
        }, 

        popupMACBETHDialog: function(){
            // Funkcija prikaže MACBETH dialog. Ob prikazu se shranijo tudi vse trenutno vnešena kategorije. (zaradi konsistentnosti z MACBETH podatki)
            var _self = this;

            if(typeof(this.options.criterion) == 'undefined'){
                return;
            }

            _self._saveDataToCriterion();

            $('#dialogMACBETH').DialogMACBETHH({
                onClose: function(){
                    _self._setValueOfSlidersOnValueOfIntervals();

                    // Vsem kategorijam, ki so bile neuporabljene v MACBETHU (in so bile obarvane rdeče) sedaj odstran barvo...
                    $('.categorySliderDivUnusedInMacbeth').removeClass('categorySliderDivUnusedInMacbeth');

                    _self._disableAllBoundedSliders();
                }
            });
            $('#dialogMACBETH').DialogMACBETHH('open', this.options.criterion);
        }
    });
})(jQuery);


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
                        _self._checkIfEmptyCell(macData);

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
                    $('#btnDeleteMacbethData').jqxTooltip({content: "Clear all MACBETH data.", animationShowDelay: 1000});
                    $('#btnDeleteMacbethData').on('click', function(){

                        $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                            contentText: "All macbeth data will be lost. Do you wnat to proceed?",
                            yesAction: function(){

                                model.resetMacbethDataToCriterion(_self.options.criterion);

                                _self._refreshDialog();
                            }
                        });
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

        _checkIfEmptyCell: function(macbethData){
            // Metoda preveri, če obstajajo prazni vnosi. (zaenkrati jih še ne dopušča)

            var result = false;

            var rowCatNames = Object.keys(macbethData);
            for(var i=0; i < rowCatNames.length; i++){
                var rowCat = rowCatNames[i];

                for(var j=i+1; j < rowCatNames.length; j++){
                    var colCat = rowCatNames[j];

                    if(typeof(macbethData[rowCat][colCat]) == 'undefined' ){
                        $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                            contentText: "All cells in grid must be filled!",
                            onlyYes: true
                        });
                        throw "Nepopolno izpolnjen MACBETH grid."
                    }
                }
            }
        },

        getCurrentCriterion: function(){
            var _self = this;

            return _self.options.criterion;
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
        },

        get_MCDate: function(){

            return this._MCData;
        },

        changeSelectedCellValue: function(value){
            // Metoda v gridu nastavi izbrani celici podano vrednost. In spremeni MCData model.

            var selectedCell = $(this.gridDivID).jqxGrid('selectedCell');
            
            if(selectedCell == null){
                return;
            }

            var rowIndex = selectedCell.rowindex;
            var dataField = selectedCell.datafield;

            $(this.gridDivID).jqxGrid('setcellValue', rowIndex, dataField, value);
        },

        getSelectedCellValue: function(){
            // Metoda v gridu nastavi izbrani celici podano vrednost.

            var selectedCell = $(this.gridDivID).jqxGrid('selectedCell');
            
            return selectedCell.value;
        },

        isNowSelected: function(){

            return $(this.gridDivID).jqxGrid('getselectedcell') != null;
        },

        getJqxGrid: function(){

            return $(this.gridDivID).jqxGrid();
        },

        getMACBETHDataFromGrid: function(){
            // Metoda naredi MCData iz podatkov, ki so vstavljeni v Grid.

            // MR1: ZAKAJ SE PRI ZAMENJAVI VRSTIC TA METODA KLIČE VEČKRAT NI V REDUUU. (vrstic se itak več ne da zamenjat...)
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
                    //
                    rowData[el2] = el[el2];
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
            //MR1: ERROR V CONSOLI OB ZAMENJAVI STOLPCA, čeprav vse zgleda in deluje normalno...
            $(this.gridDivID).jqxGrid(
            {
                width: _self.options.width,
                height: _self.options.height,
                source: dataAdapter,
                editable: false,
                columnsresize: false,
                columnsreorder: true,
                selectionmode: 'singlecell',
                columns: _self._columns,
                scrollmode: 'logical'
            });

            // Obnašanje ob kliku na celico.
            $(this.gridDivID).on('cellclick', function (event) {

                var colIndx = event.args.columnindex - 1;
                var rowIndx = event.args.rowindex;
                
                // Kadar se zgodi klik na onemogočeno celico se ne zgodi nič.
                if(colIndx <= rowIndx){
                    return;
                }

                // Nastavitev naslovnega texte (opt1 - opt3)
                $('#MCFirstOption').html(_self.options.criterionOptions[rowIndx]);
                $('#MCSecondOption').html(_self.options.criterionOptions[colIndx]);
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

            var cellClassAppender = function(rowIndx, colName, neki, neki2, neki3){
                // Fukcija vrne razred, ki obarva celico na sivo. To naredi za celice, ki so pod in na diagoanli.

                var resultClasses = "";

                var colIndx = _self.options.criterionOptions.indexOf(colName);

                if(colIndx == -1){
                    throw "Napaka: imena stolpcev in vrednosti v criterionOptions se ne ujemajo!";
                }

                // Razred dodeli samo tistim pod in v diagonali.
                if(colIndx <= rowIndx){
                    resultClasses += 'MCUnderDiagonalCell'
                }

                return resultClasses;
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
                    MCSubData[alaStolpec] = '';

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

        // MACBETH - IZRAČUNAVANJE

        sumnikiMapReverse: {},
        sumnikiMapSplx: {},

        calculateMacbethValuesFromCriteiron: function(){
            // Metoda izračuna in vrne vrednosti kategorij iz podatkov MACBETH, ki so v kriteriju.

            var _self = this;
            // JSLP mora dobiti malo obrnjene omejitve (neenačbe).
            // - na desni so samo konstane.
            // - izraz mora biti poenostavljen.
            // - PAZI ne sme biti šumnikov!

            _self.sumnikiMapReverse = {};
            _self.sumnikiMapSplx = {};

            var criterion = $('#dialogMACBETH').DialogMACBETHH('getCurrentCriterion');

            var macData = model.getCriteria(criterion.name).valueFunction.MACBETHData;
            var macOptions = model.getCriteria(criterion.name).valueFunction.MACBETHOptions;
            var bestCategory = macOptions[0];
            var worstCategory = macOptions[macOptions.length-1];

            var mappedMacbethMatrix = _self._mapDifferences(macData);
            var constraintsMatrix = _self._createConstraintMatrixFrom(mappedMacbethMatrix);

            // Preslikava imen zaradi šumnikov, imen z presledki in posebnmimi znaki.. (x * y)

            constraintsMatrix = _self._mapSumniki(macOptions, constraintsMatrix);
            bestCategory = _self.sumnikiMapReverse[bestCategory];
            worstCategory = _self.sumnikiMapReverse[worstCategory];

            var matrixForSimplex = _self._constraintsMatrixToMatrixForSimplex(constraintsMatrix, bestCategory, worstCategory);
            var basicScale;
            try{
                basicScale = _self._solveSimplex(matrixForSimplex);
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

            basicScale = _self._mapSumnikiBack(basicScale);

            var macbethTransformedScale = _self._transformBasciScale(basicScale);
            
            // Pridobitev intervalov kategorij.
            var intervals = MacbethIntervalCalculator.calculateIntervalsFor(macbethTransformedScale, mappedMacbethMatrix);

            // Kadar je v panelu dodana kaka kategorije več, pride do tega, da ji ni bil dodeljen noben interval (redko ... če sta dve na novo dodani, in če niso vnešeni novi podatki v macbeth grid...)
            // Zato tukaj tistim kategorijam, ki niso dobile intervala doda interval od 0 do 0.
            // Zadeva se bo mogoče kasneje sama uredila, ko bom v macbeth implementiral še prazne vrednosti...
            macOptions.forEach(function(el, indx){
                if(!intervals.hasOwnProperty(el)){
                    
                    intervals[el] = {
                        interval: {upperBound: 0, lowerBound: 0},
                        value: 0
                    };
                }
            });

            return {
                intervalResults: intervals,
                MACBETHScale: macbethTransformedScale,
                MACBETHDifferenceMatrix: mappedMacbethMatrix,
                validResult: true
            }
        },

        _mapDifferences: function(macData){
            // Metoda mapira macbeth matriko razlik v matriko številčnih vrednosti, ki predstavljajo razliko (njeno moč).
            var _self = this;

            var mapDiff = {};

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
        },

        _createConstraintMatrixFrom: function(mapedMatrix){
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
            var constraintsMatrix = [];
            sortedMatrix.forEach(function(el, indx){

                var str = ""
                
                if(el.val > 0){
                    str = el.x + " >= " + el.y + " + " + el.val;
                }
                else if(el.val == 0){
                    str = el.x + " = " + el.y;
                }

                constraintsMatrix.push(str);
            });

            // Potem naredi omejitve tipa 3: Za vse četvorke x,y,z,w, kjer velja x-y > z-w, dodamo omejitev: v(x)-v(y) >= v(z)-v(w) + (x-y)-(z-w). 
            for(var i = 0; i < sortedMatrix.length; i++){

                var xy = sortedMatrix[i];
                for(var j = i + 1; j < sortedMatrix.length; j++){

                    var zw = sortedMatrix[j];
                    if(xy.val > zw.val){
                        var str = xy.x + ' - ' + xy.y + ' >= ' + zw.x + ' - ' + zw.y + ' + ' + xy.val + ' - ' + zw.val
                        constraintsMatrix.push(str);
                    }
                }
            }

            return constraintsMatrix;
        },

        _constraintsMatrixToMatrixForSimplex: function(constraintsMatrix, bestCategory, worstCategory){
            // Metoda spremeni (preoblikuje) podno metriko omejitev.
            // Omejitve so primerne za uporabo SIMPLEX algoritma (v JSLPSolver-ju).
            var _self = this;

            var matrixForSimplex = [];

            var matrixForSimplex = ["min: " + bestCategory];
            constraintsMatrix.forEach(function(el, indx){

                var newLine = "";

                var splitedConstraint = el.split(">=");
                // Kadar gre za omejitve tipa 2 je omejitev velja v(x) = v(y) kar tukaj spremeni v v(x) - v(y) = 0.
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

                        var expression = algebra.parse(left + "-" + toLeft);
                        left = expression.toString();

                        newLine = left + " >= " + toRight;
                    }
                }
                
                matrixForSimplex.push(newLine);
            });

            matrixForSimplex.push(worstCategory + " = 0");

            return matrixForSimplex;
        },

        _solveSimplex: function(simplexMatrix){
            var _self = this;

            var model = solver.ReformatLP(simplexMatrix);
            
            var result = solver.Solve(model, null, true);

            if(!result.feasible){
                $('#dialogYesNoMessage').messageYesNoDialog('openWith',{
                    headerText: 'Warning!',
                    contentText: 'MACBETH grid is not valid!',
                    onlyYes: true
                });
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
        },

        _transformBasciScale: function(basicScale){
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
        },

        _mapSumniki: function(macOptions, constraintsMatrix){
            // Simplex solver ne more prejeti šumnikov, zato se mapira vrednosti.
            var _self = this;

            for(var i = 0; i < macOptions.length; i++){
                var option = macOptions[i];

                var codeName = "x" + i;

                _self.sumnikiMapSplx[codeName] = option;
                _self.sumnikiMapReverse[option] = codeName;

                // Preimenovanje v matrki za simplex
                for(var j = 0; j < constraintsMatrix.length; j++){

                    while(constraintsMatrix[j].indexOf(option) != -1){
                        constraintsMatrix[j] = constraintsMatrix[j].replace(option , codeName);
                    }
                }
            }

            return constraintsMatrix;
        },

        _mapSumnikiBack: function(basicScale){
            var _self = this;

            for(var i=0; i < basicScale.length; i++){

                basicScale[i].name = _self.sumnikiMapSplx[basicScale[i].name];
            }

            return basicScale;
        }
    });
})(jQuery);



//////////////////////////////////
//////    MACHBET - Izračun intervalov
//////////////////////////////////


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

    this.exprStringFor = function(categoryName, categoryNameValFor, basicScale){

        if(categoryName == categoryNameValFor){
            return categoryName;

        }

        return parseFloat(basicScale[categoryNameValFor]).myRound(2);
    }

    this.getIntervalsWith = function(categoryName, basicScale){
        // Pridobi vse intervale v basicScale-u, ki so v povezavi z kategorijo. 
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
        // V x,y,w,z € S with (x,y) € Ci and (w,z) € C,:
        //   i > j => o(x) - o(y) > o(w) - o(z)
        // Torej: vsi kvadratki v matriki (w,z), ki imajo manjšo vrednost od kvadratka (x,y) -> razlika med vrednosjo razlik basicScale(x) - basicScale(y)
        // mora biti večja od razlike basicScale(w) - basicScale(z)

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

            // Razlika, ki jo je uporabnik dodelil med ti dve kategoriji (številska).
            var macbethDifference = macbethMatrix[interval.upperElement][interval.lowerElement];

            // Pari, ki jim je uporabnik dodelil večjo vrednost kot trenutnemo paru (na intervalu).
            var uppers = getUpperPairs(macbethMatrix, macbethDifference);
            // Pari, ki jim je uporabnik dodelil manjšo vrednost kot trenutnemo paru (na intervalu).
            var lowers = getLowerPairs(macbethMatrix, macbethDifference);

            var el1 = exprStringFor(categoryName, interval.upperElement, basicScaleObject);
            var el2 = exprStringFor(categoryName, interval.lowerElement, basicScaleObject);
            //Pridobi izraze z pari, ki jim je uporabnik dodelil manjšo razliko.
            var expressionLeftPart = el1 + " - " + el2 + " = "
            for(var j = 0; j < lowers.length; j++){
                var lower = lowers[j];

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

                // Če je kategorija za katero se izše interval se na njenih mestih ne pojavi številka ampak ime kot spremenljivka.
                var el3 = exprStringFor(categoryName, upper.name1, basicScaleObject);
                var el4 = exprStringFor(categoryName, upper.name2, basicScaleObject);

                var exp = el3 + " - " + el4 + expressionRightPart;

                expressions.push(exp);
            }
        }

        return expressions;
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
                // console.log(expression);
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


//////////////////////////////////
//////      DIALOG WEIGHTS
//////////////////////////////////

(function( $ ){

    $.widget("myWidget.DialogWeights", {

        options: {
            width: 600,
            height: 480,
        },

        criterion: {},

        _create: function(){
            var _self = this;

            var dialogWeHeight = 500;
            var dialogWeWidth = 450;
            $("#dialogWeight").jqxWindow({
                height: dialogWeHeight,
                width: dialogWeWidth,
                resizable: false,
                isModal: true,
                autoOpen: false,
                draggable: true,
                position: 'center',
                initContent: function(){

                    $('#btnSaveWeight').jqxButton({width:55});
                    $('#btnSaveWeight').on('click', function(){

                        // Shrani podatke, ki jih je vnesel uporabnik.
                        $('#weightsPanel').weightsPanel('save');

                        // Preračuna normalizirane uteži.
                        // Prvo preračuna na nivoju levela. (Na vozliščih, ki jim je uporabnik nastavljal uteži)
                        // Potem pa končno utež za analizo na celotnem poddreveseu vozlišča.
                        model.normalizeLevelWeightsOnNode(_self.criterion);
                        model.normalizeFinalWeightRecursivelyOnChildrenOf(_self.criterion);

                        $('#dialogWeight').jqxWindow('close');
                    });

                    $('#btnCloseWeight').jqxButton({width:55});
                    $('#btnCloseWeight').on('click', function(){
                         $('#dialogWeight').jqxWindow('close');
                    });
                },
            });
        },

        open: function(criterion){
            var _self = this;

            _self.criterion = criterion;

            _self._refreshDialog();

            $("#dialogWeight").jqxWindow('open');
        },

        close: function(){
            // Resetiranje gradnikov.
     
            $('#dialogMACBETH').jqxWindow('close');
        },

        _refreshDialog: function(){
            var _self = this;

            $('#weightsPanelLayoutDiv').html('');
            
            var criteria = _self.getAllCireteriaUnder(_self.criterion);
            

            $('#weightsPanel').weightsPanel({
                panelSource: criteria
            });
            $('#weightsPanel').weightsPanel('refresh');
        },

        getAllCireteriaUnder: function(node){
            // Metoda pridobi vozlišča, ki jih v podanem vozlišču utežujemo. 

            var _self = this;

            if(typeof(node.children) == 'undefined'){

                $('#dialogYesNoMessage').messageYesNoDialog('openWith', {
                    contentText: "Node doesn't contain any children!",
                    onlyYes: true,
                    yesAction: function(){}
                })

                throw 'Vozlišče ' + node.name + ' nima otrok!';
            }

            var panelSource = [];
            var criteriaForWieghting = _self.criterion.children;
            criteriaForWieghting.forEach(function(el, indx){
                panelSource.push({
                    weightedCriteria: el
                });
            });
            return panelSource;
        },
    });
})(jQuery);


//////////////////////////////////
//////    WEIGHTS PANEL
//////////////////////////////////

(function( $ ){

    $.widget('myWidget.weightsPanel', {

        options: {
            panelSource: []
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
            $('#weightsPanelLayoutDiv').html('');

            for(var i = 0; i < this.options.panelSource.length; i++){
                var obj = this.options.panelSource[i];

                if(typeof(obj.weightedCriteria.userWeight) == 'undefined'){
                    obj.weightedCriteria.userWeight = 0;
                }

                var pnlContent = "" + 
                    "<div class='weightsPanelContent'>" +
                    "<div class='weightPanelName'>" +
                        "<div class='weightedCriteriaText'>Criterion:</div>" +
                        "<div class='weightedNodeText'>N: " + this._abbreviateForName(obj.weightedCriteria.name) + "</div>" +
                    "</div>" +
                    "<div class='weightPanelSwing'>" +
                    "</div>" +
                    "<div class='weightPanelWeight'>" +
                            obj.weightedCriteria.userWeight +
                    "</div>" +
                    "<div class='weightPanelSliderHolder slider-demo-slider-container'>" +
                        "<div class='weightSlider' class='weightPanelSlider'></div>" +
                    "</div>" +
                    "</div>" +
                    "</div>";

                    $('#weightsPanelLayoutDiv').append(pnlContent);
            }

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
                textDiv.html(val);
            });
        },

        _abbreviateForName: function(str){
            if(str.length > 8)
            {
                str = $.trim(str.substring(0, 6)) + "."
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
                headerText: "Warning",
                contentText: "",
                onlyYes: false,
                yesButtonText: "OK",
                noButtonText: "No",
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
                        width: 55,
                    });
                    $('#btnSaveModelNo').jqxButton({
                        width: 55,
                    });
                    $("#tfModelName").jqxInput({height: 19, width: 250});

                    $('#formSaveModel').jqxValidator({
                        rules: [
                            { input: '#tfModelName', message: 'Field is required!', action: 'keyup, blur', rule: 'required' }
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

