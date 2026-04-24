// ==========================================
// MOTOR DEL PUNTO DE VENTA (POS)
// ==========================================

let posCart = [];
let allProductsCache = [];

async function loadPosProducts(categoryFilter = null) {
    const grid = document.getElementById('pos-products-grid');
    if(!window.DB) return;

    try {
        const grid = document.getElementById('pos-products-grid');
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 2rem;">Sincronizando con la Base de Datos...</p>';

        // Obtener productos reales con sus variantes y su categoría
        const { data, error } = await window.DB.from('productos')
            .select(`
                *,
                categorias (nombre),
                producto_variantes (*)
            `)
            .eq('activo', true);
            
        if(error) throw error;
        
        allProductsCache = data || [];
        
        // Generar botones de categorías dinámicamente
        generarFiltrosCategoriasPos();
        
        renderPosProducts(null);
    } catch(err) {
        console.error("Error cargando inventario POS:", err);
        const grid = document.getElementById('pos-products-grid');
        if(grid) grid.innerHTML = '<p style="color:red; text-align:center;">Error cargando inventario POS</p>';
    }
}

function generarFiltrosCategoriasPos() {
    const container = document.getElementById('pos-categories-container');
    if (!container) return;
    
    // Encontrar categorías únicas que tengan productos activos
    const categoriasSet = new Set();
    const categoriasArr = [];
    
    allProductsCache.forEach(p => {
        if (p.categorias && p.categorias.nombre && !categoriasSet.has(p.id_categoria)) {
            categoriasSet.add(p.id_categoria);
            categoriasArr.push({ id: p.id_categoria, nombre: p.categorias.nombre });
        }
    });
    
    // Construir HTML
    let html = `<button class="cat-btn active" onclick="filterCategory(null)">🚀 Todos</button>`;
    categoriasArr.forEach(c => {
        html += `<button class="cat-btn" onclick="filterCategory(${c.id})">${c.nombre}</button>`;
    });
    
    container.innerHTML = html;
}

function filterCategory(categoryId) {
    const buttons = document.querySelectorAll('#pos-categories-container .cat-btn');
    buttons.forEach(b => b.classList.remove('active'));
    // Reactivar el clickeado
    event.currentTarget.classList.add('active');
    
    renderPosProducts(categoryId);
}

function renderPosProducts(categoryId = null) {
    const grid = document.getElementById('pos-products-grid');
    grid.innerHTML = '';
    
    let filtered = allProductsCache;
    if (categoryId !== null) {
        filtered = filtered.filter(p => p.id_categoria === categoryId);
    }
    
    if(filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center;">No hay productos en esta categoría.</p>';
        return;
    }

    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => procesarClicProductoPOS(p);
        
        // Determinar el precio a mostrar (Desde el más barato si hay varios tamaños)
        let precioDisplay = "$0.00";
        if (p.producto_variantes && p.producto_variantes.length > 0) {
            const precios = p.producto_variantes.filter(v => v.activo).map(v => v.precio_venta);
            if (precios.length > 0) {
                const minPrice = Math.min(...precios);
                precioDisplay = precios.length > 1 ? `Desde $${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)}`;
            }
        }

        div.innerHTML = `
            <img src="${p.imagen_url || 'img/luxury_pastries.png'}" alt="${p.nombre}" style="height:140px; object-fit:cover; border-radius:12px 12px 0 0; width:100%;">
            <div class="product-card-body" style="padding:15px; display:flex; flex-direction:column; justify-content:space-between; flex-grow:1;">
                <div>
                    <h4 class="product-card-title" style="margin:0 0 5px 0;">${p.nombre}</h4>
                    ${p.sabor ? `<p style="font-size:0.8rem; color:#777; margin:0;">${p.sabor}</p>` : ''}
                </div>
                <div class="product-card-price" style="font-weight:bold; color:var(--pos-primary); margin-top:10px;">${precioDisplay}</div>
            </div>
        `;
        grid.appendChild(div);
    });
}

function procesarClicProductoPOS(product) {
    if (!product.producto_variantes || product.producto_variantes.length === 0) {
        alert("Este producto no tiene variantes (tamaños/precios) configuradas en la base de datos.");
        return;
    }
    
    const activas = product.producto_variantes.filter(v => v.activo);
    if (activas.length === 0) {
        alert("Este producto no tiene variantes activas.");
        return;
    }
    
    if (activas.length === 1) {
        // Solo 1 variante, agregar directo
        addToCart(product, activas[0]);
    } else {
        // Mostrar modal
        document.getElementById('pos-var-prod-name').innerText = product.nombre;
        const list = document.getElementById('pos-variantes-list');
        list.innerHTML = '';
        
        activas.forEach(v => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.cssText = 'width:100%; padding:15px; text-align:left; border:1px solid #CCC; border-radius:8px; background:#FFF; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:background 0.2s; margin-bottom: 10px;';
            btn.onmouseover = () => btn.style.background = '#F7FAFC';
            btn.onmouseout = () => btn.style.background = '#FFF';
            
            btn.innerHTML = `
                <span style="font-weight:600; font-size:1.1rem;">${v.tamaño || 'Único'}</span>
                <span style="color:var(--pos-primary); font-weight:bold; font-size:1.2rem;">$${v.precio_venta.toFixed(2)}</span>
            `;
            
            btn.onclick = () => {
                addToCart(product, v);
                document.getElementById('modal-pos-variantes').style.display = 'none';
            };
            
            list.appendChild(btn);
        });
        
        document.getElementById('modal-pos-variantes').style.display = 'flex';
    }
}

function addToCart(product, variant) {
    const cartItemId = `${product.id_producto}_${variant.id_variante}`;
    
    const existing = posCart.find(i => i.cartItemId === cartItemId);
    if(existing) {
        existing.qty++;
    } else {
        const displayName = variant.tamaño && variant.tamaño.toLowerCase() !== 'único' 
            ? `${product.nombre} (${variant.tamaño})` 
            : product.nombre;
            
        posCart.push({ 
            cartItemId: cartItemId,
            id: product.id_producto, 
            variantId: variant.id_variante,
            name: displayName, 
            price: variant.precio_venta, 
            qty: 1 
        });
    }
    renderCart();
}

function removeOneFromCart(cartItemId) {
    const index = posCart.findIndex(i => i.cartItemId === cartItemId);
    if(index > -1) {
        if(posCart[index].qty > 1) posCart[index].qty--;
        else posCart.splice(index, 1);
        renderCart();
    }
}

function renderCart() {
    const body = document.getElementById('pos-cart-body');
    const badge = document.getElementById('cart-item-count');
    const subtotalEl = document.getElementById('pos-subtotal');
    
    if(posCart.length === 0) {
        body.innerHTML = '<div style="text-align:center; color:var(--pos-gray); margin-top:2rem;">El ticket está vacío.</div>';
        badge.innerText = '0';
        subtotalEl.innerText = '$0.00';
        calculateCart();
        return;
    }

    body.innerHTML = '';
    let totalItems = 0;
    let subtotal = 0;

    posCart.forEach(item => {
        totalItems += item.qty;
        subtotal += (item.price * item.qty);

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div><strong>${item.name}</strong><br><span style="font-size:0.8rem;color:#777;">$${item.price.toFixed(2)} c/u</span></div>
            <div class="item-qty">x${item.qty}</div>
            <div class="item-price">$${(item.price * item.qty).toFixed(2)}
                <span class="item-remove" onclick="removeOneFromCart('${item.cartItemId}')">✖</span>
            </div>
        `;
        body.appendChild(el);
    });

    badge.innerText = totalItems;
    subtotalEl.innerText = `$${subtotal.toFixed(2)}`;
    calculateCart();
}

function calculateCart() {
    const subtotalText = document.getElementById('pos-subtotal').innerText.replace('$','');
    const subtotal = parseFloat(subtotalText) || 0;
    
    document.getElementById('pos-subtotal').innerText = `$${subtotal.toFixed(2)}`;
    
    const btnPay = document.getElementById('btn-checkout');
    btnPay.disabled = (subtotal === 0);
}

function openPaymentModal() {
    const subtotalText = document.getElementById('pos-subtotal').innerText.replace('$','');
    const subtotal = parseFloat(subtotalText) || 0;
    
    document.getElementById('modal-amount-display').innerText = `$${subtotal.toFixed(2)}`;
    
    // Asignar por defecto el total al efectivo para agilizar el cobro
    document.getElementById('pay-efectivo').value = subtotal.toFixed(2);
    document.getElementById('pay-tarjeta').value = "0";
    document.getElementById('pay-transferencia').value = "0";
    
    calculateMixedPayment();
    
    document.getElementById('payment-modal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function calculateMixedPayment() {
    const total = parseFloat(document.getElementById('modal-amount-display').innerText.replace('$','')) || 0;
    const efectivo = parseFloat(document.getElementById('pay-efectivo').value) || 0;
    const tarjeta = parseFloat(document.getElementById('pay-tarjeta').value) || 0;
    const transf = parseFloat(document.getElementById('pay-transferencia').value) || 0;
    
    const ingresado = efectivo + tarjeta + transf;
    const diferencia = ingresado - total;
    
    document.getElementById('mixed-total-ingresado').innerText = `$${ingresado.toFixed(2)}`;
    
    const restanteLabel = document.getElementById('mixed-restante-label');
    const restanteVal = document.getElementById('mixed-restante-val');
    const btnConfirm = document.getElementById('btn-confirm-mixed-payment');
    
    if (diferencia < 0) {
        restanteLabel.innerText = "Faltante:";
        restanteVal.innerText = `$${Math.abs(diferencia).toFixed(2)}`;
        restanteVal.style.color = "red";
        btnConfirm.disabled = true;
    } else {
        restanteLabel.innerText = "Cambio (Efectivo):";
        restanteVal.innerText = `$${diferencia.toFixed(2)}`;
        restanteVal.style.color = "green";
        btnConfirm.disabled = false;
    }
}

async function processMixedPayment() {
    if(posCart.length === 0) return;

    const btnConfirm = document.getElementById('btn-confirm-mixed-payment');
    btnConfirm.disabled = true;
    btnConfirm.innerText = "Procesando...";

    const totalInfo = parseFloat(document.getElementById('modal-amount-display').innerText.replace('$','')) || 0;
    const efectivoInput = parseFloat(document.getElementById('pay-efectivo').value) || 0;
    const tarjetaInput = parseFloat(document.getElementById('pay-tarjeta').value) || 0;
    const transfInput = parseFloat(document.getElementById('pay-transferencia').value) || 0;
    
    let restanteAbonar = totalInfo;
    let finTarjeta = 0, finTransf = 0, finEfectivo = 0;
    
    if (tarjetaInput > 0) finTarjeta = Math.min(tarjetaInput, restanteAbonar);
    restanteAbonar -= finTarjeta;
    
    if (transfInput > 0) finTransf = Math.min(transfInput, restanteAbonar);
    restanteAbonar -= finTransf;
    
    if (efectivoInput > 0) finEfectivo = Math.min(efectivoInput, restanteAbonar);
    restanteAbonar -= finEfectivo;
    
    const cambio = (efectivoInput + tarjetaInput + transfInput) - totalInfo;

    const ticketId = 'MON-' + Math.floor(Math.random() * 100000);

    const ticketHtml = `
        <html>
        <head>
            <style>
                body {
                    margin: 0; padding: 0;
                    width: 76mm;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 13px;
                    color: black;
                    text-align: center;
                }
                .ticket { padding: 10px; }
                .logo-img { width: 45mm; margin-bottom: 5px; filter: grayscale(100%); }
                h2 { font-size: 16px; margin: 5px 0; letter-spacing: 1px; }
                .divider { border-bottom: 1px dashed black; margin: 10px 0; }
                table { width: 100%; text-align: left; margin-bottom: 10px; }
                .qty { width: 15%; vertical-align: top; }
                .desc { width: 55%; vertical-align: top; }
                .amt { width: 30%; text-align: right; vertical-align: top; }
                .totals { margin-top: 5px; text-align: right; font-weight: bold; }
                .center { text-align: center; }
            </style>
        </head>
        <body>
            <div class="ticket">
                <img src="${window.location.origin}/img/logo.png" class="logo-img" onerror="this.style.display='none'">
                <h2>MONARCA PASTELERÍA</h2>
                <p style="font-size:11px; margin: 2px 0;">Atención Exclusiva</p>
                <p style="font-size:11px; margin: 2px 0;">Tel: +52 55 6653 7807</p>
                <div class="divider"></div>
                <p style="margin: 2px 0; text-align: left;"><strong>Folio:</strong> ${ticketId}</p>
                <p style="margin: 2px 0; text-align: left;"><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin: 2px 0; text-align: left;"><strong>Cajero:</strong> ${document.getElementById('pos-admin-name').innerText}</p>
                <div class="divider"></div>
                
                <table>
                    ${posCart.map(i => `
                    <tr>
                        <td class="qty">${i.qty}</td>
                        <td class="desc">${i.name}</td>
                        <td class="amt">$${(i.price * i.qty).toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </table>

                <div class="divider"></div>
                <div class="totals" style="font-size: 15px;">TOTAL: $${totalInfo.toFixed(2)}</div>
                
                <div style="text-align: right; font-size: 11px; margin-top: 5px;">
                    ${finEfectivo > 0 ? `Efectivo: $${efectivoInput.toFixed(2)}<br>` : ''}
                    ${finTarjeta > 0 ? `Tarjeta: $${finTarjeta.toFixed(2)}<br>` : ''}
                    ${finTransf > 0 ? `Transf: $${finTransf.toFixed(2)}<br>` : ''}
                    ${cambio > 0 ? `<strong style="font-size:13px;">Cambio: $${cambio.toFixed(2)}</strong>` : ''}
                </div>

                <div class="divider"></div>
                <p class="center" style="font-size:11px; font-weight:bold;">¡Gracias por su majestuosa preferencia!</p>
                <p class="center" style="font-size:10px;">Conserve este ticket para cualquier aclaración.</p>
                <br><br><br>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `;

    // 1. REGISTRO CONTABLE ERP FINANZAS (Múltiples registros si es mixto)
    try {
        const inserts = [];
        const baseDesc = `PAGO Ticket ${ticketId} - ${posCart.length} Productos`;
        if (finEfectivo > 0) inserts.push({ tipo: 'ingreso', categoria: 'ventas_mostrador', monto: finEfectivo, metodo: 'Efectivo', descripcion: baseDesc });
        if (finTarjeta > 0) inserts.push({ tipo: 'ingreso', categoria: 'ventas_mostrador', monto: finTarjeta, metodo: 'Tarjeta', descripcion: baseDesc });
        if (finTransf > 0) inserts.push({ tipo: 'ingreso', categoria: 'ventas_mostrador', monto: finTransf, metodo: 'Transferencia', descripcion: baseDesc });
        
        if (inserts.length > 0) {
            await window.DB.from('erp_finanzas').insert(inserts);
        }
    } catch(err) {
        console.error("No se pudo asentar en el Libro Mayor (Contabilidad):", err);
    }

    // Resetear Caja
    posCart = [];
    renderCart();
    
    closePaymentModal();
    btnConfirm.disabled = false;
    btnConfirm.innerText = "Confirmar Pago";
    alert("¡Venta Registrada Exitosamente!");

    // Imprimir Ticket invisible
    const frame = document.getElementById('print-frame');
    frame.contentWindow.document.open();
    frame.contentWindow.document.write(ticketHtml);
    frame.contentWindow.document.close();
}

// ==========================================
// MÓDULO ERP: PRODUCCIÓN
// ==========================================

async function initProduccion() {
    if(!window.DB) return;
    
    // Set default dates
    document.getElementById('prod-fecha').valueAsDate = new Date();
    let caducidad = new Date();
    caducidad.setDate(caducidad.getDate() + 5); // Default 5 days
    document.getElementById('prod-caducidad').valueAsDate = caducidad;
    
    // Set Responsible Name
    document.getElementById('prod-resp').value = document.getElementById('pos-admin-name').innerText;

    // Load Base Products
    try {
        const { data, error } = await window.DB.from('productos').select('id_producto, nombre').eq('activo', true);
        if(error) throw error;
        const selector = document.getElementById('prod-selector');
        selector.innerHTML = '<option value="">Seleccione un producto</option>';
        data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_producto;
            opt.innerText = p.nombre;
            selector.appendChild(opt);
        });
    } catch(err) {
        console.error("Error loading products for prod", err);
    }
    
    loadHistorialProduccion();
}

async function loadVariantesParaProduccion() {
    const prodId = document.getElementById('prod-selector').value;
    const varSelector = document.getElementById('var-selector');
    varSelector.innerHTML = '<option value="">Cargando tamaños...</option>';
    
    if(!prodId) {
        varSelector.innerHTML = '<option value="">Selecciona el producto primero</option>';
        return;
    }

    try {
        const { data, error } = await window.DB.from('producto_variantes').select('*').eq('id_producto', prodId);
        if(error) throw error;
        
        if(!data || data.length === 0) {
            varSelector.innerHTML = '<option value="">No hay variantes. Ve a catálogo.</option>';
            return;
        }

        varSelector.innerHTML = '';
        data.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id_variante;
            opt.innerText = `${v.tamaño || 'Único'} (Inventario actual: ${v.stock || 0})`;
            opt.dataset.stock = v.stock || 0;
            varSelector.appendChild(opt);
        });
    } catch(err) {
        console.error(err);
        varSelector.innerHTML = '<option value="">Error cargando tamaños</option>';
    }
}

async function guardarLoteProduccion() {
    const varSelector = document.getElementById('var-selector');
    const varId = varSelector.value;
    const qty = parseInt(document.getElementById('prod-qty').value);
    const fecha = document.getElementById('prod-fecha').value;
    const caducidad = document.getElementById('prod-caducidad').value;
    
    if(!varId || isNaN(qty) || qty <= 0) {
        alert("Selecciona una variante y una cantidad válida mayor a 0.");
        return;
    }

    if(!confirm(`¿Confirmas la adición de ${qty} unidades al inventario Físico (Stock)?`)) return;

    try {
        // Traer datos de la variante base para buscar la Receta
        const { data: vData, error: vErr } = await window.DB.from('producto_variantes').select('stock, id_producto, tamaño').eq('id_variante', varId).single();
        if(vErr) throw vErr;

        // 1. Crear el Lote
        const { error: errLote } = await window.DB.from('erp_lotes_produccion').insert({
            id_variante: varId,
            cantidad_producida: qty,
            fecha_produccion: fecha,
            fecha_caducidad: caducidad,
            id_responsable: window.currentUser.id
        });
        if(errLote) throw errLote;

        // 2. IA MATEMÁTICA: DESCUENTO DE MATERIA PRIMA FÍSICA (BOM)
        try {
            const { data: formulaData, error: errForm } = await window.DB.from('erp_recetas')
                .select(`id_receta, erp_receta_ingredientes (id_ingrediente, cantidad)`)
                .eq('id_producto', vData.id_producto).single();
            
            if (!errForm && formulaData && formulaData.erp_receta_ingredientes) {
                // Determinar el multiplicador por tamaño
                let multiplier = 1.0;
                const txtSize = (vData.tamaño || '').toLowerCase();
                if (txtSize.includes('mediano')) multiplier = 2.0;
                if (txtSize.includes('familiar') || txtSize.includes('grande')) multiplier = 3.0;

                // Descontar cada ingrediente iterativamente
                for (let ing of formulaData.erp_receta_ingredientes) {
                    const totalDeduct = ing.cantidad * multiplier * qty;
                    
                    // fetch actual stock of ingredient
                    const { data: ingDB } = await window.DB.from('erp_ingredientes').select('stock_actual').eq('id_ingrediente', ing.id_ingrediente).single();
                    const nextStock = (ingDB.stock_actual || 0) - totalDeduct;

                    // Update
                    await window.DB.from('erp_ingredientes').update({ stock_actual: nextStock }).eq('id_ingrediente', ing.id_ingrediente);
                    
                    // Registrar el movimiento de Egreso
                    await window.DB.from('erp_movimientos_inventario').insert({
                        id_ingrediente: ing.id_ingrediente,
                        id_variante: varId,
                        tipo_movimiento: 'salida',
                        cantidad: -totalDeduct,
                        referencia: `Deducción Lote prod de ${vData.tamaño} (x${qty})`
                    });
                }
            }
        } catch(formulaProcessError) {
            console.error("No se pudo descontar la materia prima (Posiblemente no ha sido configurada la receta): ", formulaProcessError);
        }

        // 3. Actualizar la variante sumando el stock de Tienda
        const nuevoStock = (vData.stock || 0) + qty;
        const { error: updErr } = await window.DB.from('producto_variantes').update({ stock: nuevoStock }).eq('id_variante', varId);
        if(updErr) throw updErr;

        alert(`✅ Lote de producción registrado exitosamente.\n\nInventario incrementado en ${qty} Unidades.\nSi existía una Receta (BOM) ligada a este producto, sus ingredientes físicos han sido descontados automáticamente aplicando multiplicador de tamaño x${vData.tamaño ? vData.tamaño : 1}.`);
        
        // Refresh UI
        document.getElementById('prod-qty').value = 1;
        loadVariantesParaProduccion();
        loadHistorialProduccion();

    } catch(err) {
        console.error("Error guardando produccion", err);
        alert("Hubo un error del sistema al procesar la alta de producción: " + err.message);
    }
}

async function loadHistorialProduccion() {
    const tbody = document.getElementById('tabla-lotes-produccion');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Cargando...</td></tr>';

    try {
        // Usamos una sintaxis cruzada de Supabase para traer IDs
        const { data, error } = await window.DB.from('erp_lotes_produccion')
            .select(`
                id_lote,
                cantidad_producida,
                fecha_produccion,
                fecha_caducidad,
                producto_variantes (
                    tamaño,
                    productos ( nombre )
                )
            `)
            .order('id_lote', { ascending: false })
            .limit(15);
            
        if(error) throw error;

        if(!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay registros recientes de producción.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(lote => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #EEE";
            
            // Nested parsing safely
            let prodName = "Variante Desconocida";
            if(lote.producto_variantes && lote.producto_variantes.productos) {
                prodName = `${lote.producto_variantes.productos.nombre} (${lote.producto_variantes.tamaño})`;
            }

            const formatD = (ds) => ds ? new Date(ds).toLocaleDateString() : '-';

            tr.innerHTML = `
                <td style="padding:10px;"><b>LOT-${lote.id_lote}</b></td>
                <td style="padding:10px;">${prodName}</td>
                <td style="padding:10px; font-weight:bold; color:var(--pos-primary);">+${lote.cantidad_producida} Ud</td>
                <td style="padding:10px; color:var(--pos-gray);">${formatD(lote.fecha_produccion)}</td>
                <td style="padding:10px; color:var(--pos-gray);">${formatD(lote.fecha_caducidad)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Error al cargar registros. Revisa permisos RLS.</td></tr>';
    }
}

// ==========================================
// MÓDULO ERP: INVENTARIO (Stock Físico / Materia Prima)
// ==========================================

function switchInvTab(tabName) {
    document.getElementById('btn-tab-terminados').classList.remove('active');
    document.getElementById('btn-tab-ingredientes').classList.remove('active');
    
    document.getElementById('btn-tab-' + tabName).classList.add('active');
    
    document.getElementById('inv-tab-terminados').style.display = tabName === 'terminados' ? 'block' : 'none';
    document.getElementById('inv-tab-ingredientes').style.display = tabName === 'ingredientes' ? 'block' : 'none';
    
    if (tabName === 'terminados') loadInventarioTerminados();
    else loadInventarioIngredientes();
}

async function initInventario() {
    // default tab terminados
    switchInvTab('terminados');
}

async function loadInventarioTerminados() {
    const tbody = document.getElementById('tabla-inv-terminados');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Sincronizando inventario terminado...</td></tr>';
    
    try {
        const { data, error } = await window.DB.from('productos')
            .select(`
                id_producto,
                nombre,
                producto_variantes (tamaño, stock, activo)
            `)
            .eq('activo', true)
            .order('nombre', { ascending: true });
            
        if(error) throw error;
        
        if(!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay productos registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(prod => {
            const vars = prod.producto_variantes ? prod.producto_variantes.filter(v => v.activo) : [];
            if(vars.length === 0) return; // Saltar si no tiene variantes activas

            let totalStock = 0;
            vars.forEach(v => totalStock += (v.stock || 0));

            let tamanosStr = "";
            if(vars.length === 1) {
                tamanosStr = vars[0].tamaño || 'Único';
            } else {
                tamanosStr = `${vars[0].tamaño} - ${vars[vars.length-1].tamaño} (${vars.length} Tamaños)`;
            }

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #EEE";
            
            // Highlight low stock (por debajo de 5 total)
            let stockColor = totalStock <= 5 ? "red" : "var(--pos-primary)";

            tr.innerHTML = `
                <td style="padding:10px;"><b>${prod.nombre}</b></td>
                <td style="padding:10px; color:var(--pos-gray); font-size:0.85rem;">${tamanosStr}</td>
                <td style="padding:10px; text-align:right; font-weight:bold; font-size:1.1rem; color:${stockColor};">${totalStock}</td>
                <td style="padding:10px; text-align:center;">
                    <button style="border:none; background:#3182CE; color:white; padding:5px 10px; border-radius:4px; font-size:0.8rem; cursor:pointer;" onclick="abrirModalEditarProducto(${prod.id_producto})">Editar Info</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if(tbody.innerHTML === '') {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay productos con variantes activas.</td></tr>';
        }

    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error al cargar inventario.</td></tr>';
    }
}

async function loadInventarioIngredientes() {
    const tbody = document.getElementById('tabla-inv-ingredientes');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Sincronizando materia prima...</td></tr>';
    
    try {
        const { data, error } = await window.DB.from('erp_ingredientes').select('*').eq('activo', true).order('nombre', { ascending: true });
        
        if(error) throw error;
        
        if(!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Catálogo de ingredientes vacío. Da clic en "+ Nuevo Ingrediente".</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(ing => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #EEE";
            
            // Highlight empty stock
            let qtyColor = ing.stock_actual <= ing.stock_minimo ? "red" : "var(--pos-text)";

            tr.innerHTML = `
                <td style="padding:10px;"><b>${ing.nombre}</b></td>
                <td style="padding:10px; font-weight:bold; color:${qtyColor};">${ing.stock_actual || 0}</td>
                <td style="padding:10px; color:var(--pos-gray);">${ing.unidad_medida}</td>
                <td style="padding:10px;"><button style="border:none; background:#E2E8F0; padding:5px 10px; border-radius:4px; font-size:0.8rem; cursor:pointer;" onclick="ajustarIngrediente(${ing.id_ingrediente}, '${ing.nombre}')">Ajustar / Comprar</button></td>
            `;
            tbody.appendChild(tr);
        });

    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error al cargar ingredientes.</td></tr>';
    }
}

async function promptNuevoIngrediente() {
    const nombre = prompt("Nombre del Ingrediente (ej: Harina de Almendra):");
    if(!nombre) return;
    const medida = prompt("Unidad de Medida (ej: kg, g, ml, litros, pzs):", "g");
    if(!medida) return;
    
    try {
        const { error } = await window.DB.from('erp_ingredientes').insert({
            nombre: nombre,
            unidad_medida: medida,
            stock_actual: 0
        });
        if(error) throw error;
        
        alert("Ingrediente dado de alta en la bodega.");
        loadInventarioIngredientes();
    } catch(err) {
        console.error(err);
        alert("Error creando ingrediente: " + err.message);
    }
}

async function ajustarIngrediente(id, nombre) {
    const cant = prompt(`¿Cuántas unidades deseas sumar (compra) o restar (usando número negativo) al stock de ${nombre}?`);
    if(!cant || isNaN(parseInt(cant))) return;
    
    try {
        // Fetch current
        const { data: cur } = await window.DB.from('erp_ingredientes').select('stock_actual').eq('id_ingrediente', id).single();
        const nStock = (cur.stock_actual || 0) + parseInt(cant);
        
        const { error } = await window.DB.from('erp_ingredientes').update({ stock_actual: nStock }).eq('id_ingrediente', id);
        if(error) throw error;

        // Registrar movimiento
        await window.DB.from('erp_movimientos_inventario').insert({
            id_ingrediente: id,
            tipo_movimiento: parseInt(cant) > 0 ? 'entrada' : 'ajuste',
            cantidad: parseInt(cant),
            referencia: 'Ajuste Manual POS'
        });

        alert("Inventario actualizado.");
        loadInventarioIngredientes();
    } catch(err) {
        console.error(err);
        alert("Error: " + err.message);
    }
}

// ==========================================
// MÓDULO ERP: RECETAS E INGENIERÍA DE MENÚ (BOM)
// ==========================================

async function initRecetas() {
    if(!window.DB) return;
    
    // Load Base Products
    try {
        const { data, error } = await window.DB.from('productos').select('id_producto, nombre').eq('activo', true);
        if(error) throw error;
        const selector = document.getElementById('receta-prod-selector');
        selector.innerHTML = '<option value="">Seleccione un producto...</option>';
        data.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_producto;
            opt.innerText = p.nombre;
            selector.appendChild(opt);
        });
    } catch(err) {
        console.error("Error loading products for recetas", err);
    }

    // Load available ingredients for dropdown
    try {
        const { data, error } = await window.DB.from('erp_ingredientes').select('id_ingrediente, nombre, unidad_medida').eq('activo', true).order('nombre');
        if(error) throw error;
        const selAdd = document.getElementById('receta-ingrediente-add');
        selAdd.innerHTML = '<option value="">Seleccione materia prima...</option>';
        data.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i.id_ingrediente;
            opt.innerText = `${i.nombre} (${i.unidad_medida})`;
            selAdd.appendChild(opt);
        });
    } catch(err) {
        console.error("Error loading ingredients", err);
    }
}

async function loadDetalleReceta() {
    const prodId = document.getElementById('receta-prod-selector').value;
    const txtPrep = document.getElementById('receta-preparacion');
    const txtPdf = document.getElementById('receta-pdf');
    const linkPdf = document.getElementById('receta-pdf-link');
    const hiddenId = document.getElementById('current-id-receta');
    const tbody = document.getElementById('tabla-formula');

    if(!prodId) {
        txtPrep.value = ''; txtPdf.value = ''; hiddenId.value = ''; linkPdf.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--pos-gray);">Selecciona un producto a la izquierda.</td></tr>';
        return;
    }

    try {
        // Fetch existing recipe
        const { data, error } = await window.DB.from('erp_recetas').select('*').eq('id_producto', prodId).single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'not found'
        
        if(data) {
            txtPrep.value = data.descripcion_preparacion || '';
            txtPdf.value = data.pdf_url || '';
            hiddenId.value = data.id_receta;
            if(data.pdf_url) {
                linkPdf.href = data.pdf_url;
                linkPdf.style.display = 'inline-block';
            } else {
                linkPdf.style.display = 'none';
            }
            loadFormulaIngredientes(data.id_receta);
        } else {
            // New internal recipe
            txtPrep.value = ''; txtPdf.value = ''; hiddenId.value = ''; linkPdf.style.display = 'none';
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--pos-gray);">No existe fórmula registrada aún. Creada al dar "Guardar Receta Magna".</td></tr>';
        }
    } catch(err) {
        console.error(err);
    }
}

async function guardarMetaReceta() {
    const prodId = document.getElementById('receta-prod-selector').value;
    if(!prodId) return alert("Selecciona un producto primero.");

    const txtPrep = document.getElementById('receta-preparacion').value;
    const txtPdf = document.getElementById('receta-pdf').value;
    const hiddenId = document.getElementById('current-id-receta').value;

    try {
        if(hiddenId) {
            // Update
            const { error } = await window.DB.from('erp_recetas').update({
                descripcion_preparacion: txtPrep,
                pdf_url: txtPdf
            }).eq('id_receta', hiddenId);
            if(error) throw error;
            alert("Receta actualizada con éxito.");
        } else {
            // Insert
            const { data, error } = await window.DB.from('erp_recetas').insert({
                id_producto: prodId,
                descripcion_preparacion: txtPrep,
                pdf_url: txtPdf
            }).select();
            if(error) throw error;
            if(data && data.length > 0) {
                document.getElementById('current-id-receta').value = data[0].id_receta;
            }
            alert("Base de Receta elaborada con éxito. Ya puedes añadir la fórmula de ingredientes.");
            loadDetalleReceta();
        }
    } catch(err) {
        console.error(err);
        alert("Error guardando receta: " + err.message);
    }
}

async function loadFormulaIngredientes(idReceta) {
    const tbody = document.getElementById('tabla-formula');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando Bill of Materials...</td></tr>';
    
    try {
        const { data, error } = await window.DB.from('erp_receta_ingredientes')
            .select(`
                id,
                cantidad,
                erp_ingredientes (nombre, unidad_medida)
            `)
            .eq('id_receta', idReceta);

        if(error) throw error;

        if(!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Fórmula Vacía. Registra ingredientes arriba.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #EEE";
            tr.innerHTML = `
                <td style="padding:10px;">${item.erp_ingredientes.nombre}</td>
                <td style="padding:10px; font-weight:bold;">${item.cantidad}</td>
                <td style="padding:10px; color:var(--pos-gray);">${item.erp_ingredientes.unidad_medida}</td>
                <td style="padding:10px; text-align:center;">
                    <button style="color:red; background:none; border:none; font-weight:bold; cursor:pointer;" onclick="quitarIngredienteReceta(${item.id})">✖</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error al cargar fórmula.</td></tr>';
    }
}

async function agregarIngredienteReceta() {
    const idReceta = document.getElementById('current-id-receta').value;
    if(!idReceta) return alert("Debes guardar primero la Receta Magna (el PDF/Texto) antes de poder agregar matemáticamente los Ingredientes.");

    const ingId = document.getElementById('receta-ingrediente-add').value;
    const qty = parseFloat(document.getElementById('receta-qty-add').value);

    if(!ingId || isNaN(qty) || qty <= 0) return alert("Selecciona un ingrediente y escribe una cantidad numérica válida.");

    try {
        const { error } = await window.DB.from('erp_receta_ingredientes').insert({
            id_receta: idReceta,
            id_ingrediente: ingId,
            cantidad: qty
        });
        if(error) throw error;
        
        document.getElementById('receta-ingrediente-add').value = '';
        document.getElementById('receta-qty-add').value = '';
        loadFormulaIngredientes(idReceta);
    } catch(err) {
        console.error(err);
        alert("Error al añadir a fórmula: " + err.message);
    }
}

async function quitarIngredienteReceta(idRow) {
    if(!confirm("¿Eliminar ingrediente de la fórmula base?")) return;
    try {
        const { error } = await window.DB.from('erp_receta_ingredientes').delete().eq('id', idRow);
        if(error) throw error;
        const idReceta = document.getElementById('current-id-receta').value;
        loadFormulaIngredientes(idReceta);
    } catch(err) {
        console.error(err);
    }
}

// ==========================================
// MÓDULO ERP: CATÁLOGO (STORAGE BUCKETS)
// ==========================================

let catCurrentPath = '';
const BUCKET_NAME = 'monarca-assets'; // Nombre del Bucket a crear en Supabase

async function initCatalogo() {
    if(!window.DB) return;
    catCurrentPath = '';
    await renderFoldersList();
    await cargarArchivosDirectorio();
}

// "Carpetas Virtuales" guardadas localmente para agilizar la UI, dado que Supabase api list() a veces solo da folders si contienen algo.
let virtualFolders = ['pasteles/', 'reposteria/', 'recetas/'];

async function renderFoldersList() {
    const list = document.getElementById('cat-folders-list');
    list.innerHTML = `
        <li style="padding:10px; background:${catCurrentPath === '' ? '#E2E8F0' : '#F7FAFC'}; border-radius:6px; cursor:pointer; font-weight:600; margin-bottom:5px;" onclick="seleccionarCarpeta('')">📁 Raíz (/)</li>
    `;
    
    virtualFolders.forEach(f => {
        const isActive = catCurrentPath === f;
        list.innerHTML += `
            <li style="padding:10px; cursor:pointer; background:${isActive ? '#E2E8F0' : 'transparent'}; border-radius:6px;" onclick="seleccionarCarpeta('${f}')">📁 ${f}</li>
        `;
    });
}

function crearCarpetaVisual() {
    let nf = document.getElementById('cat-new-folder').value.trim();
    if(!nf) return;
    nf = nf.replace(/[^a-zA-Z0-9_-]/g, ''); // limpiar
    if(!nf.endsWith('/')) nf += '/';
    
    if(!virtualFolders.includes(nf)) {
        virtualFolders.push(nf);
        renderFoldersList();
    }
    document.getElementById('cat-new-folder').value = '';
}

function seleccionarCarpeta(path) {
    catCurrentPath = path;
    document.getElementById('cat-current-path').innerText = path === '' ? 'Raíz (/)' : path;
    renderFoldersList();
    cargarArchivosDirectorio();
}

async function cargarArchivosDirectorio() {
    const grid = document.getElementById('cat-gallery-grid');
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:3rem;">Consultando nube...</p>';
    
    try {
        const { data, error } = await window.DB.storage.from(BUCKET_NAME).list(catCurrentPath, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

        if(error) throw error;
        
        // Filter out folders (which supabase returns as empty files sometimes, or without metadata)
        const files = data.filter(f => f.name !== '.emptyFolderPlaceholder' && f.metadata);

        if(files.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--pos-gray); padding:3rem;">Directorio vacío.</p>';
            return;
        }

        grid.innerHTML = '';
        files.forEach(f => {
            const { data: pubData } = window.DB.storage.from(BUCKET_NAME).getPublicUrl(catCurrentPath + f.name);
            const publicUrl = pubData.publicUrl;
            
            // Check if Image
            const isImage = f.metadata.mimetype && f.metadata.mimetype.startsWith('image/');

            const card = document.createElement('div');
            card.style.cssText = "background:#F7FAFC; border:1px solid #E2E8F0; border-radius:8px; overflow:hidden; position:relative; display:flex; flex-direction:column;";
            
            let preview = isImage 
                ? `<img src="${publicUrl}" style="width:100%; height:120px; object-fit:cover;">`
                : `<div style="height:120px; display:flex; align-items:center; justify-content:center; font-size:3rem; background:#EEE;">📄</div>`;

            card.innerHTML = `
                ${preview}
                <div style="padding:10px; font-size:0.8rem; word-break:break-all; flex-grow:1;">
                    <strong>${f.name}</strong>
                </div>
                <div style="display:flex; border-top:1px solid #E2E8F0;">
                    <button style="flex:1; border:none; background:#FFF; border-right:1px solid #E2E8F0; cursor:pointer; padding:8px;" onclick="copiarUrl('${publicUrl}')">Copiar URL</button>
                    <button style="flex:1; border:none; background:#FFF; color:red; cursor:pointer;" onclick="eliminarArchivoStorage('${f.name}')">Borrar</button>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch(err) {
        console.error(err);
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:red; padding:3rem;">Error de Storage: Verifica que el bucket "${BUCKET_NAME}" exista y sea PÚBLICO en Supabase.</p>`;
    }
}

async function subirArchivos() {
    const input = document.getElementById('cat-file-input');
    const files = input.files;
    if(files.length === 0) return;

    // Loading State
    const grid = document.getElementById('cat-gallery-grid');
    grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; padding:3rem;">Subiendo a la nube, por favor espera...</p>';

    try {
        for(let i=0; i < files.length; i++){
            const file = files[i];
            const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const filePath = catCurrentPath + Date.now() + "_" + safeName;
            
            const { error } = await window.DB.storage.from(BUCKET_NAME).upload(filePath, file, { cacheControl: '3600', upsert: false });
            if(error) throw error;
        }
        alert("¡Archivos cargados al Storage exitosamente!");
        input.value = '';
        cargarArchivosDirectorio();
    } catch(err) {
        console.error(err);
        alert("Error de subida: " + err.message);
        cargarArchivosDirectorio();
    }
}

async function eliminarArchivoStorage(filename) {
    if(!confirm(`¿Destruir archivo ${filename} permanentemente?`)) return;
    try {
        const { error } = await window.DB.storage.from(BUCKET_NAME).remove([catCurrentPath + filename]);
        if(error) throw error;
        cargarArchivosDirectorio();
    } catch(err) {
        console.error(err);
        alert("Error borrando el archivo: " + err.message);
    }
}

function copiarUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert("URL copiada al portapapeles. ¡Pégala en tu Receta o Producto!");
    });
}

// ==========================================
// MÓDULO ERP: FINANZAS E INTELIGENCIA ARTIFICIAL
// ==========================================

async function initFinanzas() {
    if(!window.DB) return;
    
    const idIngresos = document.getElementById('fin-ingresos');
    const idUtilidad = document.getElementById('fin-utilidad');
    const idStockBtn = document.getElementById('fin-stock');
    const tbody = document.getElementById('tabla-finanzas');
    
    idIngresos.innerText = 'Calculando...';
    idUtilidad.innerText = '...';
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Sincronizando Libro Contable...</td></tr>';
    
    try {
        // 1. Obtener Transacciones Financieras
        const { data, error } = await window.DB.from('erp_finanzas')
            .select('*').order('fecha', { ascending: false }).limit(50);
            
        if(error) throw error;
        
        // Sumatorias
        let totalIngreso = 0;
        let totalEgreso = 0; // Si existieran compras manuales registradas en BD
        
        tbody.innerHTML = '';
        if(!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Libro Mayor Mágico limpio. Sin movimientos.</td></tr>';
        } else {
            data.forEach((trx, i) => {
                if(trx.tipo === 'ingreso') totalIngreso += parseFloat(trx.monto);
                else parseFloat(totalEgreso += trx.monto);
                
                // Mostrar solo los ultimos 15
                if(i < 15) {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = "1px solid #EEE";
                    const isIng = trx.tipo === 'ingreso';
                    tr.innerHTML = `
                        <td style="padding:10px;">FIN-${trx.id_registro}</td>
                        <td style="padding:10px;">${trx.descripcion}</td>
                        <td style="padding:10px; color:${isIng ? 'green' : 'red'}; font-weight:bold;">${trx.tipo.toUpperCase()}</td>
                        <td style="padding:10px; text-align:right;">$${trx.monto}</td>
                    `;
                    tbody.appendChild(tr);
                }
            });
        }
        
        let util = totalIngreso - totalEgreso;
        idIngresos.innerText = `$${totalIngreso.toFixed(2)}`;
        idUtilidad.innerText = `$${util.toFixed(2)}`;
        idUtilidad.style.color = util >= 0 ? '#276749' : 'red';
        
        // 2. Obtener Stock Global Físico
        const { data: sData } = await window.DB.from('producto_variantes').select('stock');
        let stockGlobal = 0;
        if(sData) {
            sData.forEach(s => stockGlobal += (s.stock || 0));
        }
        idStockBtn.innerText = `${stockGlobal} Uds Físicas`;

    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error contactando al Sistema Financiero Nube.</td></tr>';
    }
}

// Simulador de Agente IA con Estocástica Financiera Básica
function generarAuditoriaIA() {
    const box = document.getElementById('ai-chat-output');
    box.innerHTML = `<i>[MonarcaBrain] Despertando clústeres neuronales... Analizando transacciones...</i>`;
    
    const ingreso = parseFloat(document.getElementById('fin-ingresos').innerText.replace('$','')) || 0;
    const stock = parseInt(document.getElementById('fin-stock').innerText) || 0;
    
    setTimeout(() => {
        let msg = `<b>[REPORTE CEO]</b><br><br>`;
        if(ingreso === 0 && stock === 0) {
            msg += `La matriz está en etapa cero. Aún no detecto ventas ni inventario empaquetado. <b>Recomendación:</b> Asegura que la Cocina despache Lotes en el portal de Producción para llenar la bóveda.`;
        } else if (ingreso === 0 && stock > 0) {
            msg += `Veo un capital físico atrapado de <b>${stock} Unidades esperando ser vendidas</b>. No hay ingresos reportados. <b>Recomendación:</b> Desata una campaña de Marketing en Mostrador. La repisa está llena pero la caja está triste.`;
        } else if (ingreso > 0 && stock < 5) {
            msg += `El dinero está fluyendo maravillosamente ($${ingreso.toFixed(2)} acumulados). <b>¡ALERTA ROJA MATEMÁTICA!</b> Tienes menos de 5 unidades en toda la casa. Estás a punto de quedarte sin balas. Encrucijada: Acelera Producción.`;
        } else {
            msg += `El imperio sigue en pie. Con un flujo de caja de $${ingreso.toFixed(2)} y ${stock} unidades en el arsenal físico. Mi red neuronal aprueba tu gestión. Procede con expansiones si es necesario.`;
        }
        msg += `<br><br><span style="color:var(--pos-primary);">» Predicción de demanda a 7 días calculada.</span>`;
        box.innerHTML = msg;
    }, 2000);
}

// ==========================================
// MÓDULO ERP: CONTROL DE USUARIOS
// ==========================================

async function initUsuarios() {
    if(!window.DB) return;
    const tbody = document.getElementById('tabla-usuarios');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Sondeando a todos los súbditos Monarca...</td></tr>';
    
    try {
        const { data, error } = await window.DB.from('perfiles_cliente').select('*').order('puntos', { ascending: false });
        if(error) throw error;
        
        tbody.innerHTML = '';
        data.forEach(user => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #EEE";
            
            // Render select para Rol
            let rolSelector = `
                <select onchange="cambiarRolUsuario('${user.id}', this.value)" style="padding:5px; border-radius:4px; border:1px solid #CCC; font-size:0.85rem; width:100%; max-width:200px;">
                    <option value="1" ${user.id_rol === 1 ? 'selected' : ''}>👑 Emperador Admin</option>
                    <option value="2" ${user.id_rol === 2 ? 'selected' : ''}>👤 Súbdito Civil (Cliente)</option>
                    <option value="3" ${user.id_rol === 3 ? 'selected' : ''}>👨‍🍳 Caballero Staff</option>
                </select>
            `;

            // Map Corona (Lealtad)
            let coronaTxt = "Miembro Base";
            let clr = "#000";
            if(user.puntos >= 500) { coronaTxt = 'Corona Rey'; clr = '#D4AF37'; }
            else if(user.puntos >= 100) { coronaTxt = 'Corona Duque'; clr = '#718096'; }

            const nombreDisplay = user.nombre_completo || 'Usuario sin nombre';

            tr.innerHTML = `
                <td style="padding:10px;">
                    <div style="font-weight:bold;">${nombreDisplay}</div>
                    <div style="font-size:0.8rem; color:var(--pos-gray);">ID: ${user.id.split('-')[0]}***</div>
                </td>
                <td style="padding:10px; font-weight:bold; color:${clr};">${coronaTxt}</td>
                <td style="padding:10px;">${rolSelector}</td>
                <td style="padding:10px; text-align:right; font-weight:bold;">${user.puntos || 0} pts</td>
            `;
            tbody.appendChild(tr);
        });

    } catch(err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red; padding:20px;">Error leyendo tabla de perfiles.</td></tr>';
    }
}

async function cambiarRolUsuario(userId, newRol) {
    if(!confirm("¿Estás seguro de cambiar el nivel de acceso de este usuario?")) {
        initUsuarios(); // Revertir visualmente
        return;
    }
    
    try {
        const { error } = await window.DB.from('perfiles_cliente').update({ id_rol: parseInt(newRol) }).eq('id', userId);
        if(error) throw error;
        alert("Nivel de acceso actualizado correctamente en el Imperio.");
    } catch(err) {
        console.error(err);
        alert("Error al actualizar el rol: " + err.message);
        initUsuarios();
    }
}

async function registrarColaborador(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('nu-nombre').value;
    const email = document.getElementById('nu-email').value;
    const password = document.getElementById('nu-password').value;
    const rol = parseInt(document.getElementById('nu-rol').value);
    
    if(!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        alert("Error crítico: Las credenciales del servidor no están expuestas en db.js");
        return;
    }

    // Instanciar cliente secundario para no desloguear al administrador actual
    const tempClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });

    try {
        // 1. Registrar usuario en Auth
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { nombre_completo: nombre }
            }
        });

        if(authError) throw authError;

        if(!authData.user) {
            throw new Error("No se pudo obtener el ID del usuario. Verifica si existe.");
        }

        const nuevoUserId = authData.user.id;

        // 2. Esperar 1.5s por si el trigger de Supabase que inserta el perfil se está ejecutando
        await new Promise(r => setTimeout(r, 1500));

        const { data: checkData } = await window.DB.from('perfiles_cliente').select('id').eq('id', nuevoUserId).single();
        
        if (checkData) {
            // Ya existe (Trigger funcionó), actualizamos Rol
            const { error: updErr } = await window.DB.from('perfiles_cliente').update({ id_rol: rol }).eq('id', nuevoUserId);
            if (updErr) console.warn("No se pudo actualizar rol", updErr);
        } else {
            // Insertar manual si no hubo trigger
            const { error: insErr } = await window.DB.from('perfiles_cliente').insert({
                id: nuevoUserId,
                nombre_completo: nombre,
                id_rol: rol,
                puntos: 0
            });
            if (insErr) throw insErr;
        }

        alert(`¡Colaborador ${nombre} registrado exitosamente!\nAhora puede iniciar sesión con su correo y contraseña.`);
        
        // Limpiar formulario y actualizar tabla
        document.getElementById('form-nuevo-usuario').reset();
        initUsuarios();

    } catch (err) {
        console.error(err);
        alert("Error creando al colaborador: " + err.message);
    }
}

// ==========================================
// MÓDULO INVENTARIO: ALTA DE PRODUCTOS
// ==========================================

async function abrirModalNuevoProducto() {
    document.getElementById('modal-nuevo-producto').style.display = 'flex';
    document.getElementById('form-nuevo-producto').reset();
    document.getElementById('np-variantes-container').innerHTML = '';
    document.getElementById('np-id-producto').value = '';
    document.getElementById('modal-np-title').innerText = 'Nuevo Producto de Catálogo';
    document.getElementById('modal-np-submit').innerText = 'Registrar Producto Oficial';
    
    // Add first variant by default
    addVarianteRow();

    // Load categories
    try {
        const { data, error } = await window.DB.from('categorias').select('id_categoria, nombre').order('nombre');
        if (error) throw error;
        const select = document.getElementById('np-categoria');
        select.innerHTML = '<option value="">Selecciona Categoría...</option>';
        data.forEach(c => {
            select.innerHTML += `<option value="${c.id_categoria}">${c.nombre}</option>`;
        });
    } catch(err) {
        console.error("Error loading categories:", err);
    }
}

async function abrirModalEditarProducto(idProducto) {
    document.getElementById('modal-nuevo-producto').style.display = 'flex';
    document.getElementById('form-nuevo-producto').reset();
    document.getElementById('np-variantes-container').innerHTML = '';
    document.getElementById('np-id-producto').value = idProducto;
    document.getElementById('modal-np-title').innerText = 'Editar Producto Oficial';
    document.getElementById('modal-np-submit').innerText = 'Actualizar Producto';

    try {
        // Load categories first
        const { data: catData, error: catErr } = await window.DB.from('categorias').select('id_categoria, nombre').order('nombre');
        if (catErr) throw catErr;
        const select = document.getElementById('np-categoria');
        select.innerHTML = '<option value="">Selecciona Categoría...</option>';
        catData.forEach(c => {
            select.innerHTML += `<option value="${c.id_categoria}">${c.nombre}</option>`;
        });

        // Load product data
        const { data: prodData, error: prodErr } = await window.DB.from('productos')
            .select('*, producto_variantes(*)')
            .eq('id_producto', idProducto)
            .single();
        if(prodErr) throw prodErr;

        document.getElementById('np-nombre').value = prodData.nombre || '';
        document.getElementById('np-categoria').value = prodData.id_categoria || '';
        document.getElementById('np-sabor').value = prodData.sabor || '';
        document.getElementById('np-tipo').value = prodData.tipo_precio || 'normal';
        document.getElementById('np-descripcion').value = prodData.descripcion || '';

        // Load variants
        const activas = prodData.producto_variantes.filter(v => v.activo);
        if(activas.length === 0) {
            addVarianteRow();
        } else {
            activas.forEach(v => addVarianteRow(v));
        }

    } catch(err) {
        console.error("Error al cargar producto para editar", err);
        alert("Error cargando el producto.");
        cerrarModalNuevoProducto();
    }
}

function cerrarModalNuevoProducto() {
    document.getElementById('modal-nuevo-producto').style.display = 'none';
}

function addVarianteRow(varData = null) {
    const container = document.getElementById('np-variantes-container');
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginBottom = '10px';
    row.style.alignItems = 'flex-end';
    
    let idInput = varData && varData.id_variante ? `<input type="hidden" class="np-var-id" value="${varData.id_variante}">` : `<input type="hidden" class="np-var-id" value="">`;
    let valTamano = varData && varData.tamaño ? varData.tamaño : '';
    let valPrecio = varData && varData.precio_venta ? varData.precio_venta : '';

    row.innerHTML = `
        ${idInput}
        <div style="flex:2;">
            <label style="display:block; margin-bottom:5px; font-size:0.8rem; font-weight:bold;">Tamaño (Ej. Individual, 20 Personas)</label>
            <input type="text" class="np-var-tamano" required style="width:100%; padding:8px; border-radius:6px; border:1px solid #CCC; box-sizing:border-box;" value="${valTamano}">
        </div>
        <div style="flex:1;">
            <label style="display:block; margin-bottom:5px; font-size:0.8rem; font-weight:bold;">Precio Venta ($)</label>
            <input type="number" class="np-var-precio" required min="0" step="0.01" style="width:100%; padding:8px; border-radius:6px; border:1px solid #CCC; box-sizing:border-box;" value="${valPrecio}">
        </div>
        <div>
            <button type="button" class="btn" style="background:#E53E3E; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">X</button>
        </div>
    `;
    container.appendChild(row);
}

async function guardarNuevoProducto(event) {
    event.preventDefault();
    
    const idProductoEdicion = document.getElementById('np-id-producto').value;
    const nombre = document.getElementById('np-nombre').value;
    const categoria = document.getElementById('np-categoria').value;
    const sabor = document.getElementById('np-sabor').value;
    const tipo = document.getElementById('np-tipo').value;
    const descripcion = document.getElementById('np-descripcion').value;
    
    // Extract variants
    const varianteElements = document.querySelectorAll('#np-variantes-container > div');
    if(varianteElements.length === 0) {
        return alert("Debes añadir al menos un tamaño (variante) para este producto.");
    }

    const variantes = [];
    varianteElements.forEach(row => {
        const idVar = row.querySelector('.np-var-id').value;
        const tamano = row.querySelector('.np-var-tamano').value;
        const precio = parseFloat(row.querySelector('.np-var-precio').value);
        variantes.push({ id_variante: idVar, tamaño: tamano, precio_venta: precio });
    });

    try {
        let finalIdProducto = idProductoEdicion;

        if (idProductoEdicion) {
            // UPDATE EXISTING PRODUCT
            const { error: prodError } = await window.DB.from('productos').update({
                nombre: nombre,
                id_categoria: categoria,
                sabor: sabor,
                tipo_precio: tipo,
                descripcion: descripcion
            }).eq('id_producto', idProductoEdicion);
            if (prodError) throw prodError;

            // Handle variants
            // 1. Get existing variants from DB
            const { data: extVars } = await window.DB.from('producto_variantes').select('id_variante').eq('id_producto', idProductoEdicion);
            const extIds = extVars ? extVars.map(v => v.id_variante) : [];
            const formIds = variantes.map(v => parseInt(v.id_variante)).filter(id => !isNaN(id));

            // 2. Deactivate removed variants
            const removedIds = extIds.filter(id => !formIds.includes(id));
            if(removedIds.length > 0) {
                for(let rId of removedIds) {
                    await window.DB.from('producto_variantes').update({ activo: false }).eq('id_variante', rId);
                }
            }

            // 3. Upsert variants from form
            for (let v of variantes) {
                if (v.id_variante) {
                    await window.DB.from('producto_variantes').update({
                        tamaño: v.tamaño,
                        precio_venta: v.precio_venta
                    }).eq('id_variante', v.id_variante);
                } else {
                    await window.DB.from('producto_variantes').insert({
                        id_producto: idProductoEdicion,
                        tamaño: v.tamaño,
                        precio_venta: v.precio_venta,
                        stock: 0,
                        activo: true
                    });
                }
            }

            alert(`¡Producto "${nombre}" actualizado correctamente!`);

        } else {
            // INSERT NEW PRODUCT
            const { data: prodData, error: prodError } = await window.DB.from('productos').insert({
                nombre: nombre,
                id_categoria: categoria,
                sabor: sabor,
                tipo_precio: tipo,
                descripcion: descripcion,
                activo: true
            }).select('id_producto').single();

            if (prodError) throw prodError;
            finalIdProducto = prodData.id_producto;

            const variantsToInsert = variantes.map(v => ({
                id_producto: finalIdProducto,
                tamaño: v.tamaño,
                precio_venta: v.precio_venta,
                stock: 0,
                activo: true
            }));

            const { error: varError } = await window.DB.from('producto_variantes').insert(variantsToInsert);
            if(varError) throw varError;

            alert(`¡Producto "${nombre}" registrado correctamente en la base de datos!`);
        }

        cerrarModalNuevoProducto();
        loadInventarioTerminados();

    } catch(err) {
        console.error(err);
        alert("Error al guardar el producto: " + err.message);
    }
}

function toggleNuevaCategoria() {
    const selectorGroup = document.getElementById('np-cat-selector-group');
    const nuevaGroup = document.getElementById('np-cat-nueva-group');
    const inputNombre = document.getElementById('np-nueva-cat-nombre');
    
    if (nuevaGroup.style.display === 'none') {
        selectorGroup.style.display = 'none';
        nuevaGroup.style.display = 'flex';
        inputNombre.focus();
    } else {
        selectorGroup.style.display = 'flex';
        nuevaGroup.style.display = 'none';
        inputNombre.value = '';
    }
}

async function guardarNuevaCategoria() {
    const inputNombre = document.getElementById('np-nueva-cat-nombre');
    const nombre = inputNombre.value;
    
    if (!nombre || nombre.trim() === "") {
        return alert("Por favor, ingresa un nombre para la categoría.");
    }
    
    try {
        const { data, error } = await window.DB.from('categorias').insert({
            nombre: nombre.trim(),
            activo: true
        }).select().single();
        
        if (error) throw error;
        
        // Añadir al desplegable y seleccionarlo
        const select = document.getElementById('np-categoria');
        select.innerHTML += `<option value="${data.id_categoria}">${data.nombre}</option>`;
        select.value = data.id_categoria;
        
        alert(`Categoría "${data.nombre}" creada correctamente.`);
        
        // Volver a la vista normal
        toggleNuevaCategoria();
    } catch(err) {
        console.error("Error creando categoría:", err);
        alert("Hubo un error al crear la categoría: " + err.message);
    }
}// ==========================================
// MÓDULO 2: PEDIDOS ESPECIALES (WEB Y POS)
// ==========================================
window.pedidosGlobal = [];
window.currentCalDate = new Date();
window.selectedDateFilter = null;

window.initPedidos = async function() {
    if(!window.DB) return;
    
    try {
        const {data: pedidos, error} = await window.DB.from('pedidos')
            .select('*, detalle_pedido(*, producto_variantes(tamaño, productos(nombre, imagen_url))), perfiles_cliente(nombre_completo, email, telefono), pagos(*)')
            .order('fecha_pedido', {ascending: false});
            
        if(error) throw error;
        
        window.pedidosGlobal = pedidos || [];
        
        renderCalendar();
        renderPosPedidos();
        
    } catch(err) {
        console.error(err);
        alert("Error cargando bandeja de pedidos: " + err.message);
    }
};

window.changeMonth = function(delta) {
    window.currentCalDate.setMonth(window.currentCalDate.getMonth() + delta);
    renderCalendar();
};

window.filterPedidosByDate = function(dateStr) {
    window.selectedDateFilter = dateStr;
    renderCalendar(); // To update selected visual state
    renderPosPedidos();
};

window.renderCalendar = function() {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const year = window.currentCalDate.getFullYear();
    const month = window.currentCalDate.getMonth();
    
    document.getElementById('cal-month-year').innerText = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const grid = document.getElementById('calendar-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    // Fill empty slots
    for(let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }
    
    // Contar pedidos por fecha de entrega
    const countsPorDia = {};
    window.pedidosGlobal.forEach(p => {
        // Asume que las entregas que importan son las que no están 'entregado'
        if (p.estado === 'entregado') return;
        
        // Si tiene fecha_entrega (A YYYY-MM-DD format)
        let fStr = p.fecha_entrega;
        if(!fStr && p.detalle_pedido && p.detalle_pedido[0]?.observaciones_cliente) {
            // Intentar extraer "Entrega: YYYY-MM-DD" de notasTexto
            const match = p.detalle_pedido[0].observaciones_cliente.match(/Entrega:\s*(\d{4}-\d{2}-\d{2})/);
            if(match) fStr = match[1];
        }
        if(!fStr) {
            // Fallback a fecha de creacion
            fStr = p.fecha_pedido.split('T')[0];
        }
        
        if(fStr) countsPorDia[fStr] = (countsPorDia[fStr] || 0) + 1;
    });

    const todayStr = new Date().toISOString().split('T')[0];

    for(let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasOrders = countsPorDia[dStr] > 0;
        
        let dotsHtml = '';
        if(hasOrders) {
            dotsHtml = `<div style="display:flex; justify-content:center; gap:2px; margin-top:2px;">`;
            const dotsCount = Math.min(countsPorDia[dStr], 3); // Max 3 dots visual
            for(let d=0; d<dotsCount; d++) dotsHtml += `<div style="width:4px; height:4px; background:var(--gold-primary); border-radius:50%;"></div>`;
            if(countsPorDia[dStr] > 3) dotsHtml += `<div style="width:4px; height:4px; background:var(--pos-gray); border-radius:50%;"></div>`; // Indicator of more
            dotsHtml += `</div>`;
        }

        const isSelected = window.selectedDateFilter === dStr;
        const isToday = dStr === todayStr;
        
        let bg = 'transparent';
        let color = 'var(--pos-text)';
        if (isSelected) {
            bg = 'var(--black-accent)';
            color = '#FFF';
        } else if (isToday) {
            bg = '#E2E8F0';
        }

        grid.innerHTML += `
            <div onclick="filterPedidosByDate('${dStr}')" style="padding:5px 0; border-radius:6px; cursor:pointer; background:${bg}; color:${color}; transition:all 0.2s; position:relative;">
                ${i}
                ${dotsHtml}
            </div>
        `;
    }
};

window.renderPosPedidos = function() {
    const contPendientes = document.getElementById('pedidos-pendientes');
    const contAprobados = document.getElementById('pedidos-aprobados');
    const contHistorial = document.getElementById('pedidos-historial');
    
    if(!contPendientes || !contAprobados || !contHistorial) return;
    
    contPendientes.innerHTML = '';
    contAprobados.innerHTML = '';
    contHistorial.innerHTML = '';
    
    let renderCount = 0;

    window.pedidosGlobal.forEach(p => {
        let fStr = p.fecha_entrega;
        if(!fStr && p.detalle_pedido && p.detalle_pedido[0]?.observaciones_cliente) {
            const match = p.detalle_pedido[0].observaciones_cliente.match(/Entrega:\s*(\d{4}-\d{2}-\d{2})/);
            if(match) fStr = match[1];
        }
        if(!fStr) fStr = p.fecha_pedido.split('T')[0];

        // Filtro por fecha si aplica
        if(window.selectedDateFilter && fStr !== window.selectedDateFilter) return;

        renderCount++;

        const det = (p.detalle_pedido && p.detalle_pedido.length > 0) ? p.detalle_pedido[0] : null;
        const nombreProd = det?.producto_variantes?.productos?.nombre || 'Orden Personalizada';
        const imagenProd = det?.producto_variantes?.productos?.imagen_url || 'img/luxury_pastries.png';
        const notasCli = det?.observaciones_cliente ? det.observaciones_cliente.split('[IMG_REF]')[0].trim() : 'Sin notas';
        
        const isGuest = !p.id_cliente;
        let clienteNombre = isGuest ? (p.nombre_invitado || 'Invitado') : (p.perfiles_cliente?.nombre_completo || p.perfiles_cliente?.email || 'Cliente');
        let clienteEmail = isGuest ? (p.email_invitado || '') : (p.perfiles_cliente?.email || '');
        let clienteTel = p.perfiles_cliente?.telefono ? ` - 📱 ${p.perfiles_cliente.telefono}` : '';
        
        const card = document.createElement('div');
        card.style = "background:#FFF; border:1px solid #E2E8F0; padding:15px; border-radius:8px; margin-bottom:15px; box-shadow:0 2px 4px rgba(0,0,0,0.02); position:relative;";
        
        let actionBtn = `<button class="btn btn-black" style="width:100%; margin-top:10px;" onclick="abrirDetallesPedido(${p.id_pedido})">Ver Detalles</button>`;

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span style="font-weight:bold; font-family:var(--font-heading);">${p.folio}</span>
                <span style="font-size:0.85rem; color:var(--pos-gray); background:#EDF2F7; padding:2px 8px; border-radius:10px;">📅 ${fStr}</span>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <img src="${imagenProd}" alt="${nombreProd}" style="width:50px; height:50px; object-fit:cover; border-radius:6px; border:1px solid #E2E8F0;">
                <div>
                    <h4 style="margin:0; font-size:1.1rem;">${nombreProd}</h4>
                    <p style="margin:5px 0 0 0; font-size:0.85rem; color:var(--pos-gray);"><i class="fas fa-user"></i> ${clienteNombre} ${clienteEmail ? `(${clienteEmail})` : ''}</p>
                </div>
            </div>
            <div style="background:#F7FAFC; padding:10px; border-radius:6px; font-size:0.85rem; margin-bottom:10px; border-left:3px solid var(--gold-primary);">
                <strong>Detalles:</strong><br>${notasCli.replace(/\n/g, '<br>')}
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; margin-bottom: 5px;">
                <span>Total: $${p.total}</span>
                <span style="color:${p.estado === 'pendiente' ? '#E59E27' : (p.estado === 'esperando_pago' ? '#E53E3E' : (p.estado === 'confirmado' ? '#2E7D32' : '#1976D2'))};">${p.estado.toUpperCase()}</span>
            </div>
            ${p.anticipo > 0 ? `<div style="font-size:0.85rem; color:#2E7D32; font-weight:bold;">Anticipo Pagado: $${p.anticipo} (Resta: $${p.total - p.anticipo})</div>` : ''}
            ${actionBtn}
        `;
        
        if (p.estado === 'pendiente' || p.estado === 'esperando_pago') contPendientes.appendChild(card);
        else if (p.estado === 'confirmado') contAprobados.appendChild(card);
        else contHistorial.appendChild(card);
    });

    if(renderCount === 0) {
        const msg = window.selectedDateFilter ? `No hay pedidos para ${window.selectedDateFilter}` : 'Bandeja vacía';
        contPendientes.innerHTML = `<p style="text-align:center; color:var(--pos-gray);">${msg}</p>`;
    }
};

window.cambiarEstadoPedido = async function(id, nuevoEstado) {
    if(!confirm(`¿Seguro que deseas cambiar el pedido al estado: ${nuevoEstado.toUpperCase()}?`)) return;
    try {
        const {data, error} = await window.DB.from('pedidos')
            .update({estado: nuevoEstado})
            .eq('id_pedido', id)
            .select();
            
        if(error) throw error;
        
        if(!data || data.length === 0) {
            throw new Error("No se pudo actualizar. Es probable que necesites agregar una Política RLS en Supabase que permita hacer UPDATE a la tabla 'pedidos', o el pedido ya no existe.");
        }
        
        await window.initPedidos();
        alert(`✅ Pedido actualizado correctamente a: ${nuevoEstado.toUpperCase()}`);
    } catch(err) {
        alert("Error al actualizar: " + err.message);
    }
};

window.abrirCobroAnticipo = async function(folio, total, anticipoActual, id_pedido) {
    const restante = total - anticipoActual;
    const input = prompt(`Cobro Físico - Pedido ${folio}\nTotal: $${total}\nPagado: $${anticipoActual}\nResta: $${restante}\n\nIngresa el monto exacto que el cliente está abonando hoy (Efectivo/Terminal):`, restante);
    
    if (input === null || input.trim() === '') return;
    
    const abono = parseFloat(input);
    if (isNaN(abono) || abono <= 0) return alert("Monto inválido.");
    
    if (abono > restante) return alert("El abono no puede ser mayor al monto restante de la orden.");
    
    try {
        const nuevoAnticipo = anticipoActual + abono;
        
        const { error: err1 } = await window.DB.from('pedidos')
            .update({ anticipo: nuevoAnticipo })
            .eq('id_pedido', id_pedido);
        if (err1) throw err1;
        
        await window.DB.from('erp_finanzas').insert({
            tipo: 'ingreso',
            categoria: 'anticipo_pedido',
            monto: abono,
            metodo: 'mostrador',
            descripcion: `Abono físico en caja para pedido especial ${folio}`,
            id_pedido: id_pedido
        });
        
        // Si ya cubrió el 50% mínimo, se manda a producción automático
        if (nuevoAnticipo >= (total / 2)) {
            await window.DB.from('pedidos').update({ estado: 'confirmado' }).eq('id_pedido', id_pedido);
            alert(`✅ Abono de $${abono} registrado con éxito.\nEl pedido ha alcanzado el anticipo mínimo (50%) y fue enviado a 🟢 PRODUCCIÓN.`);
        } else {
            alert(`✅ Abono de $${abono} registrado con éxito.\nAún no alcanza el 50% para pasar a producción.`);
        }
        
        window.initPedidos();
    } catch(e) {
        alert("Error guardando el abono en BD: " + e.message);
    }
};

// ==========================================
// MODAL DE DETALLES MAESTROS
// ==========================================
window.currentDetallePedidoId = null;

window.abrirDetallesPedido = function(id_pedido) {
    const p = window.pedidosGlobal.find(x => x.id_pedido === id_pedido);
    if(!p) return;
    
    window.currentDetallePedidoId = id_pedido;

    document.getElementById('md-folio').innerText = p.folio;
    
    // Usuarios robusto
    const isGuest = !p.id_cliente;
    const clientName = isGuest ? (p.nombre_invitado || 'Invitado') : (p.perfiles_cliente?.nombre_completo || p.perfiles_cliente?.email || 'Cliente sin nombre registrado');
    const clientTel = p.perfiles_cliente?.telefono ? ` 📱 ${p.perfiles_cliente.telefono}` : ' 📱 Sin teléfono';
    const clientEmail = isGuest ? (p.email_invitado || '📧 Sin correo') : (`📧 ${p.perfiles_cliente?.email || 'Sin correo'}${clientTel}`);
    
    document.getElementById('md-cliente').innerText = clientName;
    document.getElementById('md-email').innerText = clientEmail;
    
    const badge = document.getElementById('md-estado-badge');
    badge.innerText = p.estado.toUpperCase();
    badge.style.background = p.estado === 'pendiente' ? '#FEEBC8' : (p.estado === 'esperando_pago' ? '#FED7D7' : (p.estado === 'confirmado' ? '#C6F6D5' : '#BEE3F8'));
    badge.style.color = p.estado === 'pendiente' ? '#DD6B20' : (p.estado === 'esperando_pago' ? '#E53E3E' : (p.estado === 'confirmado' ? '#2F855A' : '#2B6CB0'));

    const det = (p.detalle_pedido && p.detalle_pedido.length > 0) ? p.detalle_pedido[0] : null;
    document.getElementById('md-producto').innerText = det?.producto_variantes?.productos?.nombre || 'Orden Personalizada';
    document.getElementById('md-prod-img').src = det?.producto_variantes?.productos?.imagen_url || 'img/luxury_pastries.png';
    
    // Parsear Notas y buscar Imágenes de Inspiración
    let notasBrutas = det?.observaciones_cliente || 'Sin notas';
    let urlsInspiracion = [];
    if (notasBrutas.includes('[IMG_REF]')) {
        let parts = notasBrutas.split('[IMG_REF]');
        notasBrutas = parts[0].trim();
        urlsInspiracion = parts.slice(1).map(u => u.trim()).filter(u => u);
    }
    document.getElementById('md-notas').innerText = notasBrutas;

    const boxInspiracion = document.getElementById('md-inspiracion-box');
    const imgsInspiracionContainer = document.getElementById('md-inspiracion-imgs');
    if (urlsInspiracion.length > 0) {
        boxInspiracion.style.display = 'block';
        imgsInspiracionContainer.innerHTML = urlsInspiracion.map(url => `
            <a href="${url}" target="_blank">
                <img src="${url}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; border:2px solid var(--gold-primary);">
            </a>
        `).join('');
    } else {
        boxInspiracion.style.display = 'none';
        imgsInspiracionContainer.innerHTML = '';
    }

    const isEditable = p.estado === 'pendiente' || p.estado === 'esperando_pago';
    
    const ajusteBox = document.getElementById('md-ajuste-financiero-box');
    if (isEditable) {
        ajusteBox.style.display = 'block';
        const totalInput = document.getElementById('md-total');
        totalInput.value = p.total || 0;
        totalInput.disabled = false;
        
        const motivoInput = document.getElementById('md-motivo');
        motivoInput.value = p.observaciones || '';
        motivoInput.disabled = false;
    } else {
        ajusteBox.style.display = 'none';
    }
    
    document.getElementById('md-anticipo-info').innerText = p.anticipo > 0 ? `Anticipo Pagado: $${p.anticipo} (Resta: $${(p.total - p.anticipo)})` : 'Anticipo Pagado: $0.00';

    // Manejar pagos (Transferencia)
    const comprobanteBox = document.getElementById('md-comprobante-box');
    const comprobanteLink = document.getElementById('md-comprobante-link');
    
    if(p.pagos && p.pagos.length > 0) {
        // Buscar el último pago de transferencia
        const transf = p.pagos.slice().reverse().find(pg => pg.metodo_pago === 'transferencia' && pg.comprobante_url);
        if(transf) {
            comprobanteBox.style.display = 'block';
            comprobanteLink.href = transf.comprobante_url;
        } else {
            comprobanteBox.style.display = 'none';
        }
    } else {
        comprobanteBox.style.display = 'none';
    }

    // Acciones Dinámicas
    const actContainer = document.getElementById('md-actions');
    actContainer.innerHTML = '';
    
    if(p.estado === 'pendiente') {
        actContainer.innerHTML = `
            <button class="btn btn-gold" style="flex:1;" onclick="cambiarEstadoDesdeModal(${p.id_pedido}, 'esperando_pago')">Aprobar y Pedir Anticipo</button>
            <button class="btn btn-black" style="flex:1;" onclick="guardarAjustePrecio()">Guardar Ajuste</button>
        `;
    } else if (p.estado === 'esperando_pago') {
        actContainer.innerHTML = `
            <button class="btn btn-gold" style="flex:1; font-size:0.8rem;" onclick="cobrarFisicoModal('${p.folio}', ${p.total}, ${p.anticipo || 0}, ${p.id_pedido})"><i class="fas fa-money-bill-wave"></i> Cobrar Físico</button>
            <button class="btn" style="flex:1; font-size:0.8rem; background:#EEE; color:#000; border:none;" onclick="guardarAjustePrecio()">Guardar Ajuste</button>
            <button class="btn btn-black" style="flex:1; font-size:0.8rem;" onclick="cambiarEstadoDesdeModal(${p.id_pedido}, 'confirmado')">A Producción</button>
        `;
    } else if (p.estado === 'confirmado') {
        actContainer.innerHTML = `<button class="btn btn-black" style="flex:1;" onclick="cambiarEstadoDesdeModal(${p.id_pedido}, 'entregado')">Marcar como Entregado</button>`;
    } else {
        actContainer.innerHTML = `<div style="text-align:center; width:100%; color:var(--pos-gray);">Pedido cerrado. No hay acciones disponibles.</div>`;
    }

    document.getElementById('modalDetallePedido').style.display = 'flex';
};

window.cambiarEstadoDesdeModal = async function(id, nuevoEstado) {
    document.getElementById('modalDetallePedido').style.display = 'none';
    await window.cambiarEstadoPedido(id, nuevoEstado);
};

window.cobrarFisicoModal = async function(folio, total, anticipoActual, id_pedido) {
    document.getElementById('modalDetallePedido').style.display = 'none';
    await window.abrirCobroAnticipo(folio, total, anticipoActual, id_pedido);
};

window.guardarAjustePrecio = async function() {
    const id_pedido = window.currentDetallePedidoId;
    if(!id_pedido) return;

    const p = window.pedidosGlobal.find(x => x.id_pedido === id_pedido);
    const nuevoTotal = parseFloat(document.getElementById('md-total').value);
    const nuevoMotivo = document.getElementById('md-motivo').value;

    if(isNaN(nuevoTotal) || nuevoTotal < 0) return alert("Precio inválido");

    if(nuevoTotal !== parseFloat(p.total) && nuevoMotivo.trim() === '') {
        return alert("Debes ingresar un Motivo del Ajuste para cambiar el precio.");
    }

    try {
        const {error} = await window.DB.from('pedidos')
            .update({
                total: nuevoTotal,
                observaciones: nuevoMotivo
            })
            .eq('id_pedido', id_pedido);
            
        if(error) throw error;
        
        alert("¡Ajuste Financiero guardado con éxito!");
        await window.initPedidos(); // Recargar datos
        window.abrirDetallesPedido(id_pedido); // Refrescar modal con nuevos datos
    } catch(err) {
        console.error(err);
        alert("Error guardando ajuste: " + err.message);
    }
};
