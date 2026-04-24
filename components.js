class MonarcaNavbar extends HTMLElement {
    connectedCallback() {
        // En algunas páginas queremos que inicie 'scrolled' si no es la principal, 
        // pero el script.js ya maneja eso con el scroll. Solo dejamos la base limpia.
        this.innerHTML = `
        <header class="navbar" id="navbar_component">
            <div class="nav-container">
                <a href="index.html" class="logo">
                    <img src="img/logo.png" alt="Monarca Logo" class="nav-logo-img">
                </a>
                <nav class="nav-links">
                    <a href="index.html#experiencia" class="nav-item">Nuestra Esencia</a>
                    <a href="coleccion.html" class="nav-item">Colección Real</a>
                    <a href="crear_pedido.html" class="nav-item">Crear Pedido</a>
                </nav>
                <div class="nav-cta" id="nav-auth-container">
                    <a href="login.html" class="btn btn-black" style="color: white; border-color: black;">Iniciar Sesión</a>
                </div>
            </div>
        </header>
        `;
    }
}
customElements.define('monarca-navbar', MonarcaNavbar);

class MonarcaFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <footer id="contacto">
            <div class="footer-grid">
                <div class="footer-brand">
                    <img src="img/logo.png" alt="Monarca Logo" class="footer-logo-img">
                    <p class="brand-desc">Alta repostería que define la exclusividad y el lujo contemporáneo.</p>
                </div>
                <div class="footer-links">
                    <h4>Navegación</h4>
                    <a href="index.html#experiencia">Nuestra Esencia</a>
                    <a href="coleccion.html">Colección Real</a>
                    <a href="crear_pedido.html">Crear Pedido</a>
                </div>
                <div class="footer-contact">
                    <h4>Atención Exclusiva</h4>
                    <p>monarcapasteleriamx@gmail.com</p>
                    <p>+52 55 6653 7807</p>
                    <div class="socials">
                        <!-- Facebook -->
                        <a href="#" target="_blank" class="social-icon">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7.5v4H10V22h4v-8.5z"/></svg>
                        </a>
                        <!-- Instagram -->
                        <a href="#" target="_blank" class="social-icon">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                        </a>
                        <!-- TikTok -->
                        <a href="#" target="_blank" class="social-icon">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                        </a>
                        <!-- WhatsApp -->
                        <a href="https://wa.me/525566537807" target="_blank" class="social-icon" style="background-color: #25D366; color: white; border-color: #25D366;">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 00-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Monarca Pastelería. Todos los derechos reservados.</p>
            </div>
        </footer>
        `;
    }
}
customElements.define('monarca-footer', MonarcaFooter);
