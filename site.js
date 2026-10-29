// Moke Gardens shared site script: mobile menu + scroll reveal
(function () {
    document.documentElement.classList.add('js');

    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');

    if (toggle && nav) {
        var setOpen = function (open) {
            nav.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.querySelector('.nav-toggle-text').textContent = open ? 'Close' : 'Menu';
        };

        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) setOpen(false);
        });

        toggle.addEventListener('click', function () {
            setOpen(!nav.classList.contains('is-open'));
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                setOpen(false);
                toggle.focus();
            }
        });

        document.addEventListener('click', function (e) {
            if (nav.classList.contains('is-open') && !nav.contains(e.target) && !toggle.contains(e.target)) {
                setOpen(false);
            }
        });
    }

    // Close other dropdowns when one opens
    var dropdowns = document.querySelectorAll('.site-nav details');
    dropdowns.forEach(function (d) {
        d.addEventListener('toggle', function () {
            if (d.open) {
                dropdowns.forEach(function (o) { if (o !== d) o.open = false; });
            }
        });
    });

    // Fade sections in as they scroll into view
    var items = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px' });
        items.forEach(function (el) { io.observe(el); });
    } else {
        items.forEach(function (el) { el.classList.add('is-visible'); });
    }

    // Photo lightbox: links with data-lightbox open in a full-screen viewer
    var links = Array.prototype.slice.call(document.querySelectorAll('a[data-lightbox]'));
    if (links.length && typeof HTMLDialogElement === 'function') {
        var dlg = document.createElement('dialog');
        dlg.className = 'lightbox';
        dlg.setAttribute('aria-label', 'Photo viewer');
        dlg.innerHTML =
            '<figure><img alt=""></figure>' +
            '<p class="lightbox-caption" aria-live="polite"></p>' +
            '<button type="button" class="lightbox-close" aria-label="Close">×</button>' +
            '<button type="button" class="lightbox-prev" aria-label="Previous photo">‹</button>' +
            '<button type="button" class="lightbox-next" aria-label="Next photo">›</button>';
        document.body.appendChild(dlg);
        var img = dlg.querySelector('img');
        var cap = dlg.querySelector('.lightbox-caption');
        var set = [], idx = 0;

        var show = function (i) {
            idx = (i + set.length) % set.length;
            var a = set[idx];
            var thumb = a.querySelector('img');
            img.src = a.getAttribute('href');
            img.alt = thumb ? thumb.alt : '';
            cap.textContent = a.getAttribute('data-caption') || '';
            var n = document.createElement('span');
            n.textContent = (idx + 1) + ' / ' + set.length;
            cap.appendChild(n);
            var multi = set.length > 1;
            dlg.querySelector('.lightbox-prev').hidden = !multi;
            dlg.querySelector('.lightbox-next').hidden = !multi;
        };

        links.forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var g = a.getAttribute('data-lightbox');
                set = links.filter(function (l) { return l.getAttribute('data-lightbox') === g; });
                show(set.indexOf(a));
                dlg.showModal();
            });
        });

        dlg.querySelector('.lightbox-close').addEventListener('click', function () { dlg.close(); });
        dlg.querySelector('.lightbox-prev').addEventListener('click', function () { show(idx - 1); });
        dlg.querySelector('.lightbox-next').addEventListener('click', function () { show(idx + 1); });
        dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.tagName === 'FIGURE') dlg.close(); });
        dlg.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') show(idx - 1);
            if (e.key === 'ArrowRight') show(idx + 1);
        });
        dlg.addEventListener('close', function () { img.removeAttribute('src'); });

        var startX = null;
        dlg.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
        dlg.addEventListener('touchend', function (e) {
            if (startX === null) return;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
            startX = null;
        });
    }

    // Click-to-play YouTube: swap the poster for the real player on demand
    document.querySelectorAll('.video-lite[data-youtube]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var f = document.createElement('iframe');
            f.src = 'https://www.youtube-nocookie.com/embed/' + btn.getAttribute('data-youtube') + '?autoplay=1&rel=0&playsinline=1';
            f.title = (btn.getAttribute('aria-label') || 'Video').replace('Play video: ', '');
            f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
            f.allowFullscreen = true;
            btn.replaceWith(f);
            f.focus();
        });
    });

    var year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
})();
