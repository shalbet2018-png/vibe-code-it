// Moke Gardens room-by-room tour: steps through illustrative room visuals with a room picker.
// Markup: <div class="room-tour" data-base="images/tour/2bed/" data-rooms='[{"id":"lounge","title":"Lounge","text":"..."}]'></div>
// Each room needs <base><id>.webp (full size) and <base>thumbs/<id>.webp (small picker image).
(function () {
    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function RoomTour(root) {
        var rooms = JSON.parse(root.getAttribute('data-rooms'));
        var base = root.getAttribute('data-base');
        var idx = -1;

        root.innerHTML =
            '<div class="room-tour-stage">' +
                '<img class="room-tour-img" alt="" decoding="async">' +
                '<p class="tour-title room-tour-title" aria-live="polite"></p>' +
                '<span class="render-label">Illustrative visual</span>' +
                '<div class="tour-tools">' +
                    '<button type="button" class="tour-btn" data-act="full" aria-label="Full screen">⤢</button>' +
                '</div>' +
                '<button type="button" class="room-tour-arrow is-prev" aria-label="Previous room">‹</button>' +
                '<button type="button" class="room-tour-arrow is-next" aria-label="Next room">›</button>' +
                '<div class="room-tour-progress" aria-hidden="true"><span></span></div>' +
            '</div>' +
            '<div class="room-tour-info">' +
                '<p class="room-tour-count"></p>' +
                '<p class="room-tour-text"></p>' +
            '</div>' +
            '<nav class="room-tour-rooms" aria-label="Rooms"></nav>';

        var stage = root.querySelector('.room-tour-stage');
        var img = root.querySelector('.room-tour-img');
        var title = root.querySelector('.room-tour-title');
        var count = root.querySelector('.room-tour-count');
        var text = root.querySelector('.room-tour-text');
        var bar = root.querySelector('.room-tour-progress span');
        var nav = root.querySelector('.room-tour-rooms');

        rooms.forEach(function (r, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.innerHTML = '<img alt="" loading="lazy" decoding="async"><span></span>';
            b.querySelector('img').src = base + 'thumbs/' + r.id + '.webp';
            b.querySelector('span').textContent = r.title;
            b.addEventListener('click', function () { show(i); });
            nav.appendChild(b);
        });

        function show(i) {
            i = (i + rooms.length) % rooms.length;
            if (i === idx) return;
            idx = i;
            var r = rooms[i];
            stage.classList.add('is-loading');
            var next = new Image();
            next.onload = next.onerror = function () {
                if (idx !== i) return;
                img.src = next.src;
                img.alt = r.title + ', illustrative visual';
                stage.classList.remove('is-loading');
            };
            next.src = base + r.id + '.webp';
            title.textContent = r.title;
            text.textContent = r.text || '';
            count.textContent = 'Room ' + pad(i + 1) + ' of ' + pad(rooms.length);
            bar.style.width = ((i + 1) / rooms.length * 100) + '%';
            Array.prototype.forEach.call(nav.children, function (b, j) {
                b.setAttribute('aria-current', j === i ? 'true' : 'false');
            });
            // Preload the next room so stepping forward feels instant
            new Image().src = base + rooms[(i + 1) % rooms.length].id + '.webp';
        }

        root.querySelector('.is-prev').addEventListener('click', function () { show(idx - 1); });
        root.querySelector('.is-next').addEventListener('click', function () { show(idx + 1); });

        root.querySelector('[data-act="full"]').addEventListener('click', function () {
            if (document.fullscreenElement) document.exitFullscreen();
            else if (root.requestFullscreen) root.requestFullscreen();
            else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
        });

        root.tabIndex = -1;
        root.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
        });

        // Swipe left/right on touch screens
        var sx = null;
        stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
        stage.addEventListener('touchend', function (e) {
            if (sx === null) return;
            var dx = e.changedTouches[0].clientX - sx;
            if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
            sx = null;
        });

        show(0);
    }

    document.querySelectorAll('.room-tour[data-rooms]').forEach(function (el) { new RoomTour(el); });
})();
