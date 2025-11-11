function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;
    this.indexCount = 0;

    this.BufferData = function(vertices, normals, texCoords, tangents, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.count = vertices.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.indexCount = indices.length;
    }

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoord);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTangent);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }
}

function generateIndices(uSteps, vSteps) {
    let indices = [];
    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            let idx = i * (vSteps + 1) + j;
            let idxNextU = (i + 1) * (vSteps + 1) + j;
            let idxNextV = i * (vSteps + 1) + (j + 1);
            let idxDiag = (i + 1) * (vSteps + 1) + (j + 1);

            indices.push(idx, idxNextU, idxDiag);
            indices.push(idx, idxDiag, idxNextV);
        }
    }
    return indices;
}

function CreateSurfaceData(n = 6, uSteps = 50, vSteps = 50) {
    let vertices = [];
    let normals = [];
    let texCoords = [];
    let tangents = [];
    
    let R = 1;
    let a = 0.24;

    for (let i = 0; i <= vSteps; i++) {
        let v = (i / vSteps) * Math.PI / 2; 
        for (let j = 0; j <= uSteps; j++) {
            let u = (j / uSteps) * 2 * Math.PI; 
            
            let x = (R * Math.cos(v) + a * (1 - Math.sin(v)) * Math.cos(n * u)) * Math.cos(u);
            let y = (R * Math.cos(v) + a * (1 - Math.sin(v)) * Math.cos(n * u)) * Math.sin(u);
            let z = R * Math.sin(v);
            
            vertices.push(x, y, z);
            texCoords.push(j / uSteps, i / vSteps);
            
            let dx_du = -(R * Math.cos(v) + a * (1 - Math.sin(v)) * Math.cos(n * u)) * Math.sin(u)
                       - a * (1 - Math.sin(v)) * n * Math.sin(n * u) * Math.cos(u);
            
            let dy_du = (R * Math.cos(v) + a * (1 - Math.sin(v)) * Math.cos(n * u)) * Math.cos(u)
                       - a * (1 - Math.sin(v)) * n * Math.sin(n * u) * Math.sin(u);
            
            let dz_du = 0;

            let dx_dv = (-R * Math.sin(v) - a * Math.cos(v) * Math.cos(n * u)) * Math.cos(u);
            let dy_dv = (-R * Math.sin(v) - a * Math.cos(v) * Math.cos(n * u)) * Math.sin(u);
            let dz_dv = R * Math.cos(v);
            
            let normal_x = dy_du * dz_dv - dz_du * dy_dv;
            let normal_y = dz_du * dx_dv - dx_du * dz_dv;
            let normal_z = dx_du * dy_dv - dy_du * dx_dv;
            
            let length = Math.sqrt(normal_x * normal_x + normal_y * normal_y + normal_z * normal_z);
            if (length > 0) {
                normal_x /= length;
                normal_y /= length;
                normal_z /= length;
            }
            
            normals.push(normal_x, normal_y, normal_z);
            
            let tangentLength = Math.sqrt(dx_du * dx_du + dy_du * dy_du + dz_du * dz_du);
            if (tangentLength > 0) {
                tangents.push(dx_du / tangentLength, dy_du / tangentLength, dz_du / tangentLength);
            } else {
                tangents.push(1, 0, 0);
            }
        }
    }

    return {
        vertices: vertices,
        normals: normals,
        texCoords: texCoords,
        tangents: tangents
    };
}