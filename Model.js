function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function Vertex(p) {
    this.p = p;
    this.normal = [0, 0, 0];
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
}

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;
    this.indexCount = 0;

    this.BufferData = function(vertices, normals, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.count = vertices.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

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

function computeNormal(v0, v1, v2) {
    let u = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    let v = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
    
    let normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    ];
    
    let length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
    if (length > 0) {
        normal[0] /= length;
        normal[1] /= length;
        normal[2] /= length;
    }
    
    return normal;
}

function CreateSurfaceData(n = 6, uSteps = 50, vSteps = 50) {
    let vertices = [];
    let triangles = [];
    
    let R = 1;
    let a = 0.24;
    

    for (let i = 0; i <= vSteps; i++) {
        let v = (i / vSteps) * Math.PI / 2; 
        for (let j = 0; j <= uSteps; j++) {
            let u = (j / uSteps) * 2 * Math.PI; 
            
            let x = (R * Math.cos(v) + a * (1 - Math.sin(v)) * Math.cos(n * u)) * Math.cos(u);
            let y = (R * Math.cos(v) + a * (1 - Math.sin(v)) * Math.cos(n * u)) * Math.sin(u);
            let z = R * Math.sin(v);
            
            vertices.push(new Vertex([x, y, z]));
        }
    }

    let vertexNormals = new Array(vertices.length);
    for (let i = 0; i < vertexNormals.length; i++) {
        vertexNormals[i] = [0, 0, 0];
    }

    for (let i = 0; i < vSteps; i++) {
        for (let j = 0; j < uSteps; j++) {
            let v0 = i * (uSteps + 1) + j;
            let v1 = v0 + 1;
            let v2 = v0 + (uSteps + 1);
            let v3 = v2 + 1;

            let tri1 = new Triangle(v0, v2, v1);
            let tri2 = new Triangle(v1, v2, v3);
            triangles.push(tri1, tri2);

            let normal1 = computeNormal(vertices[v0].p, vertices[v2].p, vertices[v1].p);
            let normal2 = computeNormal(vertices[v1].p, vertices[v2].p, vertices[v3].p);

            for (let k = 0; k < 3; k++) {
                vertexNormals[v0][k] += normal1[k];
                vertexNormals[v2][k] += normal1[k];
                vertexNormals[v1][k] += normal1[k];
                
                vertexNormals[v1][k] += normal2[k];
                vertexNormals[v2][k] += normal2[k];
                vertexNormals[v3][k] += normal2[k];
            }
        }
    }

    let flatVertices = [];
    let flatNormals = [];

    for (let i = 0; i < vertices.length; i++) {
        flatVertices.push(vertices[i].p[0], vertices[i].p[1], vertices[i].p[2]);
        
        let normal = vertexNormals[i];
        let length = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2]);
        if (length > 0) {
            normal[0] /= length;
            normal[1] /= length;
            normal[2] /= length;
        }
        flatNormals.push(normal[0], normal[1], normal[2]);
    }

    return {
        vertices: flatVertices,
        normals: flatNormals
    };
}