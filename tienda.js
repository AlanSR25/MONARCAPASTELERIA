// ==========================================
// LÓGICA DINÁMICA DE TIENDA Y USUARIOS (JS)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Detección visual de la pantalla actual para correr funciones
    const path = window.location.pathname;

    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        cargarProductos('productos-galeria', false, 3);
    } else if (path.includes('coleccion.html')) {
        cargarProductos('galeria-completa', false, null);
    } else if (path.includes('crear_pedido.html')) {
        cargarProductos('opciones-wizard', true, null);
    } else if (path.includes('perfil.html')) {
        // Espera inteligente a la sesión
        window.onUserReady = cargarPerfilYPedidos;
        if (window.currentUser) {
            cargarPerfilYPedidos();
        }
    }
});

// ==========================================
// TABLA PRODUCTOS
// ==========================================
async function cargarProductos(containerId, isWizard, limitCount) {
    const contenedor = document.getElementById(containerId);
    if (!contenedor) return;

    if (!window.DB) {
        console.warn("Base de datos no inicializada localmente.");
        return;
    }

    try {
        let query = window.DB.from('productos').select('*, producto_variantes(precio_venta)').eq('activo', true);
        if (limitCount) {
            query = query.limit(limitCount);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Limpiar el contenedor (quitar mensaje estático de que cargando...)
        contenedor.innerHTML = '';

        if (!data || data.length === 0) {
            contenedor.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
                    <span style="font-size: 3rem; color: var(--gold-primary);">👑</span>
                    <h3 style="font-family: var(--font-heading); margin-top: 1rem;">Nuestra colección está preparándose</h3>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">Actualmente no hay productos cargados en la base de datos.</p>
                </div>
            `;
            return;
        }

        // Renderizado dinámico según la página
        data.forEach((prod, index) => {
            const delay = index * 0.1;
            const imgUrl = prod.imagen_url || 'img/luxury_pastries.png'; // Fallback visual
            const nombre = prod.nombre || 'Pastel de Lujo';
            const sabor = prod.sabor ? `Sabor: ${prod.sabor}` : '';
            const desc = prod.descripcion || '';
            
            // Obtener el precio mínimo de las variantes, si existen
            let minPrice = 0;
            if (prod.producto_variantes && prod.producto_variantes.length > 0) {
                const precios = prod.producto_variantes.map(v => v.precio_venta).filter(p => p != null && !isNaN(p));
                if (precios.length > 0) minPrice = Math.min(...precios);
            }
            const txtPrecio = minPrice > 0 ? `Desde $${minPrice}.00` : 'Precio a consultar';

            if (isWizard) {
                // Diseño para crear_pedido.html
                const card = document.createElement('div');
                card.className = "card selectable-card";
                card.onclick = function() { toggleSelect(this); };
                card.innerHTML = `
                    <div class="card-image-wrap" style="height: 150px;">
                        <img src="${imgUrl}" alt="${nombre}" class="card-image">
                    </div>
                    <div class="card-content" style="padding: 1rem;">
                        <h4 style="font-family: var(--font-heading); font-size: 1rem;">${nombre}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">${sabor}</p>
                        <p style="font-size: 0.9rem; font-weight: bold; color: var(--gold-primary); margin-top: 5px;">${txtPrecio}</p>
                    </div>
                `;
                contenedor.appendChild(card);
            } else {
                // Diseño para index y coleccion
                const card = document.createElement('a');
                card.href = `crear_pedido.html?producto=${prod.id_producto}`;
                card.className = `card reveal active fade-up`;
                card.style.transitionDelay = `${delay}s`;
                card.innerHTML = `
                    <div class="card-image-wrap">
                        <img src="${imgUrl}" alt="${nombre}" class="card-image">
                        <div class="card-overlay">
                            <span class="btn btn-gold">Personalizar Couture</span>
                        </div>
                    </div>
                    <div class="card-content">
                        <h3 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 0.8rem;">${nombre}</h3>
                        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.5;">${desc}</p>
                        <p style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--gold-primary);">${txtPrecio}</p>
                    </div>
                `;
                contenedor.appendChild(card);
            }
        });

    } catch (err) {
        console.error("Error cargando productos:", err);
        contenedor.innerHTML = `<p style="color:red; text-align:center;">Hubo un error cargando el catálogo. Revisa tu conexión a la Base de Datos.</p>`;
        alert("Error de conexión al catálogo: " + err.message);
    }
}

// ==========================================
// PERFIL CLIENTES
// ==========================================
async function cargarPerfilYPedidos() {
    if (!window.currentUser) {
        console.warn("No hay usuario para cargar el perfil");
        // Si no está logueado en la pantalla de perfil, botarlo a index (deshabilitado por ahora para evitar loops molestos locales)
        return;
    }

    try {
        const id = window.currentUser.id;
        
        // 1. Obtener la fila correspondiente en la tabla "perfiles_cliente"
        let { data: perfilData, error } = await window.DB.from('perfiles_cliente').select('*').eq('id', id).single();
        
        if (error) {
            // Si da error The result contains 0 rows (si la trigger de Supabase no corrió mágicamente al crear el user)
            if(error.code === 'PGRST116') {
               console.warn("El registro de perfil del cliente no existe todavía, intentando usar defaults...");
               perfilData = {
                  nombre_completo: window.currentUser.user_metadata?.nombre_completo || 'Usuario Nuevo',
                  telefono: '',
                  direccion_principal: ''
               }
            } else {
               throw error;
            }
        }

        // Poner datos en los campos
        const pNombre = document.getElementById('perfil-nombre');
        const pTel = document.getElementById('perfil-telefono');
        const pDir = document.getElementById('perfil-direccion');
        const viewNombre = document.getElementById('view-nombre'); // El de la corona grande

        if(pNombre) pNombre.value = perfilData.nombre_completo || '';
        if(pTel) pTel.value = perfilData.telefono || '';
        if(pDir) pDir.value = perfilData.direccion_principal || '';
        if(viewNombre) viewNombre.innerText = perfilData.nombre_completo?.split(' ')[0] || 'Miembro';

        // Lógica de Lealtad Monarca
        const pts = perfilData.puntos || 0;
        let rangoInfo = { titulo: 'Invitado Real', meta: 100, pct: 0, shadow: 'rgba(0,0,0,0.1)', icon: '👑', color: 'linear-gradient(90deg, #A86F32, #CD7F32)' };
        
        if (pts < 100) {
            rangoInfo = { titulo: 'Invitado Real', meta: 100, pct: (pts/100)*100, shadow: 'rgba(168,111,50,0.2)', icon: '🥉', color: 'linear-gradient(90deg, #A86F32, #CD7F32)' };
        } else if (pts < 500) {
            rangoInfo = { titulo: 'Duque / Duquesa', meta: 500, pct: ((pts-100)/400)*100, shadow: 'rgba(192,192,192,0.4)', icon: '🥈', color: 'linear-gradient(90deg, #A9A9A9, #E5E4E2)' };
        } else if (pts < 1500) {
            rangoInfo = { titulo: 'Príncipe / Princesa', meta: 1500, pct: ((pts-500)/1000)*100, shadow: 'rgba(212,175,55,0.4)', icon: '👑', color: 'linear-gradient(90deg, #B5942B, #D4AF37)' };
        } else {
            rangoInfo = { titulo: 'Rey / Reina', meta: null, pct: 100, shadow: 'rgba(0,0,0,0.6)', icon: '♛', color: 'linear-gradient(90deg, #222, #000)' };
        }

        const viewCorona = document.getElementById('view-corona');
        const viewRango = document.getElementById('view-rango');
        const lPts = document.getElementById('loyalty-pts');
        const lNext = document.getElementById('loyalty-next');
        const lProg = document.getElementById('loyalty-progress');

        if(viewCorona) {
            viewCorona.innerText = rangoInfo.icon;
            viewCorona.style.textShadow = `0 0 15px ${rangoInfo.shadow}`;
        }
        if(viewRango) viewRango.innerText = rangoInfo.titulo;
        if(lPts) lPts.innerText = `${pts} Pts Monarca`;
        if(lNext) lNext.innerText = rangoInfo.meta ? `Siguiente Rango: ${rangoInfo.meta} Pts` : 'Rango Máximo Alcanzado';
        if(lProg) {
            lProg.style.background = rangoInfo.color;
            setTimeout(() => { lProg.style.width = `${Math.min(100, rangoInfo.pct)}%`; }, 300);
        }

        // 2. Cargar Pedidos del Cliente
        const contActivos = document.getElementById('pedidos-activos');
        const contHistorial = document.querySelector('.profile-main .auth-box:nth-child(2)');
        
        if (contActivos) {
            const {data: pedidos, error: errPedidos} = await window.DB.from('pedidos')
                .select('*, detalle_pedido(*, producto_variantes(tamaño, productos(nombre, imagen_url)))')
                .eq('id_cliente', id)
                .order('fecha_pedido', { ascending: false });
                
            if (!errPedidos && pedidos && pedidos.length > 0) {
                let htmlActivos = '';
                let htmlHistorial = `<h3 style="font-family: var(--font-heading); font-size: 1.5rem; border-bottom: 1px solid #DDDDDD; padding-bottom: 1rem; margin-bottom: 2rem; color: #888;">Historial de Pedidos</h3>`;
                
                let countActivos = 0;
                let countHistorial = 0;

                pedidos.forEach(p => {
                    const esActivo = p.estado === 'pendiente' || p.estado === 'confirmado' || p.estado === 'esperando_pago';
                    const det = (p.detalle_pedido && p.detalle_pedido.length > 0) ? p.detalle_pedido[0] : null;
                    const nombreProd = det?.producto_variantes?.productos?.nombre || 'Orden Personalizada';
                    const imgUrl = det?.producto_variantes?.productos?.imagen_url || 'img/luxury_pastries.png';
                    const fechaTxt = p.fecha_entrega ? `Entrega: ${p.fecha_entrega}` : `Creado: ${new Date(p.fecha_pedido).toLocaleDateString()}`;
                    
                    let btnPagoHtml = '';
                    if (p.estado === 'esperando_pago') {
                        btnPagoHtml = `<a href="estado_pedido.html?folio=${p.folio}" class="btn btn-black" style="font-size:0.75rem; padding: 5px 10px; text-decoration:none;"><i class="fas fa-money-bill-wave"></i> Pagar Anticipo</a>`;
                    } else if (p.estado === 'confirmado' && (parseFloat(p.total) - parseFloat(p.anticipo || 0)) > 0) {
                        btnPagoHtml = `<a href="estado_pedido.html?folio=${p.folio}" class="btn btn-black" style="font-size:0.75rem; padding: 5px 10px; text-decoration:none;"><i class="fas fa-money-bill-wave"></i> Liquidar Saldo</a>`;
                    } else if (p.estado === 'pendiente') {
                        btnPagoHtml = `<span style="font-size:0.75rem; color:#E59E27;">Aprobación pte.</span>`;
                    }

                    const cardHtml = `
                        <div style="display:flex; align-items:center; gap: 15px; padding: 15px; border: 1px solid #EEE; border-radius: 8px; margin-bottom: 15px; background: ${esActivo ? '#FAFAFA' : '#FFF'}; position: relative;">
                            <img src="${imgUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid var(--gold-primary);">
                            <div style="flex-grow: 1;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
                                    <h4 style="font-family: var(--font-heading); margin:0;">${nombreProd}</h4>
                                    <span style="font-size: 0.8rem; padding: 4px 10px; border-radius: 20px; background: ${p.estado === 'esperando_pago' ? '#FED7D7' : (esActivo ? 'var(--gold-primary)' : '#E2E8F0')}; color: ${p.estado === 'esperando_pago' ? '#E53E3E' : (esActivo ? '#000' : '#4A5568')}; font-weight: bold;">${p.estado.replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fas fa-receipt"></i> Folio: ${p.folio}</span>
                                    <span style="font-weight: bold; color: var(--black-accent);">$${p.total}</span>
                                    ${btnPagoHtml}
                                </div>
                            </div>
                        </div>
                    `;

                    if (esActivo) {
                        htmlActivos += cardHtml;
                        countActivos++;
                    } else {
                        htmlHistorial += cardHtml;
                        countHistorial++;
                    }
                });

                if (countActivos > 0) contActivos.innerHTML = htmlActivos;
                if (countHistorial > 0 && contHistorial) contHistorial.innerHTML = htmlHistorial;
            }
        }

    } catch(err) {
        console.error(err);
        alert("Error cargando los detalles del perfil desde Base de Datos: " + err.message);
    }
}

// Evento global para el botón guardar de perfil.html
async function guardarPerfilEnDB() {
    if (!window.currentUser) return;
    try {
        const pNombre = document.getElementById('perfil-nombre').value;
        const pTel = document.getElementById('perfil-telefono').value;
        const pDir = document.getElementById('perfil-direccion').value;

        // Upsert permite Insertar si no existía el registro, y Actualizar si ya existía
        const { error } = await window.DB.from('perfiles_cliente').upsert({
            id: window.currentUser.id,
            nombre_completo: pNombre,
            telefono: pTel,
            direccion_principal: pDir
        });

        if (error) throw error;
        
        alert("¡Tus datos privados han sido actualizados con éxito en nuestros servidores!");
        
        // Actualizar la corona local
        document.getElementById('view-nombre').innerText = pNombre.split(' ')[0];

    } catch (err) {
        console.error("Error guardando:", err);
        alert("Hubo un error al guardar tu información: " + err.message);
    }
}
