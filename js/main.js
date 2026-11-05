/* ===================================================================
   BY YİĞİT KUAFÖR - GENEL ETKİLEŞİM & CANLI ÇALIŞMA SAATİ YÖNETİMİ
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sticky Header
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. Mobile Navigation Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                if (navMenu.classList.contains('open')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-xmark');
                } else {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });

        // Close mobile nav on link click
        navMenu.querySelectorAll('.nav-link, .btn').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                const icon = mobileToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // 3. Dynamic "Şu Anda Açık / Kapalı" Live Status
    function updateLiveOpenStatus() {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
        const hour = now.getHours();
        const minute = now.getMinutes();
        const timeInMin = hour * 60 + minute;

        const openTimeInMin = 9 * 60; // 09:00
        const closeTimeInMin = 21 * 60; // 21:00

        const statusDot = document.getElementById('heroStatusDot');
        const statusText = document.getElementById('heroStatusText');
        const contactLiveBadge = document.getElementById('contactLiveBadge');

        const isSunday = day === 0;
        const isOpen = !isSunday && (timeInMin >= openTimeInMin && timeInMin < closeTimeInMin);

        let statusHtml = '';
        let badgeClass = '';

        if (isOpen) {
            statusHtml = `<strong>Şu Anda Açık</strong> &bull; Bugün 21:00'e kadar hizmet veriyoruz`;
            badgeClass = 'open';
        } else {
            if (isSunday) {
                statusHtml = `<strong>Pazar Günü Kapalı</strong> &bull; Pazartesi 09:00'da açılacak`;
            } else if (timeInMin < openTimeInMin) {
                statusHtml = `<strong>Şu Anda Kapalı</strong> &bull; Bugün 09:00'da açılacak`;
            } else {
                statusHtml = `<strong>Şu Anda Kapalı</strong> &bull; Yarın sabah 09:00'da açılacak`;
            }
            badgeClass = 'closed';
        }

        if (statusDot) {
            statusDot.className = `status-dot ${badgeClass}`;
        }
        if (statusText) {
            statusText.innerHTML = statusHtml;
        }
        if (contactLiveBadge) {
            contactLiveBadge.innerHTML = `<span class="status-dot ${badgeClass}"></span> ${statusHtml}`;
        }
    }

    updateLiveOpenStatus();
    // Refresh status every minute
    setInterval(updateLiveOpenStatus, 60000);

    // 4. Gallery Filter & Lightbox
    const filterTabs = document.querySelectorAll('.filter-tab');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightboxModal = document.getElementById('lightboxModal');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxClose = document.getElementById('lightboxClose');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.getAttribute('data-filter');

            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });

    // Lightbox Click
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const img = item.querySelector('img');
            const title = item.querySelector('.gallery-overlay-title');
            const tag = item.querySelector('.gallery-overlay-tag');

            if (lightboxImg && img) {
                lightboxImg.src = img.src;
                lightboxImg.alt = img.alt || 'By Yiğit Kuaför Galeri';
            }
            if (lightboxCaption && title) {
                lightboxCaption.textContent = `${tag ? tag.textContent + ' - ' : ''}${title.textContent}`;
            }
            if (lightboxModal) {
                lightboxModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
            closeLightbox();
        }
    });

    function closeLightbox() {
        if (lightboxModal) {
            lightboxModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // 5. Active Nav Link on Scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 120;
            const sectionId = current.getAttribute('id');
            const navItem = document.querySelector(`.nav-menu a[href*="${sectionId}"]`);

            if (navItem) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navItem.classList.add('active');
                } else {
                    navItem.classList.remove('active');
                }
            }
        });
    });
});
