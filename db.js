// ==========================================
// CONFIGURACIÓN DE SUPABASE (BASE DE DATOS)
// ==========================================

// IMPORTANTE: Necesitas reemplazar esta URL con la tuya desde Supabase -> Project Settings -> API -> Project URL
const _SUPABASE_URL = 'https://gjwpyjxsbkqdklavpwem.supabase.co';
const _SUPABASE_ANON_KEY = 'sb_publishable_cQWwlpla-nKRQhOicgFPXg_wFuUHH6d';

window.SUPABASE_URL = _SUPABASE_URL;
window.SUPABASE_ANON_KEY = _SUPABASE_ANON_KEY;

// 1. Inicializar cliente global de Supabase
let _supabaseClient = null;

try {
    if (window.supabase) {
        _supabaseClient = window.supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON_KEY);
        console.log("✅ Supabase conectado de forma segura (Modo Anon).");
    } else {
        console.error("❌ Librería de Supabase no cargada desde el CDN.");
    }
} catch (error) {
    console.warn("⚠️ Advertencia: Cambia TU_PROYECTO_ID en db.js por la URL correcta de tu proyecto Supabase.");
}

// 2. Exportar o exponer funciones globales para interactuar con la Base de Datos
// Para una web estática tradicional, montamos el cliente en Window para accederlo en script.js o paginas.
window.DB = _supabaseClient;

// 3. Manejar el estado de la sesión activa en el frontend (Caché local de user)
let currentUser = null;

// Función global para hacer logout
window.logoutUser = async function() {
    if (window.DB) {
        await window.DB.auth.signOut();
        window.location.href = "login.html";
    }
};

// Función global para actualizar Navbar
window.updateAuthUI = function() {
    const authContainer = document.getElementById('nav-auth-container');
    if (!authContainer) return;
    if (window.currentUser) {
        const name = window.currentUser.user_metadata?.nombre_completo?.split(' ')[0] || window.currentUser.email?.split('@')[0] || 'Miembro';
        authContainer.innerHTML = `<a href="perfil.html" style="text-decoration:none; color: var(--gold-primary); font-family: var(--font-heading); font-weight: 600; font-size: 1.1rem; display:flex; align-items:center; gap: 8px;">Hola, ${name} 👑</a>`;
    } else {
        authContainer.innerHTML = `<a href="login.html" class="btn btn-black" style="color: white; border-color: black;">Iniciar Sesión</a>`;
    }
};

async function checkSession() {
    if (!window.DB) return;
    const { data: { session }, error } = await window.DB.auth.getSession();
    if (session) {
        window.currentUser = session.user;
        console.log("👤 Sesión activa:", window.currentUser);
        window.updateAuthUI();
        if (typeof window.onUserReady === 'function') window.onUserReady();
    }
}

// Hook de cambio de sesión
if (window.DB) {
    window.DB.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            window.currentUser = session?.user || null;
            if (window.currentUser) {
                console.log("Ingreso exitoso detectado.");
                if (typeof window.onUserReady === 'function') window.onUserReady();
            }
            window.updateAuthUI();
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            console.log("Cierre de sesión detectado.");
            window.updateAuthUI();
        }
    });

    // Validar al terminar de cargar todo
    window.addEventListener('DOMContentLoaded', () => {
        checkSession();
        window.updateAuthUI(); // Asegurarnos de que corra si la sesion ya estaba
    });
}

// ==========================================
// INTEGRACIÓN WHATSAPP (CALLMEBOT)
// ==========================================
window.enviarNotificacionWhatsApp = function(mensaje) {
    const phone = "5215566537807";
    const apikey = "3911505";
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(mensaje)}&apikey=${apikey}`;
    
    fetch(url, { mode: 'no-cors' })
        .then(() => console.log("Notificación enviada a WhatsApp"))
        .catch(err => console.error("Error enviando WhatsApp:", err));
};
