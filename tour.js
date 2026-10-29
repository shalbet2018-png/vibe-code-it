// Moke Gardens 360° room viewer: a small, dependency-free WebGL cube-panorama viewer.
// Markup: <div class="tour" data-base="virtual-tour/2bed-apartment/" data-rooms='[{"id":"lounge","title":"Lounge"}]'></div>
// Each room folder holds six 2048px cube faces: 0 front, 1 right, 2 back, 3 left, 4 up, 5 down (.webp).
(function () {
    var EXT = '.webp';

    var VS = 'attribute vec2 p; varying vec2 v; void main(){ v = p; gl_Position = vec4(p, 0.0, 1.0); }';
    var FS = 'precision highp float; varying vec2 v; uniform samplerCube c; uniform vec2 s; uniform mat3 r;' +
             'void main(){ vec3 d = r * vec3(v.x * s.x, v.y * s.y, -1.0); gl_FragColor = textureCube(c, vec3(-d.x, d.y, d.z)); }';

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function Tour(root) {
        var rooms = JSON.parse(root.getAttribute('data-rooms'));
        var base = root.getAttribute('data-base');
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var state = { yaw: 0, pitch: 0, fov: 80, auto: !reduceMotion, idx: -1, ready: false };

        root.innerHTML =
            '<div class="tour-view is-loading" tabindex="0" role="application" aria-label="360 degree room view. Drag, or use the arrow keys, to look around.">' +
                '<canvas class="tour-canvas"></canvas>' +
                '<div class="tour-loading" aria-hidden="true"></div>' +
                '<p class="tour-title" aria-live="polite"></p>' +
                '<p class="tour-hint">Drag to look around</p>' +
                '<div class="tour-tools">' +
                    '<button type="button" class="tour-btn" data-act="zoomin" aria-label="Zoom in">+</button>' +
                    '<button type="button" class="tour-btn" data-act="zoomout" aria-label="Zoom out">−</button>' +
                    '<button type="button" class="tour-btn" data-act="full" aria-label="Full screen">⤢</button>' +
                '</div>' +
            '</div>' +
            '<nav class="tour-rooms" aria-label="Rooms"></nav>';

        var view = root.querySelector('.tour-view');
        var canvas = root.querySelector('.tour-canvas');
        var title = root.querySelector('.tour-title');
        var hint = root.querySelector('.tour-hint');
        var nav = root.querySelector('.tour-rooms');

        rooms.forEach(function (r, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = r.title;
            b.addEventListener('click', function () { load(i); });
            nav.appendChild(b);
        });

        var gl = canvas.getContext('webgl', { antialias: false, alpha: false }) ||
                 canvas.getContext('experimental-webgl');
        if (!gl) {
            // Very old browsers: show the front of each room as a still image instead.
            view.classList.add('is-static');
        }

        var prog, uS, uR, tex, maxSize = 2048;
        if (gl) {
            var sh = function (type, src) {
                var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o;
            };
            prog = gl.createProgram();
            gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
            gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
            gl.linkProgram(prog);
            gl.useProgram(prog);
            var buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
            var aP = gl.getAttribLocation(prog, 'p');
            gl.enableVertexAttribArray(aP);
            gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
            uS = gl.getUniformLocation(prog, 's');
            uR = gl.getUniformLocation(prog, 'r');
            maxSize = Math.min(2048, gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) || 2048);
        }

        // Cube faces (front, right, back, left, up, down) -> WebGL cube-map targets
        var TARGETS = gl ? [
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y
        ] : [];

        function prepare(img, k) {
            var n = Math.min(maxSize, img.naturalWidth || maxSize);
            var flip = k === 4 || k === 5;   // up and down faces are stored turned 180°
            if (!flip && n === img.naturalWidth) return img;
            var c = document.createElement('canvas');
            c.width = c.height = n;
            var x = c.getContext('2d');
            if (flip) { x.translate(n, n); x.rotate(Math.PI); }
            x.drawImage(img, 0, 0, n, n);
            return c;
        }

        function upload(imgs) {
            var t = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, t);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            imgs.forEach(function (img, k) {
                gl.texImage2D(TARGETS[k], 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, prepare(img, k));
            });
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            if (tex) gl.deleteTexture(tex);
            tex = t;
        }

        function render() {
            if (!gl || !tex) return;
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = Math.round(view.clientWidth * dpr), h = Math.round(view.clientHeight * dpr);
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
            gl.viewport(0, 0, w, h);
            var t = Math.tan(state.fov * Math.PI / 360);
            gl.uniform2f(uS, t * w / h, t);
            var y = state.yaw * Math.PI / 180, p = -state.pitch * Math.PI / 180;
            var cy = Math.cos(y), sy = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p);
            // r = Ry(yaw) * Rx(pitch), column-major
            gl.uniformMatrix3fv(uR, false, [
                cy, 0, sy,
                sy * sp, cp, -cy * sp,
                -sy * cp, sp, cy * cp
            ]);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        var loadToken = 0;
        function load(i) {
            if (i === state.idx) return;
            state.idx = i;
            var r = rooms[i], token = ++loadToken;
            title.textContent = r.title;
            Array.prototype.forEach.call(nav.children, function (b, j) {
                b.setAttribute('aria-current', j === i ? 'true' : 'false');
            });
            view.classList.add('is-loading');
            if (!gl) {
                view.style.backgroundImage = 'url("' + base + r.id + '/0' + EXT + '")';
                view.classList.remove('is-loading');
                return;
            }
            var imgs = [], pending = 6;
            for (var k = 0; k < 6; k++) {
                (function (k) {
                    var im = new Image();
                    im.decoding = 'async';
                    im.onload = function () {
                        imgs[k] = im;
                        if (--pending === 0 && token === loadToken) {
                            upload(imgs);
                            state.yaw = r.yaw || 0;
                            state.pitch = 0;
                            view.classList.remove('is-loading');
                            render();
                        }
                    };
                    im.src = base + r.id + '/' + k + EXT;
                })(k);
            }
        }

        // Look around: drag (mouse/touch/pen), pinch or wheel to zoom, arrow keys
        var drag = null, pointers = {}, pinch = null;
        function stopAuto() { state.auto = false; hint.classList.add('is-hidden'); }

        view.addEventListener('pointerdown', function (e) {
            if (e.target.closest('button')) return;
            view.setPointerCapture(e.pointerId);
            pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            stopAuto();
            var ids = Object.keys(pointers);
            if (ids.length === 2) {
                var a = pointers[ids[0]], b = pointers[ids[1]];
                pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, fov: state.fov };
                drag = null;
            } else {
                drag = { x: e.clientX, y: e.clientY, yaw: state.yaw, pitch: state.pitch };
                view.classList.add('is-dragging');
            }
        });
        view.addEventListener('pointermove', function (e) {
            if (!pointers[e.pointerId]) return;
            pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            var ids = Object.keys(pointers);
            if (pinch && ids.length === 2) {
                var a = pointers[ids[0]], b = pointers[ids[1]];
                state.fov = clamp(pinch.fov * pinch.d / (Math.hypot(a.x - b.x, a.y - b.y) || 1), 35, 100);
                render();
                return;
            }
            if (!drag) return;
            var k = state.fov / view.clientHeight;
            state.yaw = drag.yaw - (e.clientX - drag.x) * k;
            state.pitch = clamp(drag.pitch + (e.clientY - drag.y) * k, -85, 85);
            render();
        });
        function end(e) {
            delete pointers[e.pointerId];
            if (Object.keys(pointers).length < 2) pinch = null;
            if (!Object.keys(pointers).length) { drag = null; view.classList.remove('is-dragging'); }
        }
        view.addEventListener('pointerup', end);
        view.addEventListener('pointercancel', end);

        view.addEventListener('wheel', function (e) {
            e.preventDefault();
            stopAuto();
            state.fov = clamp(state.fov + (e.deltaY > 0 ? 5 : -5), 35, 100);
            render();
        }, { passive: false });

        view.addEventListener('keydown', function (e) {
            var used = true;
            if (e.key === 'ArrowLeft') state.yaw -= 5;
            else if (e.key === 'ArrowRight') state.yaw += 5;
            else if (e.key === 'ArrowUp') state.pitch = clamp(state.pitch + 5, -85, 85);
            else if (e.key === 'ArrowDown') state.pitch = clamp(state.pitch - 5, -85, 85);
            else if (e.key === '+' || e.key === '=') state.fov = clamp(state.fov - 5, 35, 100);
            else if (e.key === '-') state.fov = clamp(state.fov + 5, 35, 100);
            else used = false;
            if (used) { e.preventDefault(); stopAuto(); render(); }
        });

        root.querySelector('.tour-tools').addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b) return;
            var act = b.getAttribute('data-act');
            stopAuto();
            if (act === 'zoomin') state.fov = clamp(state.fov - 10, 35, 100);
            if (act === 'zoomout') state.fov = clamp(state.fov + 10, 35, 100);
            if (act === 'full') {
                if (document.fullscreenElement) document.exitFullscreen();
                else if (root.requestFullscreen) root.requestFullscreen();
                else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
            }
            render();
        });

        // Gentle auto-rotate until the visitor takes control
        var last = null;
        function tick(t) {
            if (state.auto && !document.hidden && last !== null && tex) {
                state.yaw += (t - last) * 0.006;
                render();
            }
            last = t;
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        window.addEventListener('resize', render);
        document.addEventListener('fullscreenchange', render);
        load(0);
    }

    document.querySelectorAll('.tour[data-rooms]').forEach(function (el) { new Tour(el); });
})();
