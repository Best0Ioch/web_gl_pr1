'use strict'; 

let gl;
let surface;
let shProgram;
let spaceball;
let canvasGlobal;
let zoom = -5;
let lightSphere;

let projectionMatrix = m4.identity();
let modelMatrix = m4.identity();
let viewMatrix = m4.identity();
let normalMatrix4 = m4.identity();
let inverseViewMatrix = m4.identity();
let zoomMatrix = m4.identity();
let lightModelMatrix = m4.identity();

let lightPos = new Float32Array(3);
let viewPos_WorldSpace = new Float32Array(3);
let normalMatrix = new Float32Array(9);
let lightNormalMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

// Текстури
let diffuseTexture, specularTexture, normalTexture;

// Texture scaling and point movement
let textureScaleU = 1.0;
let textureScaleV = 1.0;
let pointU = 0.5;
let pointV = 0.5;
let pointSize = 0.05;

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iAttribTexCoord = -1;
    this.iAttribTangent = -1;
    this.iModelMatrix = -1;
    this.iViewMatrix = -1;
    this.iProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.uLightPosition = -1;
    this.uViewPosition = -1;
    this.uAmbientColor = -1;
    this.uShininess = -1;
    this.uIsLight = -1;
    this.uDiffuseTexture = -1;
    this.uSpecularTexture = -1;
    this.uNormalTexture = -1;
    this.uTextureScale = -1;
    this.uPointPosition = -1;
    this.uPointSize = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function loadTexture(url) {
    return new Promise((resolve, reject) => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);

        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
            
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            
            resolve(texture);
        };
        image.onerror = reject;
        image.src = url;
    });
}

async function loadTextures() {
    diffuseTexture = await loadTexture('Utils/textures/diffuse.jpg');
    specularTexture = await loadTexture('Utils/textures/specular.jpg');
    normalTexture = await loadTexture('Utils/textures/normal.jpg');
}

function resizeCanvasToDisplaySize(canvas) {
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        return true;
    }
    return false;
}

function draw() {
    const resized = resizeCanvasToDisplaySize(canvasGlobal);
    if (resized) {
        gl.viewport(0, 0, canvasGlobal.width, canvasGlobal.height);
        projectionMatrix = m4.perspective(Math.PI / 6, canvasGlobal.width / canvasGlobal.height, 0.1, 100);
    }

    gl.clearColor(0.02, 0.02, 0.02, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const lightModeValue = document.querySelector('input[name="lightMode"]:checked').value;
    const isLightStatic = (lightModeValue === "static");

    if (isLightStatic) {
        lightPos[0] = 8;
        lightPos[1] = 4;
        lightPos[2] = 0;
    } else {
        let t = performance.now() * 0.001;
        let lightRadius = 8;
        lightPos[0] = lightRadius * Math.cos(t);
        lightPos[1] = 4;
        lightPos[2] = lightRadius * Math.sin(t);
    }
    
    viewMatrix = m4.translation(0, 0, zoom);
    modelMatrix = spaceball.getViewMatrix();
    normalMatrix4 = m4.transpose(m4.inverse(modelMatrix));
    
    normalMatrix[0] = normalMatrix4[0];
    normalMatrix[1] = normalMatrix4[1];
    normalMatrix[2] = normalMatrix4[2];
    normalMatrix[3] = normalMatrix4[4];
    normalMatrix[4] = normalMatrix4[5];
    normalMatrix[5] = normalMatrix4[6];
    normalMatrix[6] = normalMatrix4[8];
    normalMatrix[7] = normalMatrix4[9];
    normalMatrix[8] = normalMatrix4[10];

    inverseViewMatrix = m4.inverse(viewMatrix);
    viewPos_WorldSpace[0] = inverseViewMatrix[12];
    viewPos_WorldSpace[1] = inverseViewMatrix[13];
    viewPos_WorldSpace[2] = inverseViewMatrix[14];

    shProgram.Use();
    
    gl.uniformMatrix4fv(shProgram.iModelMatrix, false, modelMatrix);
    gl.uniformMatrix4fv(shProgram.iViewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionMatrix);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix);
    
    gl.uniform3fv(shProgram.uLightPosition, lightPos);
    gl.uniform3fv(shProgram.uViewPosition, viewPos_WorldSpace);
    gl.uniform3fv(shProgram.uAmbientColor, [0.1, 0.1, 0.1]);
    gl.uniform1f(shProgram.uShininess, 32.0);
    gl.uniform1i(shProgram.uIsLight, 0);
    gl.uniform2f(shProgram.uTextureScale, textureScaleU, textureScaleV);
    gl.uniform2f(shProgram.uPointPosition, pointU, pointV);
    gl.uniform1f(shProgram.uPointSize, pointSize);

    // Активація текстур
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(shProgram.uDiffuseTexture, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTexture);
    gl.uniform1i(shProgram.uSpecularTexture, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(shProgram.uNormalTexture, 2);

    surface.Draw();

    lightModelMatrix = m4.translation(lightPos[0], lightPos[1], lightPos[2]);
    gl.uniformMatrix4fv(shProgram.iModelMatrix, false, lightModelMatrix);
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, lightNormalMatrix);
    gl.uniform1i(shProgram.uIsLight, 1);
    
    lightSphere.Draw();

    requestAnimationFrame(draw);
}

async function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Phong', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTexCoord = gl.getAttribLocation(prog, "texCoord");
    shProgram.iAttribTangent = gl.getAttribLocation(prog, "tangent");
    shProgram.iModelMatrix = gl.getUniformLocation(prog, "ModelMatrix");
    shProgram.iViewMatrix = gl.getUniformLocation(prog, "ViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.uLightPosition = gl.getUniformLocation(prog, "uLightPosition");
    shProgram.uViewPosition = gl.getUniformLocation(prog, "uViewPosition");
    shProgram.uAmbientColor = gl.getUniformLocation(prog, "uAmbientColor");
    shProgram.uShininess = gl.getUniformLocation(prog, "uShininess");
    shProgram.uIsLight = gl.getUniformLocation(prog, "uIsLight");
    shProgram.uDiffuseTexture = gl.getUniformLocation(prog, "uDiffuseTexture");
    shProgram.uSpecularTexture = gl.getUniformLocation(prog, "uSpecularTexture");
    shProgram.uNormalTexture = gl.getUniformLocation(prog, "uNormalTexture");
    shProgram.uTextureScale = gl.getUniformLocation(prog, "uTextureScale");
    shProgram.uPointPosition = gl.getUniformLocation(prog, "uPointPosition");
    shProgram.uPointSize = gl.getUniformLocation(prog, "uPointSize");

    await loadTextures();

    surface = new Model('Surface');
    updateSurfaceData();

    lightSphere = new Model('LightSphere');
    let sphereData = createSphere(0.3, 12, 8);
    lightSphere.BufferData(sphereData.verts, sphereData.normals, [], [], sphereData.indices);

    gl.enable(gl.DEPTH_TEST);
    
    resizeCanvasToDisplaySize(canvasGlobal);
    gl.viewport(0, 0, canvasGlobal.width, canvasGlobal.height);
    projectionMatrix = m4.perspective(Math.PI / 6, canvasGlobal.width / canvasGlobal.height, 0.1, 100);
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vsh));
    }

    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fsh));
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program: " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function createSphere(radius, lats, longs) {
    let vertices = [];
    let normals = [];
    let indices = [];

    for (let i = 0; i <= lats; i++) {
        let lat = Math.PI * (-0.5 + i / lats);
        let sinLat = Math.sin(lat);
        let cosLat = Math.cos(lat);

        for (let j = 0; j <= longs; j++) {
            let lon = 2 * Math.PI * j / longs;
            let sinLon = Math.sin(lon);
            let cosLon = Math.cos(lon);

            let x = cosLon * cosLat;
            let y = sinLon * cosLat;
            let z = sinLat;

            vertices.push(x * radius, y * radius, z * radius);
            normals.push(x, y, z);
        }
    }

    for (let i = 0; i < lats; i++) {
        for (let j = 0; j < longs; j++) {
            let first = (i * (longs + 1)) + j;
            let second = first + longs + 1;

            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return { verts: vertices, normals: normals, indices: indices };
}

function updateSurfaceData() {
    let n = parseInt(document.getElementById("nValue").value);
    let uSteps = parseInt(document.getElementById("uSteps").value);
    let vSteps = parseInt(document.getElementById("vSteps").value);
    
    let data = CreateSurfaceData(n, uSteps, vSteps);
    let indices = generateIndices(uSteps, vSteps);
    
    surface.BufferData(data.vertices, data.normals, data.texCoords, data.tangents, indices);
}

function updateSurface() {
    updateSurfaceData();
}

function handleKeyPress(event) {
    const step = 0.02;
    const scaleStep = 0.1;
    
    switch(event.key.toLowerCase()) {
        case 'w':
            pointV = Math.min(1.0, pointV + step);
            break;
        case 's':
            pointV = Math.max(0.0, pointV - step);
            break;
        case 'a':
            pointU = Math.max(0.0, pointU - step);
            break;
        case 'd':
            pointU = Math.min(1.0, pointU + step);
            break;
        case 'q':
            textureScaleU = Math.max(0.1, textureScaleU - scaleStep);
            break;
        case 'e':
            textureScaleU += scaleStep;
            break;
        case 'z':
            textureScaleV = Math.max(0.1, textureScaleV - scaleStep);
            break;
        case 'x':
            textureScaleV += scaleStep;
            break;
    }
    
    updateTextureInfo();
}

function updateTextureInfo() {
    document.getElementById('textureInfo').innerHTML = 
        `Texture Scale: U=${textureScaleU.toFixed(1)}, V=${textureScaleV.toFixed(1)} | ` +
        `Point Position: U=${pointU.toFixed(2)}, V=${pointV.toFixed(2)}`;
}

async function init() {
    canvasGlobal = document.getElementById("webglcanvas");
    gl = canvasGlobal.getContext("webgl");
    if (!gl) {
        alert("Browser does not support WebGL");
        return;
    }

    await initGL();
    spaceball = new TrackballRotator(canvasGlobal, draw, 0);

    canvasGlobal.addEventListener("wheel", function(event) {
        event.preventDefault();
        zoom += event.deltaY * 0.01;
        zoom = Math.min(-2, Math.max(-400, zoom));
    });

    document.addEventListener('keydown', handleKeyPress);
    
    // Add texture info display
    const controls = document.getElementById('controls');
    const infoDiv = document.createElement('div');
    infoDiv.id = 'textureInfo';
    infoDiv.style.marginTop = '10px';
    infoDiv.style.color = '#00e5ff';
    infoDiv.style.fontWeight = 'bold';
    controls.parentNode.insertBefore(infoDiv, controls.nextSibling);
    
    updateTextureInfo();

    draw();
}