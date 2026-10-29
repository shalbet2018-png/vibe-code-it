// Moke Gardens shared site script: mobile menu + scroll reveal
(function () {
    document.documentElement.classList.add('js');

    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');

    if (toggle && nav) {
        var setOpen = function (open) {
            nav.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        };

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

    var year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
})();
