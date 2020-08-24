// Bring in the API module
import {AgentsApi} from './agentApi.js';

// utilities 
const addStorageItem = (ref, val) => {
    let existingItems = localStorage.getItem(ref);
    if(existingItems == null) {
        existingItems = [];    
    } else {
        existingItems = JSON.parse(existingItems);
    }
    existingItems.push(val);
    localStorage.setItem(ref, JSON.stringify(existingItems));
};

const removeStorageItem = (ref, val) => {
    let existingItems = JSON.parse(localStorage.getItem(ref));
    existingItems.splice(existingItems.indexOf(val),1);
    localStorage.setItem(ref, JSON.stringify(existingItems));
};

const getStorageItems = (ref) => {
    return localStorage.getItem(ref);
};

const updateLoadingMessage = (msg) => {
    document.getElementById('loadingMsg').textContent = msg;
};

const expandElement = (evt) => {
    const targetElement = evt.target.parentElement;
    const targetParent = targetElement.parentElement;
    const index = Array.prototype.indexOf.call(targetParent.children, targetElement);
    const expandTargets = document.body.querySelectorAll(`#aiComparison li dl:nth-of-type(${index})`);
    expandTargets.forEach(function(expandTarget){
        expandTarget.classList.toggle('expand');
    });
};

const createRadials = (score,radialId) => {
    const newRadial = generateHTML('strong',null,null,null,'radial-score');
    const radialText = generateHTML('span',score);
    newRadial.appendChild(radialText);
    console.log('APP: CREATE RADIALS');
    const numerator = Number(score);
    const denominator = 100;
    const duration = 3 * numerator/denominator;
    const scoreOffset = ( 1 - ((numerator * 1) / (denominator * 1)) ) * 720;
    let newSVG = document.createElementNS('http://www.w3.org/2000/svg','svg');
    newSVG.setAttribute('viewBox', '0 0 250 250');
    newSVG.setAttribute("version", "1.1");
    let styleDec = document.createElement('style');
    styleDec.textContent = `.inner${radialId} {stroke-dashoffset: 716; animation: dash${radialId} ${duration}s linear forwards paused;}@keyframes dash${radialId} {from { stroke-dashoffset: 716;}to { stroke-dashoffset: ${scoreOffset};}}`;
    newSVG.appendChild(styleDec);
    let innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    innerCircle.setAttribute("cx", "125");
    innerCircle.setAttribute("cy", "125");
    innerCircle.setAttribute("r", "115");
    innerCircle.setAttribute("class", `inner${radialId}`);
    newSVG.appendChild(innerCircle);
    newRadial.appendChild(newSVG);
    return newRadial;
};

const fadeElement = (el, fadeIn) => {
    if( fadeIn ){
        el.classList.remove('fadeout');
        el.classList.add('fadein');
    } else if( !fadeIn ) {
        el.classList.remove('fadein');
        el.classList.add('fadeout');
    }
}

const loadingPanelState = (on,error,msg) => {
    const loadingPanel = document.getElementById('loadingPanel')
    if(error){
        loadingPanel.classList.add('error');
    } else if( !error ){
        loadingPanel.classList.remove('error');
    }
    if( msg ){
        updateLoadingMessage(msg);
    }
    if( on !== null ){
        fadeElement(loadingPanel, on);
    }
};

// HTML element generator
const generateHTML = (elTag,elStr,elType,elId,elClass,elVal,elAttrName,elAttrVal,callback,callbackEvt) => {
    var el = document.createElement(elTag);
    if (elStr) el.innerHTML = elStr;
    if (elType) el.setAttribute('type',elType);
    if (elId) el.id = elId;
    if (elClass) el.className = elClass;
    if (elVal) el.value = elVal;
    if (elAttrName) el.setAttribute(elAttrName,elAttrVal);
    if (callback) el.addEventListener(callbackEvt,callback);
    return el;
};

// AI Selection functionality
const selectItem = (el) => {
    const checkbox = el.target;
    const compareButtonWrap = document.getElementById('aiCompareTriggerWrap');
    
    // Update storage based on selection 
    if( checkbox.checked ){
        addStorageItem('comparisonItems',checkbox.value);
    } else {
        removeStorageItem('comparisonItems',checkbox.value);
    }

    // Disable checkboxes if two items are selected - if more items can be compared in the future you'd allow it here
    let allUnchecked = document.querySelectorAll('input:not(:checked)');
    if( document.querySelectorAll('input:checked').length > 1 ){
        allUnchecked.forEach(function(unchecked){
            unchecked.setAttribute('disabled',true);
        });
        compareButtonWrap.classList.remove('not-visible');
    } else {
        allUnchecked.forEach(function(unchecked){
            unchecked.removeAttribute('disabled');
        });
        compareButtonWrap.classList.add('not-visible');
    }
};

// Generates the AI selection element and wrappers
const renderSelectorItem = (item,wrap) => {
    const li = generateHTML('li');
    const h2 = generateHTML('h2',item.name);
    const comparePseudoBtn = generateHTML('label','Compare',null,null,'pseudo-btn',null,'for',item.id,null);
    const detailsBtn = generateHTML('button','More details','button',null,'link',null,'data-ref',item.name,moreDetails,'click');
    li.appendChild(h2);
    li.appendChild(generateHTML('input',null,'checkbox',item.id, 'not-visible', item.name, null, null, selectItem,'change'));
    li.appendChild(comparePseudoBtn);
    li.appendChild(detailsBtn);
    
    wrap.appendChild(li);
};

// Error handling
const apiError = (error,ref,str) => {
    console.log(`APP: ${error}`);
    const loadingPanel = document.getElementById('loadingPanel');
    loadingPanelState(null,true,'Error communicating with the server.');

    let errorMsg = 'Trying again';
    
    setTimeout(function(){
        if( ref === 'initial' ){
            console.error('APP: Error fetching initial results');
            errorMsg = 'Trying again';
            initializeApp();
            
        } else if( ref === 'compare' ){
            console.error(`APP: Error fetching data for ${str}`);
            errorMsg = `Trying to fetch data for ${str}`;
            getAgentDetails(str,renderResultList,'compare');
            
        } else if( ref === 'details' ){
            console.error(`APP: Error fetching details for ${str}`);
            errorMsg = `Trying to fetch data for ${str}`;
            getAgentDetails(str,renderDetails,'details');
            
        }
        loadingPanelState(null,false,errorMsg);
    },3000);
    
};

const renderDetails = (itemData) => {
    console.log('APP: RENDERING DETAILS');
    const aiDetailsWrap = document.getElementById('aiDetails');
    const aiTitle = document.getElementById('aiTitle');
    const aiDesc = document.getElementById('aiDesc');
    const aiSkills = document.getElementById('aiSkills');
    aiSkills.innerHTML = '';

    aiTitle.textContent = itemData[0].name;
    aiDesc.textContent = itemData[0].description;
    aiSkills.appendChild(buildResultListContent(itemData[0], false));

    loadingPanelState(false,false);
    fadeElement(aiDetailsWrap,true);
    runRadials('.details-wrap svg circle');
};

// Populate the more details panel
const moreDetails = (evt) => {
    console.log('APP: MORE DETAILS ');
    const aiSelectorWrap = document.getElementById('aiSelectorWrap');
    const itemRef = evt.target.getAttribute('data-ref');
    fadeElement(aiSelectorWrap,false);
    // Now hide the loading panel
    loadingPanelState(true,false,'Loading A.I. details');
    getAgentDetails(itemRef,renderDetails,'details');
};

// Reset the comparison selection control
const resetComparison = () => {
    localStorage.clear();
    const aiComparisonWrap = document.getElementById('aiComparisonWrap');
    const aiSelectorWrap = document.getElementById('aiSelectorWrap');
    const aiDetailsWrap = document.getElementById('aiDetails');
    const compareButtonWrap = document.getElementById('aiCompareTriggerWrap');
    
    // Show loading panel
    loadingPanelState(true,false,'Returning to A.I. selector');

    const checkboxes = document.body.querySelectorAll('input[type=checkbox]');

    checkboxes.forEach(function(el){
        el.removeAttribute('disabled');
        el.checked = false;
    });
    compareButtonWrap.classList.add('not-visible');
    
    // Hide the comparison
    fadeElement(aiComparisonWrap,false);
    fadeElement(aiDetailsWrap,false);

    // Hide loading panel
    setTimeout(function(){
        // Show the selector
        fadeElement(aiSelectorWrap,true);
        loadingPanelState(false,false);
    },2000);
    

};

// Create result list content
const buildResultListContent = (itemData,forComparison) => {
    const li = generateHTML('li',null,null,null,itemData.name);
    let wrap;
    if( forComparison ){
        wrap = generateHTML('li',null,null,null,itemData.name);
        const headerDiv = document.createElement('div');
        headerDiv.appendChild(generateHTML('h2',itemData.name));
        wrap.appendChild(headerDiv);
    } else {
        wrap = generateHTML('div');
    }

    // Get task types
    let taskTypes = {};
    itemData.tasks.forEach(function(task){
        if( !(task.category in taskTypes) ){
            taskTypes[task.category] = [];
        }
        taskTypes[task.category].push(task);
    });

    // Calculate average, build associated elements for comparison
    for (let [key, value] of Object.entries(taskTypes)) {
        let taskScoreTotal = 0;
        const taskWrap = generateHTML('dl');
        const taskTitle = generateHTML('dt',key,null,null,null,null,null,null,expandElement,'click'); 
        const taskScoreWrap = generateHTML('dd');
        const taskBreakdownWrap = generateHTML('ul');
        //const taskScore = generateHTML('strong',null,null,null,'radial-score');
        
        value.forEach(function(taskValue){
            taskScoreTotal += taskValue.score;
            taskBreakdownWrap.appendChild(generateHTML('li',`<b>${taskValue.score}</b> <span>${taskValue.name}</span>`));
        });
        const taskScoreAverage = Math.ceil(taskScoreTotal/value.length);
        taskWrap.appendChild(taskTitle);
        const radialid = `${itemData.name}-${key}`;
        taskScoreWrap.appendChild(createRadials(taskScoreAverage,radialid));
        taskScoreWrap.appendChild(taskBreakdownWrap);
        taskWrap.appendChild(taskScoreWrap);
        wrap.appendChild(taskWrap);
    }
    if( forComparison ){
        const footerDiv = generateHTML('div');
        const detailsButton = generateHTML('button','More details','button',null,'cta',itemData.name,null,null,moreDetails,'click');
        footerDiv.appendChild(detailsButton);
        wrap.appendChild(footerDiv);
    }
    
    return wrap;
};

const runRadials = (ref) => {
    const radialInners = document.querySelectorAll(ref);
    radialInners.forEach(function(inners){
        inners.style.animationPlayState = 'running';
    });
};

// Render the item in the comparision panel
const renderResultList = (data) => {
    const itemData = data[0];
    console.log('APP: RENDERING RESULT');
    const aiComparisonList = document.getElementById('aiComparison');
    aiComparisonList.appendChild(buildResultListContent(itemData,true));

    // Check that all items are rendered
    if( aiComparisonList.children.length > 1 ){
        console.log('APP: ALL ITEMS RENDERED');

        // Reveal comparision table
        fadeElement(document.getElementById('aiComparisonWrap'), true);
        
        // Remove loading panel
        loadingPanelState(false,false,null);

        // Animate radials
        runRadials('.comparison-list svg circle');

    }
};

// Get the data for the item
const getAgentDetails = (agentName,callback,ref) => {
    console.log(`APP: attempting to get ${agentName} data`);
    let agentData = new AgentsApi().searchAgents(agentName);
    agentData.then(function(data){
        callback(data);
    })
    .catch(error => apiError(error,ref,agentName));
};

// Spin up the results panel
const initializeResults = () => {
    console.log('APP: GOING TO RESULTS PANEL');
    const aiComparison = document.getElementById('aiComparison');
    
    // Show loading panel
    loadingPanelState(true,false,'Getting A.I. details');

    // Hide the selector
    fadeElement(aiSelectorWrap,false);

    // Clear current list
    aiComparison.innerHTML = '';

    // get AI refs from local storage
    const agentsList = JSON.parse(getStorageItems('comparisonItems'));
    let agentDataReceived = 0;
    
    agentsList.forEach(function(agentName, i){
        console.log(`GETTING AGENT DATA FROM API FOR AI ${i}`);
        // get data for item - currently small data set, but this provicdes support for scalability though with increased vulnerability to failed requests
        getAgentDetails(agentName,renderResultList,'compare');
    })

};

// Populate the AI selector fields
const populateAgentSelector = (result) => {
    const aiSelectorList = document.getElementById('aiSelector');
    const compareButton = document.getElementById('aiCompareTrigger');
    const aiResetTrigger = document.body.querySelectorAll('.aiResetTrigger');
    aiResetTrigger.forEach(function(trigger){
        trigger.addEventListener('click',resetComparison);
    });

    // Remove previous selections from storage
    localStorage.clear();
    
    // For each AI object in the response, fire the render function
    result.forEach(function(item){
        renderSelectorItem(item,aiSelectorList);
    });

    // Now hide the loading panel
    loadingPanelState(false,false,null);
    
    // Define the comparison buttons functionality
    compareButton.addEventListener('click',initializeResults);
};

// Initialize the application with the mock API
const initializeApp = () => {
    console.log('APP: initialize');
    let agentsList = new AgentsApi().listAgents();
    agentsList.then(function(result) {
        console.log('APP: results successfully retrieved');
        populateAgentSelector(result);
    })
    .catch(error => apiError(error,'initial'));
};

initializeApp();