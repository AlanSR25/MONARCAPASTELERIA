document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide Initial Loader
    setTimeout(() => {
        const loader = document.querySelector('.loader');
        if (loader) {
            loader.classList.add('hidden');
        }
    }, 1500);

    // 2. Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('monarca-navbar header') || document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // 3. Hero Carousel Logic
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');
    
    if (slides.length > 0) {
        let currentSlideIndex = 0;
        let slideInterval;

        const showSlide = (index) => {
            slides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            
            currentSlideIndex = (index + slides.length) % slides.length;
            
            slides[currentSlideIndex].classList.add('active');
            if(dots[currentSlideIndex]) {
                dots[currentSlideIndex].classList.add('active');
            }
        };

        const moveSlide = (step) => {
            showSlide(currentSlideIndex + step);
            resetInterval();
        };

        const goToSlide = (index) => {
            showSlide(index);
            resetInterval();
        };

        const startInterval = () => {
            slideInterval = setInterval(() => {
                showSlide(currentSlideIndex + 1);
            }, 7000); // Auto slide every 7 seconds
        };

        const resetInterval = () => {
            clearInterval(slideInterval);
            startInterval();
        };

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => moveSlide(-1));
            nextBtn.addEventListener('click', () => moveSlide(1));
        }

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => goToSlide(index));
        });

        startInterval(); // Initialize auto-scroll
    }

    // 4. Reveal Animations using IntersectionObserver
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    };
    
    if ('IntersectionObserver' in window) {
        const revealOptions = {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px"
        };
        const revealObserver = new IntersectionObserver(revealCallback, revealOptions);
        
        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        revealElements.forEach(el => el.classList.add('active'));
    }

    // 5. Smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
