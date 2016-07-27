/*
THIS PRODUCT CONTAINS RESTRICTED MATERIALS OF IBM
COPYRIGHT International Business Machines Corp., 2016
All Rights Reserved * Licensed Materials - Property of IBM
US Government Users Restricted Rights - Use, duplication or disclosure
restricted by GSA ADP Schedule Contract with IBM Corp.
*/

var vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var http = require('http');
var child_process = require('child_process');

// Constants for the extension
const extensionId = "apiconnecttools";
const extensionVendor = "IBM"; 

// Constants for the type definition file
const typingsDirectory = "typings";
const loopbackTypingDirectoryName = "apiconnect";
const typeDefinitionFileName = "apiConnect.d.ts";

// Constants for the API Connect Tools preferences
const vsCodeSettingsDirectory = ".vscode";
const apiConnectSettingsFileName = "apiconnect.json";

// Constants for vscode settings files
const vscodeSettingsFileName = "settings.json";
const jsConfigFileName = "jsconfig.json"

// Constants for the API Connect node module
const apiConnectModuleName = "apiconnect";
const strongloopModuleName = "strongloop"; // Used for backward compatibility
const loopbackModuleName = "loopback";
const loopbackPath = "node_modules/loopback"
const loopbackDocumentationJSON = "docs.json";

// Constant for checking if the loopback application was generated
const onCreateFile = "**/" + loopbackPath + "/" + loopbackDocumentationJSON;

const leaveBlankMsg = "Leave blank for no options";

// Constants for JSON schemas
var schemasDirectoryName = "schemas";
var jsonSchemaFileName = "apiconnect.json";

// Product installation found
// 0: none
// 1: apiConnect
// 2: strongloop
var productInstallationFound = 0;

// Constant for API Connect commands
const apiconnectCommand = ["","apic ","slc "];
const apiconnectDesigner = ["","edit","arc"];

// apic has moved 'loopback:model' and 'loopback:datasource' into the 'create' command
const apiconnectLoopbackCommands = [[],
['acl','boot-script','export-api-def','middleware','property','refresh','relation','remote-method','swagger'],
['acl','boot-script','datasource','export-api-def','middleware','model','property','refresh','relation','remote-method','swagger'] ]

const noInstallMsg = "This command is only supported if API Connect is installed";

// Constant for installation instructions
const apiConnectInstallationInstructionsURL = 'https://developer.ibm.com/apiconnect/getting-started/';

function activate(context) {    
    var outputChannel = vscode.window.createOutputChannel('apiconnect');

    initialize();
    registerAllCommands();

    // Add a file system listener to check if a loopback application is created after
    // the workspace has loaded (e.g. calling loopback:app)
    var watcher = vscode.workspace.createFileSystemWatcher(onCreateFile);
    watcher.ignoreChangeEvents = true;    
    watcher.onDidCreate(function(e){
        var persistedSettings = getPersistedSettings();
        handleIntellisense(persistedSettings);                
    })

    /**
     * Extension initialization 
     */
    function initialize() {
        var persistedSettings = getPersistedSettings();
        productInstallationFound = persistedSettings['productInstallationFound'];
        if(!persistedSettings.skipInstallationCheck && productInstallationFound != 1) {
            checkAPIConnectInstallation(null, true);
        }
        
        handleIntellisense(persistedSettings);
    }

    function getPersistedSettings() {
        var merged = {};
                
        // Get global settings
        var extension = vscode.extensions.getExtension(extensionVendor + '.' + extensionId);
        var global = retrieveJSON(extension.extensionPath + '/' + apiConnectSettingsFileName);   
        for (var property in global) {
            if(global.hasOwnProperty(property)) {
                merged[property] = global[property];
            }
        }

        // Get workspace level settings        
        var local = retrieveJSON(vscode.workspace.rootPath + '/' + vsCodeSettingsDirectory + '/' + apiConnectSettingsFileName);
        for (var property in local) {
            if(local.hasOwnProperty(property)) {
                merged[property] = local[property];
            }
        }

        return merged;
    }

    function handleIntellisense(persistedSettings){
        if(persistedSettings != null && !persistedSettings.skipTypeDefinitionCheck) {
            if(isLoopbackPresent() && (!isTypeDefinitionPresent() || !isTypeJSONSchemaPresent())) {
                var selection = vscode.window.showInformationMessage("Would you like to add intellisense support for API Connect artifacts on this project?", 'No, and don\'t ask again', 'Yes');
                selection.then(function(value) {
                    if(value == 'Yes') {                    
                        addContentAssistSupport();
                    } else if(value == 'No, and don\'t ask again') {
                        persistPreference('skipTypeDefinitionCheck', true);
                    }
                });
            }
        }          
    }
    
    /**
     * Register all the API Connect Tools commands
     */
    function registerAllCommands() {
        var disposable = vscode.commands.registerCommand('apiconnect.check_installation', checkAPIConnectInstallation);	
        context.subscriptions.push(disposable);
        
        disposable = vscode.commands.registerCommand('apiconnect.addContentAssistSupport', addContentAssistSupport);	
        context.subscriptions.push(disposable);

        disposable = vscode.commands.registerCommand('apiconnect.edit', cmdEdit);	
        context.subscriptions.push(disposable);
        
        disposable = vscode.commands.registerCommand('apiconnect.create', cmdCreate);	
        context.subscriptions.push(disposable);        
        
        disposable = vscode.commands.registerCommand('apiconnect.runInTerminal', cmdRunInTerminal);	
        context.subscriptions.push(disposable);
        
        disposable = vscode.commands.registerCommand('apiconnect.loopback', cmdLoopback);	
        context.subscriptions.push(disposable);        
        
        disposable = vscode.commands.registerCommand('apiconnect.loopbackCmd', cmdLoopbackCmd);	
        context.subscriptions.push(disposable);         
        
        disposable = vscode.commands.registerCommand('apiconnect.startLocal', cmdStartLocal);	
        context.subscriptions.push(disposable);
        
        disposable = vscode.commands.registerCommand('apiconnect.launchWebServer', cmdLaunchWebServer);	
        context.subscriptions.push(disposable);
        
        disposable = vscode.commands.registerCommand('apiconnect.launchRestAPI', cmdRESTAPI);	
        context.subscriptions.push(disposable);
    }
    
    function cmdEdit(){
        if (productInstallationFound == 0){
            vscode.window.showInformationMessage(noInstallMsg);
            return;
        }        
        
        var cmd = apiconnectCommand[productInstallationFound] + apiconnectDesigner[productInstallationFound];
        openTerminalWithInput('',cmd,'Enter graphical API designer options',leaveBlankMsg);
    }
    
    function cmdCreate(){
        if (productInstallationFound == 1){
            vscode.window.showQuickPick(['api','product','model','datasource']).then(function (val){
                if (val == undefined){
                    return;
                }
                
                var cmd = apiconnectCommand[productInstallationFound] + 'create --type ' + val;            
                openTerminalWithInput('',cmd,'Enter command options',leaveBlankMsg);
            });
        }
        else {
            vscode.window.showInformationMessage(noInstallMsg);
        }
    }
    
    function cmdRunInTerminal(){
        if (productInstallationFound == 0){
            vscode.window.showInformationMessage(noInstallMsg);
            return;
        }        
        
        openTerminalWithInput('',apiconnectCommand[productInstallationFound],'Enter the API Connect command','command');
    }
    
    function cmdStartLocal(){
        // The terminal (depending on the OS) will be launched. There is no need to display a message to the 
        // user in the console, as this is not a long running process to launch the terminal
        
        // Note: "cwd" is an option, which allows you to specify a working directory. 
        // Loopback does not allow you to set the directory as an option (it uses the current directory),
        // so using "cwd" makes the code generate in the folder that Visual Studio Code is currently in.
            
        // If the user has chosen a folder, then run loopback in that directory. Otherwise, the directory
        // where Visual Studio Code is installed will be used as the default root directory
        var workspaceFolder = vscode.workspace.rootPath;    
        
        var options = {};
        
        if (workspaceFolder != null){
            options = { cwd: vscode.workspace.rootPath};
        }    
        require("run-in-terminal").runInTerminal('node .',[],options);  
    }
   
    function cmdLoopback(){
        if (productInstallationFound == 0){
            vscode.window.showInformationMessage(noInstallMsg);
            return;
        }        
        
        var cmd = apiconnectCommand[productInstallationFound] + 'loopback';            
        openTerminalWithInput('',cmd,'Enter Loopback application creation options',leaveBlankMsg);
    }   
   
    function cmdLoopbackCmd(){        
        if (productInstallationFound == 0){
            vscode.window.showInformationMessage(noInstallMsg);
            return;
        }
        
        vscode.window.showQuickPick(apiconnectLoopbackCommands[productInstallationFound]).then(function (val){
            if (val == undefined){
                return;
            }
                        
            var cmd = apiconnectCommand[productInstallationFound] + 'loopback:' + val;            
            openTerminalWithInput('',cmd,'Enter Loopback command options',leaveBlankMsg);
        });
    } 
    
    function cmdLaunchWebServer(){
        if (productInstallationFound == 0){
            vscode.window.showInformationMessage(noInstallMsg);
            return;
        }        
        
        cmdLaunchWebBrowserFromConfigJSON('');
    }

    function cmdRESTAPI(){
        if (productInstallationFound == 0){
            vscode.window.showInformationMessage(noInstallMsg);
            return;
        }        
        
        cmdLaunchWebBrowserFromConfigJSON('/explorer');
    }

    function cmdLaunchWebBrowserFromConfigJSON(pathName){
        var configFile = vscode.workspace.rootPath + path.sep + 'server' + path.sep + 'config.json';
        var jsonFile = retrieveJSON(configFile);
        if (jsonFile != null){
            var port = jsonFile['port'];
            var host = jsonFile['host'];

            if (port != null && host != null){
                launchWebBrowser(jsonFile['host'], jsonFile['port'], pathName);
            }
        }
        else {
            vscode.window.showErrorMessage('Could not load ' + configFile);
        }
    }    
    
    // Launches the default web browser
    function launchWebBrowser(hostName, portNum, path){
        // Special case the 0.0.0.0 or localhost case. It can be one or the other depending on the OS.
        // By default, the generated loopback will have host of 0.0.0.0. On windows, the URL to visit is
        // localhost.
        
        // Reference: https://www.npmjs.com/package/openurl
        if (hostName == '0.0.0.0'){
            var req = http.request({method: 'HEAD', host : hostName, port : portNum, path : path}, function(req){
                require('openurl').open('http://' + hostName + ':' + portNum + path);
            });
            req.on('error', function(err){
                require('openurl').open('http://localhost:' + portNum + path);
            });
            req.end();        
        }
        else {
            require('openurl').open('http://' + hostName + ':' + portNum + path);
        }
    }    
      
    function openTerminalWithInput(outputText, cmd, promptText, promptPlaceHolderText){
        if (outputText != null && outputText != ""){
            outputCmdRunningMessage(outputText + "\n", outputChannel);
        }
        
        // The terminal (depending on the OS) will be launched. There is no need to display a message to the 
        // user in the console, as this is not a long running process to launch the terminal
        
        // Note: "cwd" is an option, which allows you to specify a working directory. 
        // Loopback does not allow you to set the directory as an option (it uses the current directory),
        // so using "cwd" makes the code generate in the folder that Visual Studio Code is currently in.
            
        var workspaceFolder = vscode.workspace.rootPath;
        
        if (workspaceFolder == null){
            vscode.window.showInformationMessage('Command cannot be executed because a folder was not selected. Open a folder in Visual Studio Code to run this command');
            return;
        }    
        
        var options = {};
        
        if (workspaceFolder != null){
            options = { cwd: vscode.workspace.rootPath};
        }    
        
        // Prompt if the promptText and placeHolderText is not null
        if (promptText != null && promptPlaceHolderText != null){
            var inputBoxOptions = {prompt: promptText, placeHolder: promptPlaceHolderText};
            
            vscode.window.showInputBox(inputBoxOptions).then(function(value){
                var cmdValue = value;
                if (cmdValue == null || cmdValue == undefined){
                    cmdValue = "";
                }
                
                var cmdTmp = cmd;
                if (cmd == null || cmd.length == 0){
                    cmdTmp = '';
                }
                else {
                    cmdTmp = cmd + ' ';
                }
                require("run-in-terminal").runInTerminal(cmdTmp + cmdValue,[],options);       
            });
        }
        else {
            require("run-in-terminal").runInTerminal(cmd,[],options);
        }
    }
    
    // Displays a message for the cmd that is running
    function outputCmdRunningMessage(msg){
        if (outputChannel != null && msg != null){
            outputChannel.show();      
            outputChannel.appendLine(msg);
        }
    }   
    
    function addJSONSchema() {
        try {            
            checkOrCreateDirectory(vscode.workspace.rootPath + '/' + schemasDirectoryName);
            var extension = vscode.extensions.getExtension(extensionVendor + '.' + extensionId);
            fs.createReadStream(extension.extensionPath + '/' + schemasDirectoryName + '/' + jsonSchemaFileName).pipe(fs.createWriteStream((vscode.workspace.rootPath + '/' + schemasDirectoryName + '/' + jsonSchemaFileName)));
            return true;
        } catch(error) {
            console.log(error);
            return false;
        }
    }

    function associateJSONSchema() {
        var association = '{"fileMatch": ["*/models/*.json"], "url": "/' + schemasDirectoryName + '/' + jsonSchemaFileName + '"}';
        var filePath = vscode.workspace.rootPath + '/' + vsCodeSettingsDirectory + '/' + vscodeSettingsFileName;
        var settings = null;
        try {
            settings = fs.readFileSync(filePath, "utf-8");
        } catch(error) {
            settings = '{}';
        }
        if(settings.lastIndexOf(association) == -1) {
            var jsonSchemasIndex = settings.indexOf('"json.schemas"');
            if(jsonSchemasIndex != -1) {
                var openSquareBraketIndex = settings.indexOf('[', jsonSchemasIndex + jsonSchemasIndex.length);
                settings = settings.substring(0, openSquareBraketIndex + 1) + '\n       ' + association + '\n' + settings.substring(openSquareBraketIndex + 1);
            } else {
                var closingBraketIndex = settings.lastIndexOf('}');
                settings = settings.substring(0, closingBraketIndex) + '\n   "json.schemas":[\n      ' + association + '\n   ]\n' + settings.substring(closingBraketIndex);
            }
            try {
                // In the recent version of VS Code, the .vscode directory is not created by default,
                // so the directory needs to be created in case it does not exist
                checkOrCreateDirectory(vscode.workspace.rootPath + '/' + vsCodeSettingsDirectory);
                fs.writeFileSync(filePath, settings);
                return true;
            } catch(error) {
                return false;
            }
        } else {
            return true;
        }
    }

    function handleJsonSchemasAdditionAndAssociation() {
        if(addJSONSchema()) {
            if(associateJSONSchema()) {
                return true;
            } else {
                vscode.window.showErrorMessage('Could not create json file association');
            }
        } else {
            vscode.window.showErrorMessage('Could not create json schema file');
        }
        return false;
    }  
    
    function addContentAssistSupport() {
        if(generateTypeDefinition() && handleJsonSchemasAdditionAndAssociation()) {
            vscode.window.showInformationMessage('Intellisense support successfully added. The window must be realoaded for changes to take effect.', 'Reload window').then(function(selection) {
                if(selection == 'Reload window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    }

    function isLoopbackPresent() {
        try {
            fs.lstatSync(vscode.workspace.rootPath + '/node_modules/' + loopbackModuleName + '/package.json');
            return true;
        } catch(error) {
            return false;
        }
    }
    
    function isTypeDefinitionPresent() {
        try {
            fs.lstatSync(vscode.workspace.rootPath + '/' + typingsDirectory + '/' + loopbackTypingDirectoryName + '/' + typeDefinitionFileName);
            return true;
        } catch(error) {
            return false;
        }
    }
    
    function isTypeJSONSchemaPresent() {
        try {
            fs.lstatSync(vscode.workspace.rootPath + '/' + schemasDirectoryName + '/' + jsonSchemaFileName);
            return true;
        } catch(error) {
            return false;
        }
    }
    
    function checkOrCreateDirectory(directory) {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
    }
    
    function retrieveJSON(filePath) {
        try {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        } catch(error) {
            return {};
        }
    }
    
    function persistPreference(key, value, global) {
        var filePath = null;
        if(global) {
            var extension = vscode.extensions.getExtension(extensionVendor + '.' + extensionId);
            filePath = extension.extensionPath + '/' + apiConnectSettingsFileName;
        } else if(vscode.workspace.rootPath) {
            var directoryPath = vscode.workspace.rootPath + '/' + vsCodeSettingsDirectory;
            checkOrCreateDirectory(directoryPath);
            filePath = directoryPath + '/' + apiConnectSettingsFileName;
        }        
        if(filePath) {
            var persistedSettings = retrieveJSON(filePath);
            persistedSettings[key] = value;
            try {
                fs.writeFileSync(filePath, JSON.stringify(persistedSettings, null, 3));
            } catch(error) {
                vscode.window.showErrorMessage('Could not persist preference.');
                console.log(error);
            }
        }
    }
    
    function checkJSConfigFile() {
        var filePath = vscode.workspace.rootPath + '/' + jsConfigFileName;
        var jsConfigFile = retrieveJSON(filePath);
        jsConfigFile.compilerOptions = jsConfigFile.compilerOptions || {};
        jsConfigFile.compilerOptions.module = 'commonjs';
        try {
            fs.writeFileSync(filePath, JSON.stringify(jsConfigFile, null, 3));
            return true;
        } catch(error) {
            vscode.window.showErrorMessage('Could not generate JavaScript configuration file.');
            console.log(error);
            return false;
        }
    }
    
    function performInstallationCheck(callback) {
        child_process.exec('npm list ' + apiConnectModuleName + ' -g --depth=0', (err, stdout, stderr) => {
            var output = stdout.toString();
            var index = output.indexOf(apiConnectModuleName);
            if(index != -1) {
                productInstallationFound = 1;
                callback(output.substring(index + apiConnectModuleName.length + 1, output.indexOf('\n', index + apiConnectModuleName.length)));
            } else {
                child_process.exec('npm list ' + strongloopModuleName + ' -g --depth=0', (err, stdout, stderr) => {
                    var output = stdout.toString();
                    var index = output.indexOf(strongloopModuleName);
                    if(index != -1) {
                        productInstallationFound = 2;
                        callback(output.substring(index + strongloopModuleName.length + 1, output.indexOf('\n', index + strongloopModuleName.length)));
                    } else {
                        productInstallationFound = 0;
                        callback(null);
                    }
                });
            }
        });
    }
    
    function checkAPIConnectInstallation(context, checkDoneOnStartup) {
        var statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = "Checking API Connect installation...";
        statusBarItem.show();
        performInstallationCheck((version) => {
            statusBarItem.dispose();
            switch(productInstallationFound) {
                case 0:
                    var items = ['API Connect is not installed, please visit ' + apiConnectInstallationInstructionsURL + ' for installation instructions.'];
                    if(checkDoneOnStartup) {
                        items.push('Ok, and don\'t check again');    
                    }
                    items.push('Open on browser');
                    vscode.window.showInformationMessage.apply(this, items).then(function(value) {
                        if(value == 'Open on browser') {
                            require('openurl').open(apiConnectInstallationInstructionsURL);
                        } else if(value == 'Ok, and don\'t check again') {
                            persistPreference('skipInstallationCheck', true, true);
                        }
                    });
                break;
                case 1:
                    if(!checkDoneOnStartup) {
                        vscode.window.showInformationMessage('API Connect version ' + version + ' is installed.');
                    } else {
                        persistPreference('productInstallationFound', 1, true);
                    }
                break;
                case 2:
                    var items = ['Strongloop version ' + version + ' is installed. Please visit ' + apiConnectInstallationInstructionsURL + ' to upgrade to API Connect'];
                    if(checkDoneOnStartup) {
                        items.push('Ok, and don\'t check again');    
                    }
                    items.push('Open on browser');
                    vscode.window.showInformationMessage.apply(this, items).then(function(value) {
                        if(value == 'Open on browser') {
                            require('openurl').open(apiConnectInstallationInstructionsURL);
                        } else if(value == 'Ok, and don\'t check again') {
                            persistPreference('skipInstallationCheck', true, true);
                        }
                    });
                    persistPreference('productInstallationFound', 2, true);                
                break;
            }
        });
    };
    
    

    


    function generateTypeDefinition() {
        if(checkJSConfigFile()) {
            var typeDefinitionFileContent = "";    
            try {
                var docFiles = JSON.parse(fs.readFileSync(vscode.workspace.rootPath + '/' + loopbackPath + '/' + loopbackDocumentationJSON, "utf-8")).content;
                for(var i = 0; i < docFiles.length; i++) {
                    if(typeof docFiles[i] == "string") {
                        typeDefinitionFileContent += readFile(vscode.workspace.rootPath + '/' + loopbackPath + "/" + docFiles[i]);   
                    }
                }        
                checkOrCreateDirectory(vscode.workspace.rootPath + '/' + typingsDirectory);
                checkOrCreateDirectory(vscode.workspace.rootPath + '/' + typingsDirectory + '/' + loopbackTypingDirectoryName);            
                writeTypeDefinitionFile(typeDefinitionFileContent);
                return true;
            } catch(error) {
                vscode.window.showErrorMessage('The ' + loopbackModuleName + ' module must be present for type definition generation.');
            }   
        }
        return false;
    }

    function writeTypeDefinitionFile(typeDefinitionFileContent) {
        try {
            fs.writeFileSync(vscode.workspace.rootPath + '/' + typingsDirectory + '/' + loopbackTypingDirectoryName + '/' + typeDefinitionFileName, typeDefinitionFileContent);
        } catch(error) {
            vscode.window.showErrorMessage('Could not create type definition file');
            console.log(error)
        }
    }

    function readFile(filePath) {
        try {
            var fileContents = fs.readFileSync(filePath, 'utf-8');
            return parseFileContents(fileContents);
        } catch(error) {
            vscode.window.showErrorMessage('Cannot load loopback file ' + filePath);
            console.log(error);
        }
        return '';
    }

    function parseFileContents(fileContents) {
        var typeDefinitionFileContent = "";
        var classDeclarationOpen = false;
        var inJSDoc = false;
        var codeLineFetched = true;
        var lineStart = 0;
        var lineEnd = fileContents.indexOf("\n");
        var isCallbackParam = false;
        var isCodeSkippedOnPurpose = false;
        var isModule = false;
        
        var jsDocAttributes = {
            class: null,
            params: [],
            options: [],
            callback: [],
            callbackParams: [],
            properties: []
        };
    
        while(lineEnd > 0) {
            
            // Get current line
            var currentLine = fileContents.substring(lineStart, lineEnd).trim();

            // Detect JSDoc
            if(!inJSDoc && currentLine == "/**") {
                inJSDoc = true;
                addLineToTypeDefinitionFile(currentLine);
            } else if(inJSDoc && currentLine == "*/") {
                inJSDoc = false;
                codeLineFetched = false;
                addLineToTypeDefinitionFile(currentLine, true);
            } else {
    
                if(inJSDoc) {
                    var jsDocLine = currentLine.substring(currentLine.indexOf("*") + 1).trim();
                    
                    // @end and @header are not processed, as they are not used consistently in the JSDoc
                    // and serve no purpose in helping us build the definition file
                    if(jsDocLine.startsWith("@class")) {
                        jsDocAttributes.class = jsDocLine.substring(7).trim();
                    } else if(jsDocLine.startsWith("@param")) {
                        var param = {};                                        
                        // The trim handles the case of: @param  {Array}    deltas              
                        param.name = jsDocLine.substring(jsDocLine.indexOf("}") + 2).trim().split(" ")[0];
                        param.dataType = jsDocLine.substring(jsDocLine.indexOf("{") + 1, jsDocLine.indexOf("}"));
                        
                        param.name = handleName(param.name);
                        param.dataType = handleType(param.dataType);

                        if (isCallbackParam){                    
                            jsDocAttributes.callbackParams.push(param);
                        }
                        else {
                            jsDocAttributes.params.push(param);
                        }
                    } else if(jsDocLine.startsWith("@options")) {
                        var option = {};
                        option.name = jsDocLine.substring(jsDocLine.indexOf("}") + 2).split(" ")[0];
                        option.dataType = jsDocLine.substring(jsDocLine.indexOf("{") + 1, jsDocLine.indexOf("}"));
                                            
                        option.name = handleName(option.name);
                        option.dataType = handleType(option.dataType);
                        
                        jsDocAttributes.options.push(option);
                    } else if(jsDocLine.startsWith("@callback")) {
                        // Assumptions (verified with existing JSDoc):
                        // 1. Only one callback per function
                        // 2. The callback only uses @params after (no @options or @properties)
                        // 3. The callback is the last parameter in the function. That is, there will
                        // not be additional paramters after (which are not part of the callback)
                        var callback = {};
                        
                        callback.name = jsDocLine.substring(jsDocLine.indexOf("}") + 2).split(" ")[0];
                        callback.dataType = jsDocLine.substring(jsDocLine.indexOf("{") + 1, jsDocLine.indexOf("}"));
                                            
                        callback.name = handleName(callback.name);
                        callback.dataType = handleType(callback.dataType);
                        
                        jsDocAttributes.callback.push(callback);
                        
                        isCallbackParam = true;           
                                            
                    } else if(jsDocLine.startsWith("@property")) {
                        var property = {};
                        property.name = jsDocLine.substring(jsDocLine.indexOf("}") + 2).trim().split(" ")[0];
                        property.dataType = jsDocLine.substring(jsDocLine.indexOf("{") + 1, jsDocLine.indexOf("}"));
                        
                        property.name = handleName(property.name);
                        property.dataType = handleType(property.dataType);
                        
                        jsDocAttributes.properties.push(property);
                    } else if(jsDocLine.startsWith("@returns")) {
                        var returnType = jsDocLine.substring(jsDocLine.indexOf("{") + 1, jsDocLine.indexOf("}"));
                        
                        returnType = handleType(returnType);
                        
                        jsDocAttributes.returns = returnType;
                    } else if (jsDocLine.startsWith("@private")){
                        isCodeSkippedOnPurpose = true;
                    }

                    addLineToTypeDefinitionFile(currentLine);    

                } else if(!codeLineFetched && currentLine.length > 0) {  
                    // Handle a special case for:
                    // Role.prototype[rel] = function(query, callback) {
                    // This code should be omitted, as it does not appear on the Loopback API Explorer either                        
                    if (currentLine.indexOf("Role.prototype[rel]") >= 0){
                        isCodeSkippedOnPurpose = true;
                    }                                      
                    processJSDocAttributes(currentLine);
                    codeLineFetched = true;
                }

            }

            // Get next line
            lineStart = lineEnd + 1;
            lineEnd = fileContents.indexOf("\n", lineStart);    
        }
        
        if(classDeclarationOpen) {
            addLineToTypeDefinitionFile("}", true, true);
        }
        
        function processJSDocAttributes(codeLine) {            
            // In all instances where @private occurs, the API is not listed in the
            // Loopback API explorer         
            if (!isCodeSkippedOnPurpose){
                if(jsDocAttributes.class != null) {
                    isModule = false;                
                    if(classDeclarationOpen) {
                        addLineToTypeDefinitionFile("}", true, true);
                    } 
                
                    if(jsDocAttributes.class.length > 0) {
                        // Special case Change.Conflict, to change to just Conflict
                        if (jsDocAttributes.class.indexOf("Change.Conflict") >= 0){
                           jsDocAttributes.class = jsDocAttributes.class.replace("Change.Conflict","Conflict"); 
                        }
                        
                        // Currently, the only special case for a module is the loopback module
                        if (jsDocAttributes.class == "loopback"){
                            addLineToTypeDefinitionFile("declare function loopback():LoopBackApplication;\n");
                            addLineToTypeDefinitionFile("declare module 'loopback' {export = loopback;}\n");
                            addLineToTypeDefinitionFile("declare module " +  jsDocAttributes.class + " {", true);
                            isModule = true;
                        }
                        else {
                            addLineToTypeDefinitionFile("declare class " +  jsDocAttributes.class + " {", true);    
                        }
                    } else {
                        addLineToTypeDefinitionFile("declare class " +  extractMemberName(codeLine) + " {", true); 
                    }
                    
                    classDeclarationOpen = true;
                    
                } else {
                    
                        var signature = extractMemberName(codeLine);

                        signature += "(";
                        for(var i = 0; i < jsDocAttributes.params.length; i++) {
                            signature += jsDocAttributes.params[i].name + ": " + jsDocAttributes.params[i].dataType;
                            if(i < jsDocAttributes.params.length - 1) {
                                signature += ", ";
                            }
                        }
                        if(jsDocAttributes.options.length == 1) {
                            if(jsDocAttributes.params.length > 0) {
                                signature += ", ";
                            }
                            
                            signature += jsDocAttributes.options[0].name + ": {";
                            for(var i = 0; i < jsDocAttributes.properties.length; i++) {
                                signature += jsDocAttributes.properties[i].name + ": " + jsDocAttributes.properties[i].dataType;
                                if(i < jsDocAttributes.properties.length - 1) {
                                    signature += ", ";
                                }
                            }
                            
                            signature += "}";
                        }
                        
                        if(jsDocAttributes.callback.length == 1) {
                            if(jsDocAttributes.params.length > 0 || jsDocAttributes.options.length > 0) {
                                signature += ", ";
                            }
                            
                            signature += jsDocAttributes.callback[0].name + ": (";
                            for(var i = 0; i < jsDocAttributes.callbackParams.length; i++) {
                                signature += jsDocAttributes.callbackParams[i].name + ": " + jsDocAttributes.callbackParams[i].dataType;
                                if(i < jsDocAttributes.callbackParams.length - 1) {
                                    signature += ", ";
                                }
                            }
                            
                            signature += ") => void";
                        }                
                        
                        signature += "):";
                        if(jsDocAttributes.returns) {
                            signature += jsDocAttributes.returns + ";";
                        } else {
                            signature += "void;";
                        }
                        
                    if(classDeclarationOpen) {
                        
                        if (isModule){
                        addLineToTypeDefinitionFile("function " + signature, true);
                        }
                        else {
                            addLineToTypeDefinitionFile(signature, true);
                        }
                    } else {
                        addLineToTypeDefinitionFile("declare function " + signature, true);
                    }
                }
            }
            else {
                // Remove the last entry from the type definition, as it is a private API or an API that is deemed skippable
                typeDefinitionFileContent = typeDefinitionFileContent.substring(0,typeDefinitionFileContent.lastIndexOf("/**"));
                addLineToTypeDefinitionFile("");
            }

            jsDocAttributes = {
                class: null,
                params: [],
                options: [],
                callback: [],    
                callbackParams: [],                    
                properties: []
            };
            isCallbackParam = false;
            isCodeSkippedOnPurpose = false;        
        }
        
        function extractMemberName(codeLine) {           
            var member = null;
            var equalSignIndex = codeLine.indexOf("=");
            
            if(codeLine.indexOf("require(") >= 0){
                // Deal with the following formats: 
                // module.exports = require('../../lib/express-middleware').favicon;
                return member =  codeLine.substring(codeLine.indexOf(").") + 2 ,codeLine.indexOf(";")).trim();            
            }
            
            if(equalSignIndex != -1) {
                // Deal with the following formats: 
                // var Model = registry.modelBuilder.define('Model');
                member = codeLine.substring(codeLine.indexOf("var ") + 4, equalSignIndex).trim();
            } else {
                member = codeLine;
            }
            var lastDotIndex = member.lastIndexOf(".");
            if(lastDotIndex != -1) {
                member = member.substring(lastDotIndex + 1).trim();
            }
            if(member.startsWith("function")) {
                member = member.substring(8, member.indexOf("(")).trim();
            }

            return member;
        }

        function addLineToTypeDefinitionFile(line, verticalSpacing, skipIndentation) {
            if(classDeclarationOpen && !skipIndentation) {
                typeDefinitionFileContent += "      ";                 
            }
            typeDefinitionFileContent += line + "\n";
            if(verticalSpacing) {
                typeDefinitionFileContent += "\n";
            }
        }
        
        function handleType(val){
            // Handle "function", when it should be "Function"" 
            if (val == "function"){
                val = val.replace("function","Function");
            }
            
            // Handle "object", when it should be "Object""
            if (val == "object"){
                val = val.replace("object","Object");
            }
            
            // Handle "Any", when it should be "any"
            if (val == "Any"){
                val = val.replace("Any","any");
            }        
            
            // "*" translates into "any", since the cases in the JSDoc
            // show that the paramter can be anything (based on the context)
            if (val.indexOf("*") >= 0){
                val = val.replace("*","any");
            }
            
            if (val.indexOf("Array") >= 0){
                // In some places it is "Array", in others, there are types (e.g.
                // Array.<String>)                                    
                if(val.indexOf("Array.") >= 0){
                    val = val.replace("Array.","Array");
                }
                else {
                    // Use any when the type is not specified
                    val = val.replace("Array","Array<any>");
                }
            }
            return val;  
        }
        
        function handleName(val){                     
            // The only time [*] is used is the 2 places with the same
            // JSDoc:
            // "[*] Other&nbsp;connector properties."
            // Thus, properties is the most generic way to replace
            // this syntax
            if(val.indexOf("*") >= 0){
                val = val.replace("*","properties");
            }         

            // Optional paramters. E.g. [paths]                                    
            if((val.length > 2) && (val.substring(0,1) == "[") && (val.substring(val.length - 1,val.length) == "]")){
                val = val.substring(1,val.length - 1) + "?";
            }
            
            // Handle the case where one parameter has a "." in it.
            // E.g. "info" and the other is "info.count"
            // info.Count will then become infoCount
            var dotIndex = val.indexOf("."); 
            if(dotIndex >= 0){
                var capitalize = val.substring(dotIndex+1,dotIndex+2);
                capitalize = capitalize.toUpperCase();
                val = val.substring(0,dotIndex) + capitalize + val.substring(dotIndex+2,val.length);
                
            }
            
            return val;
        }

        return typeDefinitionFileContent;
    }
    
    // Displays a message for the cmd that is running
    function outputCmdRunningMessage(msg, outputChannel){
        if (outputChannel != null && msg != null){
            outputChannel.show();      
            outputChannel.appendLine(msg);
        }
    }    
    
    // Attaches the output listener (stdout and stderr) for a 
    // running child_process
    function attachCmdOutputListener(cmd, outputChannel){
        if (outputChannel != null && cmd != null){
            outputChannel.show();
            
            cmd.stdout.on('data', (data) => {
            outputChannel.append(data); 
            });
            
            cmd.stderr.on('data', (data) => {
            outputChannel.append(data); 
            });        
        }
    }    
}
exports.activate = activate;

function deactivate() {
}
exports.deactivate = deactivate;