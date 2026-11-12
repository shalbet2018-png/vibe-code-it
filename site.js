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


    // Homepage hero slideshow: crossfade, lazy-load the later slides, pause when hidden
    var heroShow = document.querySelector('[data-hero-slideshow]');
    if (heroShow) {
        var slides = Array.prototype.slice.call(heroShow.querySelectorAll('.hero-slide'));
        var dots = Array.prototype.slice.call(document.querySelectorAll('.hero-dots button'));
        var cur = 0, timer = null;
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        function load(el) {
            if (el.dataset.srcset) { el.srcset = el.dataset.srcset; delete el.dataset.srcset; }
        }
        function go(n) {
            n = (n + slides.length) % slides.length;
            load(slides[n]); load(slides[(n + 1) % slides.length]);
            slides[cur].classList.remove('is-active');
            if (dots[cur]) dots[cur].removeAttribute('aria-current');
            cur = n;
            slides[cur].classList.add('is-active');
            if (dots[cur]) dots[cur].setAttribute('aria-current', 'true');
        }
        function start() { stop(); if (!reduce) timer = setInterval(function () { go(cur + 1); }, 6000); }
        function stop() { if (timer) clearInterval(timer); timer = null; }
        dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); start(); }); });
        window.addEventListener('load', function () { load(slides[1]); start(); });
        document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    }

    // Why Moke showcase: crossfading slideshow with arrows, dots, pause, swipe and keyboard.
    // Autoplay pauses on hover/focus, when the tab is hidden, and never starts with reduced motion.
    Array.prototype.forEach.call(document.querySelectorAll('[data-showcase]'), function (show) {
        var DELAY = 6000;
        var stage = show.querySelector('.showcase-stage');
        var slides = Array.prototype.slice.call(show.querySelectorAll('.showcase-slide'));
        var dotsWrap = show.querySelector('.showcase-dots');
        var toggle = show.querySelector('.showcase-toggle');
        var bar = show.querySelector('.showcase-progress span');
        var status = show.querySelector('.showcase-status');
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var cur = 0, timer = null, paused = reduce, hold = false;
        if (slides.length < 2) return;

        var dots = slides.map(function (s, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', 'Show slide ' + (i + 1) + ': ' + s.querySelector('figcaption').textContent);
            b.addEventListener('click', function () { go(i, true); });
            dotsWrap.appendChild(b);
            return b;
        });

        function load(s) {
            var img = s.querySelector('img');
            if (img && img.dataset.srcset) {
                img.srcset = img.dataset.srcset;
                img.src = img.dataset.srcset.split(', ').pop().split(' ')[0];
                delete img.dataset.srcset;
            }
        }
        function runBar() {
            if (!bar) return;
            bar.style.transition = 'none';
            bar.style.width = '0';
            if (paused || hold) return;
            void bar.offsetWidth;
            bar.style.transition = 'width ' + DELAY + 'ms linear';
            bar.style.width = '100%';
        }
        function schedule() {
            clearTimeout(timer); timer = null;
            if (!paused && !hold && !document.hidden) timer = setTimeout(function () { go(cur + 1); }, DELAY);
            runBar();
        }
        function go(n, user) {
            n = (n + slides.length) % slides.length;
            load(slides[n]); load(slides[(n + 1) % slides.length]);
            slides[cur].classList.remove('is-active');
            slides[cur].setAttribute('aria-hidden', 'true');
            dots[cur].removeAttribute('aria-current');
            cur = n;
            slides[cur].classList.add('is-active');
            slides[cur].removeAttribute('aria-hidden');
            dots[cur].setAttribute('aria-current', 'true');
            stage.classList.toggle('is-illustrative', slides[cur].hasAttribute('data-illustrative'));
            if (user && status) status.textContent = 'Slide ' + (cur + 1) + ' of ' + slides.length + ': ' + slides[cur].querySelector('figcaption').textContent;
            schedule();
        }
        function setPaused(p) {
            paused = p;
            toggle.classList.toggle('is-paused', p);
            toggle.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow');
            schedule();
        }

        show.querySelector('.showcase-arrow.is-prev').addEventListener('click', function () { go(cur - 1, true); });
        show.querySelector('.showcase-arrow.is-next').addEventListener('click', function () { go(cur + 1, true); });
        toggle.addEventListener('click', function () { setPaused(!paused); });

        // Hold (not pause) while the visitor is pointing at or focused inside the slideshow
        stage.addEventListener('mouseenter', function () { hold = true; schedule(); });
        stage.addEventListener('mouseleave', function () { hold = false; schedule(); });
        show.addEventListener('focusin', function () { hold = true; schedule(); });
        show.addEventListener('focusout', function (e) { if (!show.contains(e.relatedTarget)) { hold = false; schedule(); } });

        show.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, true); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, true); }
        });

        var sx = null, sy = 0;
        stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
        stage.addEventListener('touchend', function (e) {
            if (sx === null) return;
            var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
            sx = null;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1), true);
        });

        document.addEventListener('visibilitychange', schedule);
        dots[0].setAttribute('aria-current', 'true');
        stage.classList.toggle('is-illustrative', slides[0].hasAttribute('data-illustrative'));
        load(slides[1]);
        setPaused(paused);
    });

    // Contact page: contact-us.html?unit=3-bedroom pre-fills the WhatsApp message with that unit.
    // Only the known unit types below are accepted, so nothing from the URL is shown as-is.
    var bookingNote = document.querySelector('[data-booking-note]');
    if (bookingNote) {
        var UNITS = {
            'studio': 'studio apartment (24 sq.m, Kshs 1,800,000)',
            '1-bedroom': '1 bedroom apartment (44 sq.m, Kshs 3,500,000)',
            '2-bedroom': '2 bedroom apartment (70 sq.m, Kshs 5,000,000)',
            '3-bedroom': '3 bedroom apartment (102 sq.m, Kshs 6,500,000)'
        };
        var unitKey = (location.search.match(/[?&]unit=([a-z0-9-]+)/) || [])[1];
        var unit = unitKey && Object.prototype.hasOwnProperty.call(UNITS, unitKey) ? UNITS[unitKey] : null;
        if (unit) {
            var msg = "Hello Moke Gardens, I'd like to inquire about the " + unit + '. Please share more details.';
            Array.prototype.forEach.call(document.querySelectorAll('a[href^="https://wa.me/"]'), function (a) {
                a.href = a.href.split('?')[0] + '?text=' + encodeURIComponent(msg);
            });
            bookingNote.textContent = 'Asking about the ' + unit + '. Tap WhatsApp and your message is ready to send.';
            bookingNote.hidden = false;
        }
    }

    var year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
})();
