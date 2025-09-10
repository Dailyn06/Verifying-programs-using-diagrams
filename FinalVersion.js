
    let shapeCount = 0;
    let draggedElement = null;
    let offset = { x: 0, y: 0 };
    let isConnectMode = false;
    let isEncapsulateMode = false; // 新增：封装模式
    let firstShape = null;
    let connections = [];
    let scrollY = 0;
    let maxScrollY = 0;
    let scrollIndicatorTimer = null;

    //Encapsulation related variables
    let isSelecting = false;
    let selectionStart = { x: 0, y: 0 };
    let selectionBox = null;
    let selectedShapes = [];
    let encapsulations = [];

    let proofStepResults = new Map();
    let stepResultCounter = 0;

    // Rolling Related Variables
    const canvas = document.getElementById('canvas');
    const canvasViewport = document.getElementById('canvasViewport');
    const scrollIndicator = document.getElementById('scrollIndicator');

    // safe text fetch function
    function getShapeText(shape) {
    if (!shape) return '';

    const textElement = shape.querySelector('.shape-text');
    if (!textElement) return '';

    // If it's a textarea or input, get the value first.
    if (textElement.tagName.toLowerCase() === 'textarea' || textElement.tagName.toLowerCase() === 'input') {
    return (textElement.value || '').trim();
}

    // If it is a div or other element, get textContent
    let text = textElement.textContent || textElement.innerText || '';

    return text.trim();
}

    // Initialization after page load
    document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
});

    function initializeCanvas() {
    calculateMaxScroll();

    canvasViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const scrollSpeed = 1.5;
    const deltaY = e.deltaY * scrollSpeed;
    scrollY = Math.max(0, Math.min(maxScrollY, scrollY + deltaY));
    canvas.style.transform = `translateY(-${scrollY}px)`;
    showScrollIndicator();
    updateConnections();
});

    // add mouse event listener for box selection
    canvasViewport.addEventListener('mousedown', handleCanvasMouseDown);
    canvasViewport.addEventListener('mousemove', handleCanvasMouseMove);
    canvasViewport.addEventListener('mouseup', handleCanvasMouseUp);

    canvasViewport.addEventListener('dragover', e => e.preventDefault());
    canvasViewport.addEventListener('drop', e => e.preventDefault());

    window.addEventListener('resize', () => {
    calculateMaxScroll();
    updateConnections();
});

    window.onclick = function(event) {
    const modal = document.getElementById('isabellePanel');
    const encapModal = document.getElementById('encapsulationPanel');
    if (event.target === modal) {
    modal.classList.remove('show');
}
    if (event.target === encapModal) {
    encapModal.classList.remove('show');
}
}
}

    // Encapsulation mode related functions
    function toggleEncapsulateMode() {
    isEncapsulateMode = !isEncapsulateMode;
    const btn = document.getElementById('encapsulateBtn');

    if (isEncapsulateMode) {
    btn.classList.add('active');
    btn.textContent = '📦 Box-select encapsulation...';
    document.body.style.cursor = 'crosshair';

    if (isConnectMode) {
    toggleConnectMode();
}
    //console.log('进入封装模式');
} else {
    btn.classList.remove('active');
    btn.textContent = '📦 Encapsulation mode';
    document.body.style.cursor = 'default';
    clearSelection();
    //console.log('退出封装模式');
}
}

    function handleCanvasMouseDown(e) {
    if (!isEncapsulateMode || draggedElement) return;

    const canvasRect = canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top + scrollY;

    const clickedShape = document.elementFromPoint(e.clientX, e.clientY);
    if (clickedShape && clickedShape.closest('.shape')) {
    return;
}

    isSelecting = true;
    selectionStart = { x, y };

    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    selectionBox.style.cssText = `
        position: absolute;
        border: 3px dashed #e84393;
        background: rgba(232, 67, 147, 0.1);
        pointer-events: none;
        z-index: 30;
        border-radius: 8px;
        left: ${x}px;
        top: ${y - scrollY}px;
        width: 0px;
        height: 0px;
    `;
    canvas.appendChild(selectionBox);

    e.preventDefault();
}

    function handleCanvasMouseMove(e) {
    if (!isSelecting || !selectionBox) return;

    const canvasRect = canvas.getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left;
    const currentY = e.clientY - canvasRect.top + scrollY;

    const width = Math.abs(currentX - selectionStart.x);
    const height = Math.abs(currentY - selectionStart.y);
    const left = Math.min(selectionStart.x, currentX);
    const top = Math.min(selectionStart.y, currentY);

    selectionBox.style.left = left + 'px';
    selectionBox.style.top = (top - scrollY) + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';

    updateSelectedShapes(left, top, width, height);
}

    function handleCanvasMouseUp(e) {
    if (!isSelecting) return;

    isSelecting = false;

    if (selectionBox) {
    canvas.removeChild(selectionBox);
    selectionBox = null;
}

    if (selectedShapes.length > 0) {
    showEncapsulationPanel();
}
}

    function updateSelectedShapes(left, top, width, height) {
    const shapes = document.querySelectorAll('.shape');
    selectedShapes = [];

    shapes.forEach(shape => {
    const rect = shape.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const shapeX = rect.left - canvasRect.left;
    const shapeY = rect.top - canvasRect.top + scrollY;
    const shapeWidth = rect.width;
    const shapeHeight = rect.height;

    const overlap = !(shapeX > left + width ||
    shapeX + shapeWidth < left ||
    shapeY > top + height ||
    shapeY + shapeHeight < top);

    if (overlap) {
    selectedShapes.push(shape);
    shape.classList.add('selected-for-encapsulation');
} else {
    shape.classList.remove('selected-for-encapsulation');
}
});
}

    function clearSelection() {
    selectedShapes.forEach(shape => {
        shape.classList.remove('selected-for-encapsulation');
    });
    selectedShapes = [];
}

    function showEncapsulationPanel() {
    const analysis = analyzeSelectedShapes();

    // Display Package Input
    document.getElementById('inputList').innerHTML = '<ul>' +
    analysis.inputs.map(input => `<li>${input.text} (${input.type})</li>`).join('') +
    '</ul>';

    // ***** show external dependencies *****
    if (analysis.externalDependencies && analysis.externalDependencies.length > 0) {
    const externalDepsHtml = '<h4>🔗 External dependencies</h4><div class="encap-list"><ul>' +
    analysis.externalDependencies.map(dep => `<li>${dep.text} (${dep.type}) - External dependencies</li>`).join('') +
    '</ul></div>';

    // 在输入条件后插入外部依赖部分
    const inputSection = document.querySelector('#inputList').parentElement;
    const externalDepsDiv = document.createElement('div');
    externalDepsDiv.className = 'encap-section';
    externalDepsDiv.innerHTML = externalDepsHtml;
    inputSection.parentNode.insertBefore(externalDepsDiv, inputSection.nextSibling);
}

    document.getElementById('proofStepsList').innerHTML = '<ul>' +
    analysis.proofSteps.map(step => `<li>${step.text} (${step.type})</li>`).join('') +
    '</ul>';

    document.getElementById('outputList').innerHTML = '<ul>' +
    analysis.outputs.map(output => `<li>${output.text} (${output.type})</li>`).join('') +
    '</ul>';

    const formula = generateEncapsulationFormula(analysis);
    document.getElementById('encapFormula').textContent = formula;

    document.getElementById('encapsulationPanel').classList.add('show');
}


    function analyzeSelectedShapes() {
    const inputs = [];
    const outputs = [];
    const proofSteps = [];
    const selectedIds = selectedShapes.map(shape => shape.id);

    // console.log('=== 开始封装分析 ===');
    // console.log('选中的形状ID:', selectedIds);
    // console.log('选中的形状数量:', selectedShapes.length);

    selectedShapes.forEach((shape, index) => {
    // console.log(`\n--- 检查形状 ${index + 1}: ${shape.id} ---`);

    const text = getShapeText(shape);
    // console.log(`获取到的文本: "${text}"`);

    if (!text) {
    // console.warn(`跳过空文本形状: ${shape.id}`);
    return;
}

    const type = getShapeType(shape);
    // console.log(`形状类型: ${type}`);

    const shapeData = { id: shape.id, text, type, element: shape };

    // 分析连接关系
    const incomingFromOutside = connections.filter(conn =>
    conn.to === shape.id && !selectedIds.includes(conn.from)
    );
    const outgoingToOutside = connections.filter(conn =>
    conn.from === shape.id && !selectedIds.includes(conn.to)
    );
    const incomingFromInside = connections.filter(conn =>
    conn.to === shape.id && selectedIds.includes(conn.from)
    );
    const outgoingToInside = connections.filter(conn =>
    conn.from === shape.id && selectedIds.includes(conn.to)
    );

    // console.log(`connectivity analysis:`);
    // console.log(`  From the outside: ${incomingFromOutside.length}个`, incomingFromOutside);
    // console.log(`  Output to external: ${outgoingToOutside.length}个`, outgoingToOutside);
    // console.log(`  From the inside: ${incomingFromInside.length}个`, incomingFromInside);
    // console.log(`  Output to internal: ${outgoingToInside.length}个`, outgoingToInside);

    if (type === 'proof' || type === 'decision') {
    proofSteps.push(shapeData);
    //console.log(`→ Filed under: Proof Steps`);
}
    else if (type === 'assumption' || type === 'rectangle' || type === 'result' || type === 'intermediate') {

    if (incomingFromInside.length === 0) {
    if (incomingFromOutside.length === 0) {
    inputs.push({...shapeData, isEncapsulationInput: true});
    console.log(`→ Filed under: Encapsulated Inputs (Boxed Inside Start Node)`);
} else {
    // 这是一个依赖外部输入的节点，不应该作为封装的输入条件
    console.log(`→ Filed under: external node dependency (not as encapsulated input)`);
}
}
    // 封装输出：框选内终止节点 (无输出到框选内的连接)
    else if (outgoingToInside.length === 0) {
    outputs.push(shapeData);
    console.log(`→ Filed under: encapsulated output (boxed termination node)`);
}
    // 中间节点：既有框选内输入也有框选内输出
    else {
    console.log(`→ Filed under: intermediate nodes (not included in the encapsulation formula)`);
}
}
    else {
    console.log(`→ Filed under: other type (${type})`);
}
});

    const externalDependencies = [];
    const externalShapeIds = new Set();

    connections.forEach(conn => {
    if (!selectedIds.includes(conn.from) && selectedIds.includes(conn.to)) {
    externalShapeIds.add(conn.from);
}
});

    console.log(`\n=== External dependency analysis ===`);
    console.log(`External shape ID:`, Array.from(externalShapeIds));

    externalShapeIds.forEach(shapeId => {
    const shape = document.getElementById(shapeId);
    if (shape) {
    const text = getShapeText(shape);
    if (text) {
    const externalDep = {
    id: shapeId,
    text: text,
    type: getShapeType(shape),
    element: shape,
    isExternal: true
};
    externalDependencies.push(externalDep);
    console.log(`External dependencies: ${text} (ID: ${shapeId})`);
}
}
});

    console.log(`\n=== Final analysis results ===`);
    console.log(`Encapsulated Inputs:`, inputs.map(i => `${i.text} (${i.id})`));
    console.log(`External dependencies:`, externalDependencies.map(e => `${e.text} (${e.id})`));
    console.log(`Output:`, outputs.map(o => `${o.text} (${o.id})`));
    console.log(`Proof steps:`, proofSteps.map(p => `${p.text} (${p.id})`));

    return {
    inputs,
    outputs,
    proofSteps,
    externalDependencies
};
}

    function checkIndirectExternalInput(shapeId, selectedIds) {
    // 检查是否有来自封装外部的证明步骤影响到当前形状
    const visited = new Set();
    const queue = [shapeId];

    while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // 查找指向当前形状的连接
    const incomingConnections = connections.filter(conn => conn.to === currentId);

    for (const conn of incomingConnections) {
    // 如果来源不在选中的形状中，说明有外部输入
    if (!selectedIds.includes(conn.from)) {
    return true;
}
    // 继续检查内部连接的来源
    if (selectedIds.includes(conn.from)) {
    queue.push(conn.from);
}
}
}

    return false;
}
    function collectExternalInputs(selectedIds) {
    const externalInputs = [];
    const externalShapeIds = new Set();
    connections.forEach(conn => {
    if (!selectedIds.includes(conn.from) && selectedIds.includes(conn.to)) {
    externalShapeIds.add(conn.from);
}
});

    externalShapeIds.forEach(shapeId => {
    const shape = document.getElementById(shapeId);
    if (shape) {
    const text = getShapeText(shape);
    if (text) {
    externalInputs.push({
    id: shapeId,
    text: text,
    type: getShapeType(shape),
    element: shape
});
}
}
});

    return externalInputs;
}

    // Modification: filter out inputs of type INTERMEDIATE
    // ***** Modification of the wrapper formula generation function *****
    function generateEncapsulationFormula(analysis) {
    //
    const encapsulationInputs = analysis.inputs.filter(input => input.isEncapsulationInput);

    console.log('Encapsulated Formula Generation Details:');
    console.log('- Encapsulated input (for formulas):', encapsulationInputs.map(i => i.text));
    console.log('- External dependencies (not used in formulas):', analysis.externalDependencies?.map(e => e.text) || []);
    console.log('- Output:', analysis.outputs.map(o => o.text));

    const inputTexts = encapsulationInputs.map(input => convertToIsabelleLogic(input.text));
    const outputTexts = analysis.outputs.map(output => convertToIsabelleLogic(output.text));

    let inputPart = inputTexts.length > 1 ?
    `(${inputTexts.join(' ∧ ')})` :
    inputTexts[0] || 'True';

    let outputPart = outputTexts.length > 1 ?
    `(${outputTexts.join(' ∧ ')})` :
    outputTexts[0] || 'True';

    const formula = `${inputPart} ⟶ ${outputPart}`;
    console.log('Generated formula:', formula);

    return formula;
}

    function confirmEncapsulation() {
    const analysis = analyzeSelectedShapes();
    const formula = generateEncapsulationFormula(analysis);

    const encapsulation = {
    id: `encap_${encapsulations.length + 1}`,
    shapes: [...selectedShapes],
    formula: formula,
    inputs: analysis.inputs,
    outputs: analysis.outputs,
    proofSteps: analysis.proofSteps,
    externalDependencies: analysis.externalDependencies  // ***** 关键修复：保存外部依赖 *****
};

    encapsulations.push(encapsulation);
    createIntroShape(encapsulation);

    selectedShapes.forEach(shape => {
    shape.classList.add('encapsulated');
    shape.classList.remove('selected-for-encapsulation');
});

    updateConnectionsForEncapsulation(encapsulation);

    const encapStepIndex = stepResultCounter++;
    const introStepData = storeProofStepResult(
    encapStepIndex,
    `intro-${encapsulation.id}`,
    'Encapsulation Introduction',
    [formula],
    analysis.inputs.map(input => input.text)
    );

    console.log(`Storing encapsulated results: ${introStepData.stepId} = "${formula}"`);
    console.log('Encapsulating full information about an object:', encapsulation); // ***** 新增调试信息 *****

    clearSelection();
    toggleEncapsulateMode();

    document.getElementById('encapsulationPanel').classList.remove('show');
    console.log('Package Completion:', encapsulation);
}

    function createIntroShape(encapsulation) {
    const rightmostOutput = findRightmostOutput(encapsulation.outputs);
    const outputBounds = rightmostOutput ?
    rightmostOutput.element.getBoundingClientRect() :
    calculateBounds(encapsulation.shapes);

    const canvasRect = canvas.getBoundingClientRect();
    const baseX = rightmostOutput ?
    (outputBounds.right - canvasRect.left + 80) :
    (calculateBounds(encapsulation.shapes).right + 80);
    const baseY = rightmostOutput ?
    (outputBounds.top - canvasRect.top + scrollY + outputBounds.height / 2) :
    (calculateBounds(encapsulation.shapes).top + 50);

    // Creating Intro Shapes
    shapeCount++;
    const introShape = document.createElement('div');
    introShape.className = 'shape intro';
    introShape.id = `intro-${encapsulation.id}`;
    introShape.setAttribute('data-type', 'intro');
    introShape.setAttribute('data-encapsulation-id', encapsulation.id);
    introShape.style.cssText = `
        left: ${baseX}px;
        top: ${baseY - 30}px;
        background: linear-gradient(45deg, #e84393, #fd79a8);
        border-radius: 15px;
        width: 150px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        border: 3px solid #fff;
    `;

    const textInput = document.createElement('textarea');
    textInput.className = 'shape-text';
    textInput.value = 'intro';
    textInput.readOnly = true;
    textInput.rows = 1;
    textInput.cols = 8;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteEncapsulation(encapsulation.id);
};

    introShape.addEventListener('mousedown', startDrag);
    introShape.addEventListener('click', handleIntroShapeClick);

    textInput.addEventListener('mousedown', (e) => e.stopPropagation());
    textInput.addEventListener('focus', (e) => e.stopPropagation());
    textInput.addEventListener('click', (e) => e.stopPropagation());

    introShape.appendChild(textInput);
    introShape.appendChild(deleteBtn);
    canvas.appendChild(introShape);

    // Creating the wrapped result rectangle
    shapeCount++;
    const resultShape = document.createElement('div');
    resultShape.className = 'shape rectangle encapsulation-result';
    resultShape.id = `encap-result-${encapsulation.id}`;
    resultShape.setAttribute('data-type', 'rectangle');
    resultShape.setAttribute('data-encapsulation-id', encapsulation.id);
    resultShape.style.cssText = `
        left: ${baseX + 200}px;
        top: ${baseY - 40}px;
        background: linear-gradient(45deg, #a8e6cf, #88d8a3);
        border: 3px solid #4caf50;
        box-shadow: 0 8px 25px rgba(76, 175, 80, 0.3);
    `;

    const resultTextInput = document.createElement('textarea');
    resultTextInput.className = 'shape-text';
    resultTextInput.rows = 3;
    resultTextInput.cols = 10;
    resultTextInput.value = encapsulation.formula;
    resultTextInput.placeholder = 'Packaging results...';

    const resultDeleteBtn = document.createElement('button');
    resultDeleteBtn.className = 'delete-btn';
    resultDeleteBtn.innerHTML = '×';
    resultDeleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteEncapsulation(encapsulation.id);
};

    resultShape.addEventListener('mousedown', startDrag);
    resultShape.addEventListener('click', handleShapeClick);

    resultTextInput.addEventListener('mousedown', (e) => e.stopPropagation());
    resultTextInput.addEventListener('focus', (e) => e.stopPropagation());
    resultTextInput.addEventListener('click', (e) => e.stopPropagation());

    resultShape.appendChild(resultTextInput);
    resultShape.appendChild(resultDeleteBtn);
    canvas.appendChild(resultShape);

    // Making connections
    encapsulation.outputs.forEach(output => {
    connections.push({
    from: output.id,
    to: introShape.id,
    encapsulated: true
});
});

    connections.push({
    from: introShape.id,
    to: resultShape.id,
    encapsulated: false
});

    encapsulation.resultShape = resultShape;
    updateConnections();
    updateCounter();
}

    function findRightmostOutput(outputs) {
    if (!outputs || outputs.length === 0) return null;

    let rightmostOutput = outputs[0];
    let maxRight = 0;

    outputs.forEach(output => {
    const element = output.element || document.getElementById(output.id);
    if (element) {
    const rect = element.getBoundingClientRect();
    if (rect.right > maxRight) {
    maxRight = rect.right;
    rightmostOutput = { ...output, element };
}
}
});

    return rightmostOutput;
}

    function calculateBounds(shapes) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    shapes.forEach(shape => {
    const rect = shape.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const x = rect.left - canvasRect.left;
    const y = rect.top - canvasRect.top + scrollY;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + rect.width);
    maxY = Math.max(maxY, y + rect.height);
});

    return { left: minX, top: minY, right: maxX, bottom: maxY };
}

    function updateConnectionsForEncapsulation(encapsulation) {
    const encapsulatedIds = encapsulation.shapes.map(shape => shape.id);

    connections.forEach(conn => {
    if (encapsulatedIds.includes(conn.from) && encapsulatedIds.includes(conn.to)) {
    conn.encapsulated = true;
}
});

    updateConnections();
}

    // Modification: filter out inputs of type intermediate
    function handleIntroShapeClick(e) {
    if (isConnectMode) {
    handleShapeClick(e);
    return;
}

    const encapId = e.currentTarget.getAttribute('data-encapsulation-id');
    const encapsulation = encapsulations.find(enc => enc.id === encapId);

    if (encapsulation) {
    const validInputs = encapsulation.inputs.filter(input => input.type !== 'intermediate');

    alert(`Encapsulated formula: ${encapsulation.formula}\n\n` +
    `Input: ${validInputs.map(i => i.text).join(', ')}\n` +
    `Output: ${encapsulation.outputs.map(o => o.text).join(', ')}`);
}
}

    function deleteEncapsulation(encapId) {
    const encapsulation = encapsulations.find(enc => enc.id === encapId);
    if (!encapsulation) return;

    const introShape = document.getElementById(`intro-${encapId}`);
    if (introShape) introShape.remove();

    const resultShape = document.getElementById(`encap-result-${encapId}`);
    if (resultShape) resultShape.remove();

    encapsulation.shapes.forEach(shape => {
    if (shape.parentNode) {
    shape.classList.remove('encapsulated');
}
});

    connections = connections.filter(conn =>
    conn.from !== `intro-${encapId}` &&
    conn.to !== `intro-${encapId}` &&
    conn.from !== `encap-result-${encapId}` &&
    conn.to !== `encap-result-${encapId}`
    );

    const index = encapsulations.findIndex(enc => enc.id === encapId);
    if (index !== -1) {
    encapsulations.splice(index, 1);
}

    updateConnections();
    updateCounter();
}

    function cancelEncapsulation() {
    clearSelection();
    document.getElementById('encapsulationPanel').classList.remove('show');
}

    function closeEncapsulationPanel() {
    document.getElementById('encapsulationPanel').classList.remove('show');
    clearSelection();
}

    // Calculate the maximum rolling distance
    function calculateMaxScroll() {
    const viewportHeight = canvasViewport.clientHeight;
    const canvasHeight = canvas.offsetHeight;
    maxScrollY = Math.max(0, canvasHeight - viewportHeight);
}

    // Display scroll indicator
    function showScrollIndicator() {
    const scrollPercentage = maxScrollY > 0 ? Math.round((scrollY / maxScrollY) * 100) : 0;
    scrollIndicator.textContent = `Scroll: ${scrollPercentage}%`;
    scrollIndicator.classList.add('visible');

    if (scrollIndicatorTimer) {
    clearTimeout(scrollIndicatorTimer);
}

    scrollIndicatorTimer = setTimeout(() => {
    scrollIndicator.classList.remove('visible');
}, 2000);
}

    function addShape(type) {
    shapeCount++;
    const shape = document.createElement('div');
    shape.className = `shape ${type}`;
    shape.id = `shape-${shapeCount}`;
    shape.setAttribute('data-type', type);
    shape.style.left = '50px';
    shape.style.top = `${50 + (shapeCount - 1) * 120}px`;

    const textInput = document.createElement('textarea');
    textInput.className = 'shape-text';
    textInput.rows = 3;
    textInput.cols = 10;

    let placeholderText = '';
    switch(type) {
    case 'rectangle':
    placeholderText = 'Input conditions/results...';
    break;
    case 'circle':
    placeholderText = 'Input theorem...';
    break;
    case 'diamond':
    placeholderText = 'Proof of Input Steps...';
    break;
    case 'diamond-decision':
    placeholderText = 'Input decision...';
    break;
}
    textInput.placeholder = placeholderText;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteShape(shape.id);
};

    shape.addEventListener('mousedown', startDrag);
    shape.addEventListener('click', handleShapeClick);

    textInput.addEventListener('mousedown', (e) => e.stopPropagation());
    textInput.addEventListener('focus', (e) => e.stopPropagation());
    textInput.addEventListener('click', (e) => e.stopPropagation());

    shape.appendChild(textInput);
    shape.appendChild(deleteBtn);
    canvas.appendChild(shape);
    updateCounter();
    calculateMaxScroll();

    shape.style.opacity = '0';
    shape.style.transform = 'scale(0.5)';
    setTimeout(() => {
    shape.style.opacity = '1';
    if (type === 'diamond' || type === 'diamond-decision') {
    shape.style.transform = 'rotate(45deg) scale(1)';
} else {
    shape.style.transform = 'scale(1)';
}
    shape.style.transition = 'all 0.3s ease';
}, 10);
}

    function deleteShape(shapeId) {
    const shape = document.getElementById(shapeId);
    if (shape) {
    connections = connections.filter(conn =>
    conn.from !== shapeId && conn.to !== shapeId
    );

    clearProofStepResultsForShape(shapeId);
    shape.remove();
    updateConnections();

    const remainingShapes = document.querySelectorAll('.shape');
    shapeCount = remainingShapes.length;
    updateCounter();
    calculateMaxScroll();
}
}

    function clearProofStepResultsForShape(shapeId) {
    for (let [stepIndex, stepData] of proofStepResults.entries()) {
    if (stepData.shapeId === shapeId) {
    proofStepResults.delete(stepIndex);
}
}
}

    function startDrag(e) {
    // check the encapsulation mode at the same time
    if (isConnectMode || isEncapsulateMode) {
    e.preventDefault();
    return;
}

    draggedElement = e.currentTarget;
    draggedElement.classList.add('dragging');

    const rect = draggedElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    offset.x = e.clientX - rect.left;
    offset.y = e.clientY - rect.top;

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    e.preventDefault();
}

    function drag(e) {
    if (!draggedElement) return;

    const canvasRect = canvas.getBoundingClientRect();
    let newX = e.clientX - canvasRect.left - offset.x;
    let newY = e.clientY - canvasRect.top - offset.y;

    newX = Math.max(0, Math.min(newX, canvasRect.width - draggedElement.offsetWidth));
    newY = Math.max(0, Math.min(newY, canvas.offsetHeight - draggedElement.offsetHeight));

    draggedElement.style.left = newX + 'px';
    draggedElement.style.top = newY + 'px';

    updateConnections();
}

    function stopDrag() {
    if (draggedElement) {
    draggedElement.classList.remove('dragging');
    draggedElement = null;
}
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDrag);
}

    function toggleConnectMode() {
    isConnectMode = !isConnectMode;
    const btn = document.getElementById('connectBtn');

    if (isConnectMode) {
    btn.classList.add('active');
    btn.textContent = '🔗 Connecting mode...';
    document.body.style.cursor = 'crosshair';

    // Exit Encapsulation Mode
    if (isEncapsulateMode) {
    toggleEncapsulateMode();
}

    console.log('Entering Connecting Mode');
} else {
    btn.classList.remove('active');
    btn.textContent = '🔗 Connecting mode';
    document.body.style.cursor = 'default';

    if (firstShape) {
    firstShape.style.border = '2px solid #fff';
    firstShape.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    firstShape = null;
}
    console.log('Exiting Connecting Mode');
}
}

    function handleShapeClick(e) {
    if (!isConnectMode) return;

    e.stopPropagation();
    e.preventDefault();
    const shape = e.currentTarget;

    if (!firstShape) {
    firstShape = shape;
    shape.style.border = '3px solid #ff6b6b';
    shape.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.5)';
    console.log('The first component is selected:', shape.id);
} else if (firstShape !== shape) {
    console.log('The Second component is selected::', shape.id);
    createConnection(firstShape, shape);

    firstShape.style.border = '2px solid #fff';
    firstShape.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    firstShape = null;

    toggleConnectMode();
} else {
    firstShape.style.border = '2px solid #fff';
    firstShape.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    firstShape = null;
}
}

    function createConnection(shape1, shape2) {
    const connection = {
    from: shape1.id,
    to: shape2.id
};
    connections.push(connection);
    console.log('Creating Connections:', connection);
    console.log('Number of current connections:', connections.length);
    updateConnections();
}

    function getFinalConclusionsFixed(analysis) {
    const finalConclusions = [];

    if (analysis.results && analysis.results.length > 0) {
    analysis.results.forEach(result => {
    if (result.text && result.text.trim()) {
    finalConclusions.push(result);
}
});
}

    if (finalConclusions.length === 0) {
    const shapes = Array.from(document.querySelectorAll('.shape[data-type="rectangle"]'));
    shapes.forEach(shape => {
    const outgoingConnections = connections.filter(conn => conn.from === shape.id);
    if (outgoingConnections.length === 0) {
    const text = getShapeText(shape); // Using the Fixed Text Fetch Function
    if (text) {
    finalConclusions.push({ id: shape.id, text: text });
}
}
});
}

    if (finalConclusions.length === 0 && analysis.proofSteps && analysis.proofSteps.length > 0) {
    const lastStep = analysis.proofSteps[analysis.proofSteps.length - 1];
    if (lastStep.results && lastStep.results.length > 0) {
    finalConclusions.push(...lastStep.results.filter(res => res.text && res.text.trim()));
} else if (lastStep.proof && lastStep.proof.text) {
    finalConclusions.push({ text: lastStep.proof.text });
}
}

    return finalConclusions;
}

    //*** Generate code
    function generateImprovedTacticFixed(step, stepIndex, allSteps) {
    try {
    const proofText = (step.proof && step.proof.text) ? step.proof.text.toLowerCase() : '';
    const conditions = step.conditions || [];
    const results = step.results || [];
    console.log(proofText);

    if (proofText.includes('conjunct2') || proofText.includes('conj2')) {
    return generateConjunctTacticFixed(step, stepIndex, 'conjunct2');
}

    if (proofText.includes('conjunct1') || proofText.includes('conj1')) {
    return generateConjunctTacticFixed(step, stepIndex, 'conjunct1');
}

    if (proofText.includes('disji1') || proofText.includes('disjI1')) {
    return generateDisjunctionTacticFixed(step, stepIndex, 'disjI1');
}

    if (proofText.includes('disji2') || proofText.includes('disjI2')) {
    return generateDisjunctionTacticFixed(step, stepIndex, 'disjI2');
}

    if (proofText.includes('mp') || proofText.includes('modus ponens')) {
    return generateModusPonensTacticFixed(step, stepIndex);
}

    if (proofText.includes('conjI') || proofText.includes('conjunct')) {
    return generateConjunctionIntroTacticFixed(step, stepIndex);
}

    return generateDefaultTacticFixed(step, stepIndex);
} catch (error) {
    console.log('Strategy Generation Error:', error);
    return 'sorry (* Proof of policy generation failure *)';
}
}

    //*** Conjunct
    function generateConjunctTacticFixed(step, stepIndex, rule) {
    try {
    const conditions = step.conditions || [];
    let NumOfNoAndConditions = 0;

    for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    if (cond.text && (cond.text.includes('∧') || cond.text.toLowerCase().includes('and'))) {
    if (cond.type === 'assumption') {
    const assumptionIndex = getAssumptionIndexFixed(cond.id);
    if (assumptionIndex >= 0) {
    return `by (rule ${rule}[OF assms(${assumptionIndex + 1})])`;
}
}
    if (stepIndex > 0) {
    for (let j = stepIndex; j >= 1; j--) {
    return `by (rule ${rule}[OF step${j}])`;
}
}
} else {
    NumOfNoAndConditions++;
}
}

    if (NumOfNoAndConditions === conditions.length) {
    return '(***Important: Please Check Your Conditions!***)';
}

    return `by (rule ${rule})`;
} catch (error) {
    return `by (rule ${rule})`;
}
}
    function generateConjunctionIntroTacticFixed(step, stepIndex) {
    try {
    const using = [];

    if (stepIndex > 0) {
    for (let i = 1; i <= stepIndex; i++) {
    using.push(`step${i}`);
}
}

    if (using.length > 0) {
    return `by (rule conjI) using ${using.join(' ')}`;
}

    return `by (rule conjI)`;
} catch (error) {
    return `by (rule conjI)`;
}
}

    //*** Disjunction
    function generateDisjunctionTacticFixed(step, stepIndex, rule) {
    try {
    if (stepIndex > 0) {
    return `by (rule ${rule}[OF step${stepIndex}])`;
}

    const conditions = step.conditions || [];
    if (conditions.length > 0) {
    const cond = conditions[0];
    if (cond.type === 'assumption') {
    const assumptionIndex = getAssumptionIndexFixed(cond.id);
    if (assumptionIndex >= 0) {
    return `by (rule ${rule}[OF assms(${assumptionIndex + 1})])`;
}
}
}

    return `by (rule ${rule})`;
} catch (error) {
    return `by (rule ${rule})`;
}
}

    //*** Modus Ponens
    function generateModusPonensTacticFixed(step, stepIndex) {
    try {
    const conditions = step.conditions || [];
    console.log(`=== MP analysis begins - Step ${stepIndex + 1} ===`);
    console.log(`Number of conditions: ${conditions.length}`);
    console.log(`Details of conditions:`, conditions.map(c => `"${c.text}" (类型: ${c.type}, ID: ${c.id})`));

    // 首先尝试在存储的结果中找到匹配
    const previousResults = getAvailablePreviousResults(stepIndex);
    console.log(`Number of available antecedent results: ${previousResults.length}`);

    // 添加封装结果到可用结果中
    const allAvailableResults = [...previousResults];

    // 查找所有封装结果形状
    const encapResults = document.querySelectorAll('.shape.encapsulation-result');
    const bestMatch = findBestMPMatchInResults(conditions, allAvailableResults, stepIndex);
    encapResults.forEach((shape, index) => {
    const text = getShapeText(shape);
    if (text && isImplicationFormula(text)) {
    console.log(`  Encapsulation result implication founded: "${text}"`);
    allAvailableResults.push({
    stepIndex: -1,
    stepId: `intro_result_${index + 1}`,
    results: [text],
    isEncapsulationResult: true
});
}
});

    //const bestMatch = findBestMPMatchInResults(conditions, allAvailableResults, stepIndex);

    if (bestMatch) {
    console.log(`✓ 找到MP匹配:`, bestMatch);
    return `by (rule mp[OF ${bestMatch.implicationRef} ${bestMatch.antecedentRef}])`;
}

    // 如果在存储结果中没找到，使用原有的智能匹配算法
    console.log('在存储结果中未找到匹配，尝试直接条件匹配...');
    const originalMatch = findBestMPMatch(conditions);

    if (originalMatch) {
    let implicationRef = null;
    let antecedentRef = null;

    console.log(`找到条件匹配: 蕴含式="${originalMatch.implication.text}" (类型: ${originalMatch.implication.type}), 前件="${originalMatch.antecedent.text}" (类型: ${originalMatch.antecedent.type})`);

    // **关键修复：处理所有可能的蕴含式类型**
    if (originalMatch.implication.type === 'assumption') {
    const idx = getAssumptionIndexFixed(originalMatch.implication.id);
    if (idx >= 0) {
    implicationRef = `assms(${idx + 1})`;
    console.log(`蕴含式为假设，引用: ${implicationRef}`);
}
} else if (originalMatch.implication.type === 'encapsulation-result') {
    // **新增：处理封装结果类型**
    // 查找这个封装结果对应的intro_result引用
    const encapResultId = originalMatch.implication.id;
    const encapShape = document.getElementById(encapResultId);
    if (encapShape) {
    const encapId = encapShape.getAttribute('data-encapsulation-id');
    if (encapId) {
    // 找到对应的封装索引
    const encapIndex = encapsulations.findIndex(enc => enc.id === encapId);
    if (encapIndex >= 0) {
    implicationRef = `intro_result_${encapIndex + 1}`;
    console.log(`蕴含式为封装结果，引用: ${implicationRef}`);
}
}
}

    // 如果上面的方法失败，使用备选方法
    if (!implicationRef) {
    implicationRef = `intro_result_1`; // 默认使用第一个封装结果
    console.log(`使用默认封装结果引用: ${implicationRef}`);
}
} else if (originalMatch.implication.type === 'intermediate' ||
    originalMatch.implication.type === 'result') {
    // 处理中间结果或最终结果
    const stepResult = findStepResultByFormula(originalMatch.implication.text, stepIndex);
    if (stepResult) {
    implicationRef = stepResult.stepId;
    console.log(`蕴含式为步骤结果，引用: ${implicationRef}`);
} else if (stepIndex > 0) {
    implicationRef = `step${stepIndex}`;
    console.log(`使用当前步骤引用: ${implicationRef}`);
}
} else {
    // 默认处理：尝试在步骤结果中查找
    const stepResult = findStepResultByFormula(originalMatch.implication.text, stepIndex);
    if (stepResult) {
    implicationRef = stepResult.stepId;
    console.log(`蕴含式在步骤结果中找到，引用: ${implicationRef}`);
} else if (stepIndex > 0) {
    implicationRef = `step${stepIndex}`;
    console.log(`使用默认步骤引用: ${implicationRef}`);
}
}

    // **处理前件引用（保持原有逻辑）**
    if (originalMatch.antecedent.type === 'assumption') {
    const idx = getAssumptionIndexFixed(originalMatch.antecedent.id);
    if (idx >= 0) {
    antecedentRef = `assms(${idx + 1})`;
    console.log(`前件为假设，引用: ${antecedentRef}`);
}
} else if (originalMatch.antecedent.type === 'encapsulation-result') {
    // 处理前件也是封装结果的情况
    const encapResultId = originalMatch.antecedent.id;
    const encapShape = document.getElementById(encapResultId);
    if (encapShape) {
    const encapId = encapShape.getAttribute('data-encapsulation-id');
    if (encapId) {
    const encapIndex = encapsulations.findIndex(enc => enc.id === encapId);
    if (encapIndex >= 0) {
    antecedentRef = `intro_result_${encapIndex + 1}`;
    console.log(`前件为封装结果，引用: ${antecedentRef}`);
}
}
}

    if (!antecedentRef) {
    antecedentRef = `intro_result_1`;
    console.log(`使用默认封装结果前件引用: ${antecedentRef}`);
}
} else {
    const stepResult = findStepResultByFormula(originalMatch.antecedent.text, stepIndex);
    if (stepResult) {
    antecedentRef = stepResult.stepId;
    console.log(`前件在步骤结果中找到，引用: ${antecedentRef}`);
} else if (stepIndex > 0) {
    antecedentRef = `step${stepIndex}`;
    console.log(`使用默认步骤前件引用: ${antecedentRef}`);
}
}

    console.log(`最终引用: 蕴含式=${implicationRef}, 前件=${antecedentRef}`);

    if (implicationRef && antecedentRef) {
    const hasNested = hasNestedImplication(originalMatch.implication.text);
    if (hasNested) {
    return `using ${implicationRef} ${antecedentRef} by auto`;
} else {
    return `by (rule mp[OF ${implicationRef} ${antecedentRef}])`;
}
} else {
    console.log(`❌ 引用生成失败: 蕴含式=${implicationRef}, 前件=${antecedentRef}`);
}
}

    // 如果智能匹配失败，回退到简单策略
    console.log('所有匹配策略失败，使用备选策略');
    return generateFallbackMPStrategy(conditions, stepIndex);

} catch (error) {
    console.log('MP策略生成错误:', error);
    return `by (rule mp)`;
}
}
    function isImplicationFormula(formula) {
    if (!formula) return false;

    console.log(`Checking Implications: "${formula}"`);

    // 检查是否包含蕴含符号
    const implicationSymbols = ['⟶', '→', '⟹', '=>', '->'];
    const hasSymbol = implicationSymbols.some(symbol => formula.includes(symbol));

    console.log(`  inclusion of implication symbols: ${hasSymbol}`);
    return hasSymbol;
}

    function findBestMPMatchInResults(conditions, previousResults, currentStepIndex) {
    console.log('Search for MP matches in stored results...');

    for (const prevResult of previousResults) {
    console.log(`Checking procedure ${prevResult.stepId} results:`, prevResult.results);

    for (const resultFormula of prevResult.results) {
    if (!resultFormula) continue;

    const structure = parseLogicalStructure(resultFormula);
    if (structure.isImplication) {
    console.log(`Checking Implications: ${resultFormula}`);
    console.log(`Antecedent mode: ${structure.antecedent}`);

    for (const cond of conditions) {
    if (isAdvancedTextMatch(cond.text, structure.antecedent)) {
    console.log(`Search matching antecedents in the condition: ${cond.text}`);

    let antecedentRef = null;
    if (cond.type === 'assumption') {
    const idx = getAssumptionIndexFixed(cond.id);
    if (idx >= 0) {
    antecedentRef = `assms(${idx + 1})`;
}
} else {
    const stepResult = findStepResultByFormula(cond.text, currentStepIndex);
    if (stepResult) {
    antecedentRef = stepResult.stepId;
}
}

    if (antecedentRef) {
    return {
    implicationRef: prevResult.stepId,
    antecedentRef: antecedentRef
};
}
}
}

    for (const otherResult of previousResults) {
    if (otherResult.stepIndex >= prevResult.stepIndex) continue;

    for (const otherFormula of otherResult.results) {
    if (isAdvancedTextMatch(otherFormula, structure.antecedent)) {
    console.log(`在前序结果中找到匹配的前件: ${otherFormula}`);
    return {
    implicationRef: prevResult.stepId,
    antecedentRef: otherResult.stepId
};
}
}
}

    const assumptions = Array.from(document.querySelectorAll('.shape[data-type="rectangle"]'))
    .filter(shape => {
    const incomingConnections = connections.filter(conn => conn.to === shape.id);
    return incomingConnections.length === 0;
});

    for (let i = 0; i < assumptions.length; i++) {
    const assumptionText = getShapeText(assumptions[i]); // 使用修复的文本获取函数
    if (isAdvancedTextMatch(assumptionText, structure.antecedent)) {
    console.log(`在假设中找到匹配的前件: ${assumptionText}`);
    return {
    implicationRef: prevResult.stepId,
    antecedentRef: `assms(${i + 1})`
};
}
}
}
}
}

    console.log('在存储结果中未找到MP匹配');
    return null;
}

    function findBestMPMatch(conditions) {
    console.log('Start Smart MP Matching...');

    const parsedConditions = conditions.map(cond => ({
    ...cond,
    structure: parseLogicalStructure(cond.text)
}));

    console.log('Parsing results:', parsedConditions.map(c => ({
    text: c.text,
    isImplication: c.structure.isImplication,
    antecedent: c.structure.antecedent
})));

    const implications = parsedConditions.filter(c => c.structure.isImplication);

    if (implications.length === 0) {
    console.log('Implications not found');
    return null;
}

    for (const impl of implications) {
    const antecedentPattern = impl.structure.antecedent;
    console.log(`Checking Implications "${impl.text}" antecedent patterns: "${antecedentPattern}"`);

    for (const other of parsedConditions) {
    if (other.id === impl.id) continue;

    if (isAdvancedTextMatch(other.text, antecedentPattern)) {
    console.log(`Find a match: "${other.text}" Matching front parts "${antecedentPattern}"`);
    return {
    implication: impl,
    antecedent: other
};
}
}
}

    console.log('No matching MP pairs found');
    return null;
}

    function parseLogicalStructure(text) {
    if (!text) return { isImplication: false };

    console.log(`Analyze the logical structure: "${text}"`);

    const normalized = text.trim()
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/→/g, '->')
    .replace(/⟶/g, '->')
    .replace(/⟹/g, '->')
    .replace(/=>/g, '->');

    const mainImplication = findMainImplication(normalized);

    if (mainImplication) {
    console.log(`Finding the main implication antecedent="${mainImplication.antecedent}", Backpiece="${mainImplication.consequent}"`);
    return {
    isImplication: true,
    antecedent: mainImplication.antecedent,
    consequent: mainImplication.consequent
};
}

    return { isImplication: false };
}

    function findMainImplication(text) {
    const symbols = ['->', '=>'];

    for (const symbol of symbols) {
    let parenDepth = 0;
    let i = 0;

    while (i <= text.length - symbol.length) {
    const char = text[i];

    if (char === '(') {
    parenDepth++;
} else if (char === ')') {
    parenDepth--;
} else if (parenDepth === 0 && text.substring(i, i + symbol.length) === symbol) {
    const antecedent = text.substring(0, i).trim();
    const consequent = text.substring(i + symbol.length).trim();

    if (antecedent && consequent) {
    return {
    antecedent: cleanExpression(antecedent),
    consequent: cleanExpression(consequent)
};
}
}
    i++;
}
}

    return null;
}

    function cleanExpression(expr) {
    if (!expr) return expr;

    expr = expr.trim();

    while (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0;
    let canRemove = true;

    for (let i = 0; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    if (expr[i] === ')') depth--;

    if (depth === 0 && i < expr.length - 1) {
    canRemove = false;
    break;
}
}

    if (canRemove && depth === 0) {
    expr = expr.substring(1, expr.length - 1).trim();
} else {
    break;
}
}

    return expr;
}

    function isAdvancedTextMatch(text1, text2) {
    if (!text1 || !text2) return false;

    const normalize = (text) => text.trim()
    .replace(/\s+/g, ' ')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/→/g, '->')
    .replace(/⟹/g, '->')
    .replace(/=>/g, '->')
    .replace(/\band\b/gi, '∧')
    .replace(/&/g, '∧')
    .replace(/\bor\b/gi, '∨')
    .replace(/\|/g, '∨')
    .toLowerCase();

    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    const result = norm1 === norm2;

    return result;
}

    function generateFallbackMPStrategy(conditions, stepIndex) {
    console.log('Using Alternative MP Policies');

    let implicationRef = null;
    let antecedentRef = null;

    for (const cond of conditions) {
    if (cond.text && (cond.text.includes('->') || cond.text.includes('⟹') || cond.text.includes('→'))) {
    if (cond.type === 'assumption') {
    const idx = getAssumptionIndexFixed(cond.id);
    if (idx >= 0) {
    implicationRef = `assms(${idx + 1})`;
    break;
}
}
}
}

    if (implicationRef && stepIndex > 0) {
    antecedentRef = `step${stepIndex}`;
}

    if (implicationRef && antecedentRef) {
    return `by (rule mp[OF ${implicationRef} ${antecedentRef}])`;
}

    return `sorry (* Unable to generate MP policy*)`;
}

    function hasNestedImplication(implicationText) {
    if (!implicationText) return false;

    const symbols = ['⟹', '→', '->', '=>'];
    let count = 0;

    for (const symbol of symbols) {
    const matches = implicationText.split(symbol).length - 1;
    count += matches;
}

    return count > 1;
}

    //*** Default strategy
    function generateDefaultTacticFixed(step, stepIndex) {
    try {
    const using = [];

    if (stepIndex > 0) {
    using.push(`step${stepIndex}`);
}

    const conditions = step.conditions || [];
    conditions.forEach(cond => {
    if (cond.type === 'assumption') {
    const idx = getAssumptionIndexFixed(cond.id);
    if (idx >= 0) {
    using.push(`assms(${idx + 1})`);
}
}
});

    if (using.length > 0) {
    return `using ${using.join(' ')} by auto`;
}

    return `sorry (* Please fill in the specific certificates manually *)`;
} catch (error) {
    return `sorry (* Proof of policy generation failure *)`;
}
}

    // Get Assumption Index
    function getAssumptionIndexFixed(shapeId) {
    try {
    const assumptions = Array.from(document.querySelectorAll('.shape[data-type="rectangle"]'))
    .filter(shape => {
    const incomingConnections = connections.filter(conn => conn.to === shape.id);
    return incomingConnections.length === 0;
});

    return assumptions.findIndex(shape => shape.id === shapeId);
} catch (error) {
    console.log('Failed to get assumption index:', error);
    return -1;
}
}

    // Combine final prove step
    function generateImprovedFinalStepFixed(proofSteps) {
    try {
    if (!proofSteps || proofSteps.length === 0) {
    return '  show ?thesis by auto\n';
}

    if (proofSteps.length === 1) {
    return `  show ?thesis using step1 .\n`;
}

    const lastStep = proofSteps[proofSteps.length - 1];
    if (lastStep.results && lastStep.results.length > 0) {
    return `  show ?thesis using step${proofSteps.length} .\n`;
}

    const stepRefs = proofSteps.map((_, i) => `step${i + 1}`).join(' ');
    return `  show ?thesis using ${stepRefs} by auto\n`;
} catch (error) {
    return '  show ?thesis by auto\n';
}
}

    // character convert
    function convertToIsabelleLogic(text) {
    try {
    if (!text) return '';

    let converted = text
    .replace(/∧/g, '∧')
    .replace(/∨/g, '∨')
    .replace(/→/g, '⟹')
    .replace(/¬/g, '¬')
    .replace(/\^/g, '∧')
    .replace(/\|/g, '∨')
    .replace(/->/g, '⟶')
    .replace(/⟶/g, '⟶')
    .replace(/-->/g, '⟹')
    .replace(/~/g, '¬')
    .replace(/\bAND\b/gi, '∧')
    .replace(/\bOR\b/gi, '∨')
    .replace(/\bNOT\b/gi, '¬')
    .replace(/\bIMPLIES\b/gi, '⟹')
    .replace(/&/g, '∧')
    .replace(/\+/g, '∨')
    .replace(/\band\b/gi, '∧')
    .replace(/\bor\b/gi, '∨');

    converted = converted.replace(/\s+/g, ' ').trim();

    return converted;
} catch (error) {
    return text || '';
}
}

    //Improve order
    function topologicalSort(proofs) {
    console.log('Starting the topological ordering proof step...');

    // Constructing a dependency graph between proof steps
    const graph = new Map();
    const inDegree = new Map();

    // Initialization graphs and in-degree
    proofs.forEach((proof, index) => {
    graph.set(index, []);
    inDegree.set(index, 0);
});

    proofs.forEach((currentProof, currentIndex) => {
    const inputs = getProofConditions(currentProof.id);

    inputs.forEach(inputId => {
    const sourceProofIndex = proofs.findIndex(proof => proof.id === inputId);
    if (sourceProofIndex !== -1 && sourceProofIndex !== currentIndex) {
    graph.get(sourceProofIndex).push(currentIndex);
    inDegree.set(currentIndex, inDegree.get(currentIndex) + 1);
    console.log(`Dependency: Step ${sourceProofIndex} -> Step ${currentIndex}`);
}

    proofs.forEach((otherProof, otherIndex) => {
    if (otherIndex !== currentIndex) {
    const outputs = getProofResults(otherProof.id);
    if (outputs.includes(inputId)) {
    graph.get(otherIndex).push(currentIndex);
    inDegree.set(currentIndex, inDegree.get(currentIndex) + 1);
    console.log(`Output dependency: Step ${otherIndex} -> Step ${currentIndex}`);
}
}
});
});
});

    const queue = [];
    const result = [];

    for (let [index, degree] of inDegree.entries()) {
    if (degree === 0) {
    queue.push(index);
}
}

    while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);


    graph.get(current).forEach(neighbor => {
    inDegree.set(neighbor, inDegree.get(neighbor) - 1);
    if (inDegree.get(neighbor) === 0) {
    queue.push(neighbor);
}
});
}


    if (result.length !== proofs.length) {
    console.warn('Detect cyclic dependencies, use original order');
    return proofs.map((_, index) => index);
}

    console.log('Topological ordering results:', result);
    return result;
}

    function clearCanvas() {
    const shapes = canvas.querySelectorAll('.shape');
    shapes.forEach(shape => shape.remove());

    connections = [];
    encapsulations = [];
    shapeCount = 0;
    scrollY = 0;
    proofStepResults.clear();
    stepResultCounter = 0;
    clearSelection();

    updateCounter();
    calculateMaxScroll();

    canvas.style.transform = `translateY(0px)`;
    updateConnections();

    if (isConnectMode) {
    toggleConnectMode();
}
    // 新增：退出封装模式
    if (isEncapsulateMode) {
    toggleEncapsulateMode();
}

    console.log('Clear all');
}

    function updateCounter() {
    document.getElementById('counter').textContent = `Number of components: ${shapeCount}`;
}


    function generateIsabelle() {
    proofStepResults.clear();
    stepResultCounter = 0;

    try {
    const analysis = analyzeReasoning();
    const code = generateIsabelleCode(analysis);

    document.getElementById('analysisBlock').textContent = analysis.description;
    document.getElementById('codeBlock').innerHTML = `<button class="copy-btn" onclick="copyCode()">复制</button>${code}`;
    document.getElementById('isabellePanel').classList.add('show');
} catch (error) {
    console.error('Error generating Isabelle code:', error);
    alert('Error generating Isabelle code: ' + error.message);
}
}

    function analyzeReasoning() {
    const shapes = Array.from(document.querySelectorAll('.shape'));
    const assumptions = [];
    const theorems = [];
    const proofs = [];
    const decisions = [];
    const results = [];
    const intros = [];
    const encapResults = [];

    shapes.forEach(shape => {
    const text = getShapeText(shape);
    if (!text) return;

    const type = shape.getAttribute('data-type');
    const shapeData = { id: shape.id, text: text };

    if (type === 'intro') {
    const encapId = shape.getAttribute('data-encapsulation-id');
    const encapsulation = encapsulations.find(enc => enc.id === encapId);
    if (encapsulation) {
    intros.push({
    ...shapeData,
    formula: encapsulation.formula,
    encapsulation: encapsulation
});
}
} else if (shape.classList.contains('encapsulation-result')) {
    const encapId = shape.getAttribute('data-encapsulation-id');
    const encapsulation = encapsulations.find(enc => enc.id === encapId);
    encapResults.push({
    ...shapeData,
    encapsulation: encapsulation
});
} else if (type === 'rectangle') {
    const incomingConnections = connections.filter(conn => conn.to === shape.id && !conn.encapsulated);
    const outgoingConnections = connections.filter(conn => conn.from === shape.id && !conn.encapsulated);

    if (incomingConnections.length === 0 && outgoingConnections.length > 0) {
    assumptions.push(shapeData);
} else if (incomingConnections.length > 0 && outgoingConnections.length === 0) {
    results.push(shapeData);
} else {
    assumptions.push(shapeData);
}
} else if (type === 'circle') {
    theorems.push(shapeData);
} else if (type === 'diamond') {
    proofs.push(shapeData);
} else if (type === 'diamond-decision') {
    decisions.push(shapeData);
}
});

    const sortedIndices = topologicalSort(proofs);
    const sortedProofs = sortedIndices.map(index => proofs[index]);

    console.log('Sequence of steps in the original proof:', proofs.map(p => p.text));
    console.log('Prove the sequence of steps after sorting:', sortedProofs.map(p => p.text));

    // Analyzing Connecting Relationships and Reasoning Steps
    const reasoning_steps = [];
    const proofSteps = [];

    // Analyze the inputs and outputs for each proof
    sortedProofs.forEach((proof, logicalIndex) => {
    const conditions = getProofConditions(proof.id);
    const results = getProofResults(proof.id);

    const stepData = {
    proof: proof,
    logicalOrder: logicalIndex,
    originalIndex: proofs.findIndex(p => p.id === proof.id),
    conditions: conditions.map(id => {
    const shape = document.getElementById(id);
    return {
    id: id,
    text: shape ? getShapeText(shape) : '',
    type: shape ? getShapeType(shape) : 'unknown'
};
}),
    results: results.map(id => {
    const shape = document.getElementById(id);
    return {
    id: id,
    text: shape ? getShapeText(shape) : '',
    type: shape ? getShapeType(shape) : 'unknown'
};
})
};

    proofSteps.push(stepData);

    const resultFormulas = stepData.results.map(r => r.text).filter(t => t);
    const dependencies = stepData.conditions.map(c => c.text).filter(t => t);
    storeProofStepResult(logicalIndex, proof.id, proof.text, resultFormulas, dependencies);
});

    // Generate an analytical description
    let description = "🔍 Analysis of the reasoning process:\n\n";

    description += `📋 Assumptions/Conditions: ${assumptions.length}个\n`;
    assumptions.forEach((a, i) => {
    description += `  A${i+1}: ${a.text}\n`;
});

    description += `\n🔬 Theorems: ${theorems.length}个\n`;
    theorems.forEach((t, i) => {
    description += `  T${i+1}: ${t.text}\n`;
});

    if (intros.length > 0) {
    description += `\n📦 No. of Encapsulated Rules: ${intros.length}\n`;
    intros.forEach((intro, i) => {
    description += `  E${i+1}: ${intro.formula}\n`;
    if (intro.encapsulation) {
    //
    const formulaInputs = intro.encapsulation.inputs.filter(inp => !inp.isExternal && inp.type !== 'intermediate');
    const externalDeps = intro.encapsulation.inputs.filter(inp => inp.isExternal);

    if (formulaInputs.length > 0) {
    description += `    📥 Encapsulation Inputs: ${formulaInputs.map(inp => inp.text).join(', ')}\n`;
}
    if (externalDeps.length > 0) {
    description += `    🔗 External dependencies: ${externalDeps.map(dep => dep.text).join(', ')} (For proof only)\n`;
}
    description += `    📤 Outputs: ${intro.encapsulation.outputs.map(out => out.text).join(', ')}\n`;
}
});
}

    if (encapResults.length > 0) {
    description += `\n🎯 Encapsulation Results: ${encapResults.length}个\n`;
    encapResults.forEach((result, i) => {
    description += `  ER${i+1}: ${result.text}\n`;
    description += `    📜 Source (of information etc): ${result.encapsulation ? result.encapsulation.formula : 'Unknown Encapsulation'}\n`;
});
}

    description += `\n⚡ Proof Steps: ${proofSteps.length}个\n`;
    proofSteps.forEach((step, i) => {
    description += `  P${i+1}: ${step.proof.text}`;
    if (step.originalIndex !== i) {
    description += ` Original order: ${step.originalIndex + 1}]`;
}
    description += `\n`;
    if (step.conditions.length > 0) {
    description += `    📥 Input: ${step.conditions.map(c => c.text).join(', ')}\n`;
}
    if (step.results.length > 0) {
    description += `    📤 Output: ${step.results.map(r => r.text).join(', ')}\n`;
}
    const storedResult = getProofStepResult(i);
    if (storedResult) {
    description += `    🔄 StepID: ${storedResult.stepId}\n`;
}
});

    if (decisions.length > 0) {
    description += `\n🔀 Decision Points: ${decisions.length}个\n`;
    decisions.forEach((d, i) => {
    description += `  D${i+1}: ${d.text}\n`;
});
}

    if (results.length > 0) {
    description += `\n🎯 Results: ${results.length}个\n`;
    results.forEach((r, i) => {
    description += `  R${i+1}: ${r.text}\n`;
});
}

    description += `\n🔗 Connection relationship: ${connections.filter(c => !c.encapsulated).length}条\n`;
    connections.filter(c => !c.encapsulated).forEach((conn, i) => {
    const fromShape = document.getElementById(conn.from);
    const toShape = document.getElementById(conn.to);
    if (fromShape && toShape) {
    const fromText = getShapeText(fromShape); // 使用修复的文本获取函数
    const toText = getShapeText(toShape); // 使用修复的文本获取函数
    description += `  ${i+1}. "${fromText}" → "${toText}"\n`;
}
});

    if (encapsulations.length > 0) {
    description += `\n📦 Encapsulation Information: ${encapsulations.length}个\n`;
    encapsulations.forEach((enc, i) => {
    description += `  Encapsulation${i+1}: ${enc.formula}\n`;
});
}

    return {
    assumptions,
    theorems,
    proofs: sortedProofs,
    decisions,
    results,
    intros,
    encapResults,
    proofSteps,
    reasoning_steps,
    description
};
}

    function getShapeType(shape) {
    const type = shape.getAttribute('data-type');
    const isEncapResult = shape.classList.contains('encapsulation-result');

    if (isEncapResult) {
    return 'encapsulation-result';
}

    if (type === 'rectangle') {
    const incomingConnections = connections.filter(conn => conn.to === shape.id);
    const outgoingConnections = connections.filter(conn => conn.from === shape.id);

    if (incomingConnections.length === 0 && outgoingConnections.length > 0) {
    return 'assumption';
}
    if (incomingConnections.length > 0 && outgoingConnections.length === 0) {
    return 'result';
}
    if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
    return 'intermediate';
}
    return 'assumption';
}
    if (type === 'circle') return 'theorem';
    if (type === 'diamond') return 'proof';
    if (type === 'diamond-decision') return 'decision';
    if (type === 'intro') return 'intro';
    return 'unknown';
}

    function getProofConditions(proofId) {
    return connections
    .filter(conn => conn.to === proofId && !conn.encapsulated)
    .map(conn => conn.from);
}

    function getProofResults(proofId) {
    return connections
    .filter(conn => conn.from === proofId && !conn.encapsulated)
    .map(conn => conn.to);
}

    function storeProofStepResult(stepIndex, shapeId, formula, resultFormulas, dependencies) {
    const stepData = {
    stepId: `step${stepIndex + 1}`,
    results: resultFormulas || [formula],
    shapeId: shapeId
};

    proofStepResults.set(stepIndex, stepData);
    console.log(`Store the results of the proof step - Step ${stepIndex + 1}:`, stepData);

    return stepData;
}

    function getProofStepResult(stepIndex) {
    return proofStepResults.get(stepIndex);
}

    function getAvailablePreviousResults(currentStepIndex) {
    const available = [];

    for (let i = 0; i < currentStepIndex; i++) {
    const stepResult = proofStepResults.get(i);
    if (stepResult) {
    available.push({
    stepIndex: i,
    stepId: stepResult.stepId,
    results: stepResult.results
});
}
}

    return available;
}

    function findStepResultByFormula(formula, beforeStepIndex = null) {
    const normalizedFormula = convertToIsabelleLogic(formula);

    for (let [stepIndex, stepData] of proofStepResults.entries()) {
    if (beforeStepIndex !== null && stepIndex >= beforeStepIndex) {
    continue;
}

    for (let result of stepData.results) {
    if (convertToIsabelleLogic(result) === normalizedFormula) {
    return {
    stepIndex: stepIndex,
    stepId: stepData.stepId,
    formula: result
};
}
}
}

    return null;
}

    function closeIsabellePanel() {
    document.getElementById('isabellePanel').classList.remove('show');
}

    function copyCode() {
    const codeBlock = document.getElementById('codeBlock');
    const text = codeBlock.textContent.replace('Copy', '').trim();

    navigator.clipboard.writeText(text).then(() => {
    const copyBtn = codeBlock.querySelector('.copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#28a745';

    setTimeout(() => {
    copyBtn.textContent = originalText;
    copyBtn.style.background = '#007bff';
}, 2000);
}).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    alert('Code copied to clipboard!');
});
}

    // Main part to generate the whole Isabelle code
    function generateIsabelleCode(analysis) {
    let code = '';

    code += 'theory ProofGenerated\n';
    code += '  imports Main\n';
    code += 'begin\n\n';


    if (analysis.theorems.length > 0) {
    code += '(* Known Theorem *)\n';
    analysis.theorems.forEach((theorem, i) => {
    const thmName = `known_theorem_${i+1}`;
    code += `axiomatization where\n`;
    code += `  ${thmName}: "${convertToIsabelleLogic(theorem.text)}"\n\n`;
});
}

    if (analysis.intros && analysis.intros.length > 0) {
    code += '(* Encapsulation Rules - as Reusable Lemmas *)\n';
    analysis.intros.forEach((intro, i) => {
    const lemmaName = `encapsulated_rule_${i+1}`;
    const encapsulation = intro.encapsulation;

    console.log(`=== Generate encapsulation rules ${i+1} ===`);
    console.log('encapsulated object:', encapsulation);
    console.log('encapsulation.inputs:', encapsulation.inputs);
    console.log('encapsulation.externalDependencies:', encapsulation.externalDependencies);

    code += `lemma ${lemmaName}:\n`;

    const encapsulationInputs = encapsulation.inputs.filter(inp => inp.isEncapsulationInput);
    const externalDependencies = encapsulation.externalDependencies || [];

    console.log('Filtered encapsulated inputs:', encapsulationInputs.map(inp => inp.text));
    console.log('External dependencies:', externalDependencies.map(dep => dep.text));

    const allAssumptions = [...encapsulationInputs, ...externalDependencies];

    console.log('All assumptions:', allAssumptions.map(ass => ass.text));

    if (allAssumptions.length > 0) {
    const premises = allAssumptions
    .filter(assumption => assumption.text.trim())
    .map((assumption, j) => {
    const type = assumption.isExternal ? 'External dependency' : 'Encapsulation input';
    console.log(`Generate assumes[${j}]: "${assumption.text}" (Type: ${type}, ID: ${assumption.id})`);
    return `"${convertToIsabelleLogic(assumption.text)}"`;
})
    .join(' and ');

    console.log('The final premises string:', premises);

    if (premises) {
    code += `  assumes ${premises}\n`;
}
}

    code += `  shows "${convertToIsabelleLogic(encapsulation.formula)}"\n`;

    if (encapsulation.proofSteps.length > 0) {
    code += 'proof -\n';

    console.log(`=== Generate Encapsulation ${i+1} Internal Proofs ===`);

    const sortedIndices = topologicalSort(encapsulation.proofSteps);
    const sortedEncapProofs = sortedIndices.map(index => encapsulation.proofSteps[index]);

    const encapProofSteps = [];
    const encapsulatedIds = encapsulation.shapes.map(shape => shape.id);

    const originalProofStepResults = new Map(proofStepResults);
    proofStepResults.clear();

    sortedEncapProofs.forEach((proof, logicalIndex) => {
    console.log(`Analyze the internal proof steps of the package ${logicalIndex + 1}: ${proof.text} (ID: ${proof.id})`);

    const conditionIds = getProofConditionsForEncapsulation(proof.id, encapsulatedIds);
    const resultIds = getProofResultsForEncapsulation(proof.id, encapsulatedIds);

    const conditions = conditionIds
    .map(condId => {
    const shape = document.getElementById(condId);
    if (shape) {
    return {
    id: condId,
    text: getShapeText(shape),
    type: getShapeType(shape)
};
}
    return null;
})
    .filter(cond => cond && cond.text);

    const results = resultIds
    .map(resultId => {
    const shape = document.getElementById(resultId);
    if (shape) {
    return {
    id: resultId,
    text: getShapeText(shape),
    type: getShapeType(shape)
};
}
    return null;
})
    .filter(result => result && result.text);

    console.log(`  No. of conditions: ${conditions.length}`, conditions.map(c => `${c.text} (${c.type})`));
    console.log(`  Results: ${results.length}`, results.map(r => `${r.text} (${r.type})`));

    const stepData = {
    proof: proof,
    logicalOrder: logicalIndex,
    originalIndex: encapsulation.proofSteps.findIndex(p => p.id === proof.id),
    conditions: conditions,
    results: results
};

    encapProofSteps.push(stepData);

    const resultFormulas = stepData.results.map(r => r.text).filter(t => t);
    const dependencies = stepData.conditions.map(c => c.text).filter(t => t);
    storeProofStepResult(logicalIndex, proof.id, proof.text, resultFormulas, dependencies);
});

    encapProofSteps.forEach((step, index) => {
    code += `  (* Encapsulation internal steps ${index + 1}: ${step.proof.text}`;
    if (step.originalIndex !== index) {
    code += ` [Original order: ${step.originalIndex + 1}]`;
}
    code += ` *)\n`;

    let stepFormula = '';

    if (step.results.length > 0) {
    stepFormula = step.results
    .filter(res => res.text.trim())
    .map(res => `"${convertToIsabelleLogic(res.text)}"`)
    .join(' and ');
} else {
    // 如果没有明确的输出，使用步骤描述
    stepFormula = `"${convertToIsabelleLogic(step.proof.text)}"`;
}

    if (stepFormula) {
    code += `  have encap_step_${index + 1}: ${stepFormula}\n`;

    let tactic = generateImprovedTacticFixed(step, index, encapProofSteps);
    tactic = adjustTacticForEncapsulation(tactic, allAssumptions, index, step);
    code += `    ${tactic}\n`;
}
    code += '\n';
});

    // 生成正确的最终步骤
    code += '  (* Combining the internal steps of encapsulation to derive the encapsulation formula *)\n';

    if (encapProofSteps.length > 0) {
    let lastOutputStep = null;
    for (let i = encapProofSteps.length - 1; i >= 0; i--) {
    if (encapProofSteps[i].results.length > 0) {
    lastOutputStep = i + 1;
    break;
}
}

    if (lastOutputStep && encapsulation.outputs.length > 0) {
    const firstInput = allAssumptions.find(input => !input.isExternal);
    if (firstInput) {
    code += `  show ?thesis\n`;
    code += `  proof\n`;
    code += `    assume "${convertToIsabelleLogic(firstInput.text)}"\n`;
    code += `    show "${convertToIsabelleLogic(encapsulation.outputs[0].text)}" using encap_step_${lastOutputStep} by auto\n`;
    code += `  qed\n`;
} else {
    code += `  show ?thesis using encap_step_${lastOutputStep} by auto\n`;
}
} else {
    code += `  show ?thesis by auto\n`;
}
} else {
    code += `  show ?thesis by auto\n`;
}

    proofStepResults.clear();
    for (let [key, value] of originalProofStepResults) {
    proofStepResults.set(key, value);
}

    code += 'qed\n\n';
} else {
    code += '  by auto\n\n';
}
});
}

    if (analysis.proofSteps.length > 0 || (analysis.intros && analysis.intros.length > 0)) {
    code += '(* Main Proof *)\n';
    code += `lemma main_proof:\n`;

    const encapsulatedShapeIds = new Set();
    if (analysis.intros) {
    analysis.intros.forEach(intro => {
    intro.encapsulation.shapes.forEach(shape => {
    encapsulatedShapeIds.add(shape.id);
});
});
}

    const trueAssumptions = analysis.assumptions.filter(assumption => {
    const incomingConnections = connections.filter(conn =>
    conn.to === assumption.id &&
    !conn.encapsulated &&
    !encapsulatedShapeIds.has(conn.from)
    );
    return incomingConnections.length === 0 && !encapsulatedShapeIds.has(assumption.id);
});

    console.log('True Assumptions:', trueAssumptions.map(a => a.text));

    if (trueAssumptions.length > 0) {
    const premises = trueAssumptions
    .filter(assumption => assumption.text.trim())
    .map((assumption, i) => `"${convertToIsabelleLogic(assumption.text)}"`)
    .join(' and ');
    if (premises) {
    code += `  assumes ${premises}\n`;
}
}

    const finalConclusions = getFinalConclusionsFixed(analysis);

    if (finalConclusions.length > 0) {
    const conclusions = finalConclusions
    .map(conclusion => `"${convertToIsabelleLogic(conclusion.text)}"`)
    .join(' and ');
    code += `  shows ${conclusions}\n`;
}

    code += 'proof -\n';

    if (analysis.intros && analysis.intros.length > 0) {
    code += '  (* Application of encapsulation rules *)\n';
    analysis.intros.forEach((intro, i) => {
    const encapsulation = intro.encapsulation;

    const encapsulationInputs = encapsulation.inputs.filter(inp => inp.isEncapsulationInput);
    const externalDependencies = encapsulation.externalDependencies || [];
    const allEncapAssumptions = [...externalDependencies, ...encapsulationInputs];

    code += `  (* Apply encapsulation rules ${i+1}: ${intro.formula} *)\n`;

    const encapFormula = convertToIsabelleLogic(encapsulation.formula);
    code += `  have intro_result_${i+1}: "${encapFormula}"\n`;

    if (allEncapAssumptions.length > 0) {
    const inputRefs = allEncapAssumptions.map(input => {
    const assumptionIndex = trueAssumptions.findIndex(ta =>
    ta.text.trim() === input.text.trim());
    if (assumptionIndex >= 0) {
    console.log(`Encapsulation input "${input.text}" Mapping to Main Assumptions assms(${assumptionIndex + 1})`);
    return `assms(${assumptionIndex + 1})`;
}

    // 如果在主假设中找不到，可能是其他步骤的结果
    console.warn(`Encapsulation input "${input.text}" not found in main assumptions`);
    return null;
}).filter(ref => ref !== null);

    if (inputRefs.length > 0) {
    code += `    by (rule encapsulated_rule_${i+1}[OF ${inputRefs.join(' ')}])\n`;
} else {
    code += `    by (rule encapsulated_rule_${i+1})\n`;
}
} else {
    code += `    by (rule encapsulated_rule_${i+1})\n`;
}
    code += '\n';
});
}

    const nonEncapsulatedProofSteps = analysis.proofSteps.filter(step => {
    return !encapsulatedShapeIds.has(step.proof.id);
});

    console.log('Non-encapsulated proof steps:', nonEncapsulatedProofSteps.map(s => s.proof.text));

    nonEncapsulatedProofSteps.forEach((step, index) => {
    code += `  (* Proof Step ${index + 1}: ${step.proof.text}`;
    if (step.originalIndex !== undefined && step.originalIndex !== index) {
    code += ` [Original order: ${step.originalIndex + 1}]`;
}
    code += ` *)\n`;

    let stepFormula = '';

    if (step.results.length > 0) {
    stepFormula = step.results
    .filter(res => res.text.trim())
    .map(res => `"${convertToIsabelleLogic(res.text)}"`)
    .join(' and ');
} else {
    stepFormula = `"${convertToIsabelleLogic(step.proof.text)}"`;
}

    if (stepFormula) {
    code += `  have step${index + 1}: ${stepFormula}\n`;
    const tactic = generateImprovedTacticFixed(step, index, nonEncapsulatedProofSteps);
    code += `    ${tactic}\n`;
}
    code += '\n';
});

    code += '  (* Combine all steps to reach a conclusion *)\n';
    if (analysis.intros && analysis.intros.length > 0 && nonEncapsulatedProofSteps.length > 0) {
    const introRefs = analysis.intros.map((_, i) => `intro_result_${i+1}`).join(' ');
    const stepRefs = nonEncapsulatedProofSteps.map((_, i) => `step${i+1}`).join(' ');
    code += `  show ?thesis using ${introRefs} ${stepRefs} by auto\n`;
} else if (analysis.intros && analysis.intros.length > 0) {
    const introRefs = analysis.intros.map((_, i) => `intro_result_${i+1}`).join(' ');
    code += `  show ?thesis using ${introRefs} by auto\n`;
} else if (nonEncapsulatedProofSteps.length > 0) {
    code += generateImprovedFinalStepFixed(nonEncapsulatedProofSteps);
} else {
    code += `  show ?thesis by auto\n`;
}

    code += 'qed\n\n';
}

    code += 'end';
    return code;
}

    function adjustTacticForEncapsulation(tactic, allInputs, currentStepIndex, originalStep = null) {
    let adjustedTactic = tactic;

    adjustedTactic = adjustedTactic.replace(/step(\d+)/g, 'encap_step_$1');


    if (adjustedTactic.includes('intro_result') || adjustedTactic.includes('sorry')) {
    console.log('Improper references detected, regenerate policy...');

    if (originalStep) {

    const encapContextStep = {
    ...originalStep,
    conditions: originalStep.conditions.map(cond => {

    const inputMatch = allInputs.find(input => input.id === cond.id);
    if (inputMatch) {
    return { ...cond, type: 'assumption' };
}
    return cond;
})
};

    let newTactic = generateImprovedTacticFixed(encapContextStep, currentStepIndex, []);

    newTactic = newTactic.replace(/step(\d+)/g, 'encap_step_$1');
    newTactic = newTactic.replace(/intro_result_\d+/g, 'assms(1)');

    console.log(`Re-generated strategies: ${newTactic}`);
    return newTactic;
}
}

    adjustedTactic = adjustedTactic.replace(/assms\((\d+)\)/g, (match, num) => {
    const assumptionIndex = parseInt(num) - 1;
    if (assumptionIndex < allInputs.length) {
    return match;
}
    if (currentStepIndex > 0) {
    return `encap_step_${currentStepIndex}`;
}
    return match;
});

    adjustedTactic = adjustedTactic.replace(/intro_result_\d+/g, 'assms(1)');

    console.log(`Final Adjustment Strategy: ${adjustedTactic}`);
    return adjustedTactic;
}

    function getProofConditionsForEncapsulation(proofId, encapsulatedIds) {
    return connections
    .filter(conn => {

    if (conn.to !== proofId) return false;


    if (encapsulatedIds.includes(conn.from)) {
    return true;
}


    return !conn.encapsulated;
})
    .map(conn => conn.from);
}

    function getProofResultsForEncapsulation(proofId, encapsulatedIds) {

    return connections
    .filter(conn => {

    if (conn.from !== proofId) return false;


    if (encapsulatedIds.includes(conn.to)) {
    return true;
}
    return !conn.encapsulated;
})
    .map(conn => conn.to);
}

    function getFinalConclusions(analysis) {
    const finalConclusions = [];

    if (analysis.results && analysis.results.length > 0) {
    analysis.results.forEach(result => {
    if (result.text && result.text.trim()) {
    finalConclusions.push(result);
}
});
}

    if (analysis.encapResults && analysis.encapResults.length > 0) {
    analysis.encapResults.forEach(encapResult => {
    if (encapResult.text && encapResult.text.trim()) {
    finalConclusions.push(encapResult);
}
});
}

    if (finalConclusions.length === 0) {
    const shapes = Array.from(document.querySelectorAll('.shape'));
    shapes.forEach(shape => {
    const type = shape.getAttribute('data-type');
    const isEncapResult = shape.classList.contains('encapsulation-result');

    if (type === 'rectangle' || isEncapResult) {
    const outgoingConnections = connections.filter(conn => conn.from === shape.id && !conn.encapsulated);
    if (outgoingConnections.length === 0) {
    const text = getShapeText(shape);
    if (text) {
    finalConclusions.push({ id: shape.id, text: text });
}
}
}
});
}

    if (finalConclusions.length === 0 && analysis.intros && analysis.intros.length > 0) {
    analysis.intros.forEach(intro => {
    const encapId = intro.encapsulation?.id;
    if (encapId) {
    const resultShape = document.getElementById(`encap-result-${encapId}`);
    if (resultShape) {
    const text = getShapeText(resultShape);
    if (text) {
    finalConclusions.push({ id: resultShape.id, text: text });
}
}
}
});
}

    return finalConclusions;
}
    function updateConnections() {
    const svg = document.getElementById('connectionSvg');

    svg.innerHTML = `
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7"
                    refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#000000" />
            </marker>
        </defs>
    `;

    connections.forEach((conn, index) => {
    const fromElement = document.getElementById(conn.from);
    const toElement = document.getElementById(conn.to);

    if (fromElement && toElement) {
    const fromRect = fromElement.getBoundingClientRect();
    const toRect = toElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    const fromX = fromRect.left - canvasRect.left + fromRect.width / 2;
    const fromY = fromRect.top - canvasRect.top + fromRect.height / 2;
    const toX = toRect.left - canvasRect.left + toRect.width / 2;
    const toYcenter = toRect.top - canvasRect.top + toRect.height / 2;

    let toY = 0;
    if (fromY <= toYcenter) {
    toY = toYcenter - toRect.height / 2;
} else {
    toY = toYcenter + toRect.height / 2;
}

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromX);
    line.setAttribute('y1', fromY);
    line.setAttribute('x2', toX);
    line.setAttribute('y2', toY);
    line.setAttribute('stroke', conn.encapsulated ? '#95a5a6' : '#000000');
    line.setAttribute('stroke-width', conn.encapsulated ? '2' : '3');
    line.setAttribute('marker-end', 'url(#arrowhead)');

    if (conn.encapsulated) {
    line.setAttribute('stroke-dasharray', '5,5');
    line.setAttribute('opacity', '0.6');
    line.classList.add('encapsulated-line');
} else {
    line.classList.add('connection-line');
    line.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';
}

    svg.appendChild(line);
}
});
}
