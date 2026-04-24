-- ==============================================================================
-- ESQUEMA OPTIMIZADO PARA SUPABASE - "MONARCA PASTELERIA"
-- ==============================================================================
-- Se han consolidado los clientes y usuarios hacia auth.users para un Login nativo.
-- Soporte preparado para Buckets de Storage (imagen_url).

-- Habilitar extensiones requeridas por Supabase (ej. uuid_generate)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: ROLES
CREATE TABLE public.roles (
  id_rol integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  creado_en timestamp without time zone DEFAULT now()
);
INSERT INTO public.roles (nombre, descripcion) VALUES ('Admin', 'Administrador supremo del sitio'), ('Cliente', 'Comprador'), ('Staff', 'Personal de Tienda');

-- 2. TABLA: PERFILES_CLIENTE (Conecta nativamente con Supabase Auth)
CREATE TABLE public.perfiles_cliente (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_rol integer REFERENCES public.roles(id_rol) DEFAULT 2, -- Por defecto rol Cliente
  nombre_completo character varying NOT NULL,
  email character varying UNIQUE,
  telefono character varying,
  direccion_principal text,
  fecha_registro timestamp without time zone DEFAULT now(),
  activo boolean DEFAULT true,
  puntos integer DEFAULT 0
);

-- RLS para que el cliente solo vea su perfil
ALTER TABLE public.perfiles_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Un cliente puede ver y actualizar su perfil" ON public.perfiles_cliente FOR ALL USING (auth.uid() = id);

-- Trigger para auto-crear perfil al registrarse en Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar el nuevo perfil con su email
  INSERT INTO public.perfiles_cliente (id, nombre_completo, email)
  VALUES (new.id, split_part(new.email, '@', 1), new.email);
  
  -- Vincular pedidos de invitado que tengan este correo al nuevo ID de usuario
  UPDATE public.pedidos 
  SET id_cliente = new.id 
  WHERE email_invitado = new.email AND id_cliente IS NULL;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. TABLA: DIRECCIONES_CLIENTE
CREATE TABLE public.direcciones_cliente (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cliente uuid REFERENCES public.perfiles_cliente(id) ON DELETE CASCADE,
  calle text NOT NULL,
  colonia text,
  ciudad text,
  estado text,
  codigo_postal character varying,
  referencia text,
  predeterminada boolean DEFAULT false,
  creada_en timestamp without time zone DEFAULT now()
);

-- 4. TABLA: CATEGORIAS Y PRODUCTOS (El Catálogo)
CREATE TABLE public.categorias (
  id_categoria integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre character varying NOT NULL,
  descripcion text,
  imagen_url text, -- Preparado para Supabase Storage URL
  activo boolean DEFAULT true
);

CREATE TABLE public.productos (
  id_producto integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre character varying NOT NULL,
  descripcion text,
  sabor character varying,
  id_categoria integer REFERENCES public.categorias(id_categoria),
  imagen_url text, -- Preparado para Supabase Storage URL
  activo boolean DEFAULT true,
  tipo_precio character varying DEFAULT 'normal'::character varying,
  creado_en timestamp without time zone DEFAULT now()
);

CREATE TABLE public.producto_variantes (
  id_variante integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_producto integer REFERENCES public.productos(id_producto) ON DELETE CASCADE,
  tamaño character varying,
  precio_venta numeric NOT NULL,
  stock integer DEFAULT 0,
  es_personalizable boolean DEFAULT false,
  activo boolean DEFAULT true
);

-- 5. TABLA: CARRITO Y DETALLE CARRITO
CREATE TABLE public.carrito (
  id_carrito integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_cliente uuid REFERENCES public.perfiles_cliente(id) ON DELETE CASCADE,
  creado_en timestamp without time zone DEFAULT now(),
  activo boolean DEFAULT true
);

CREATE TABLE public.carrito_detalle (
  id_detalle integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_carrito integer REFERENCES public.carrito(id_carrito) ON DELETE CASCADE,
  id_variante integer REFERENCES public.producto_variantes(id_variante),
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL,
  dedicatoria text,
  observaciones text
);

-- 6. TABLA: PEDIDOS Y DISEÑOS DE PASTEL (Órdenes Activas)
CREATE TABLE public.pedidos (
  id_pedido integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  folio character varying UNIQUE NOT NULL,
  id_cliente uuid REFERENCES public.perfiles_cliente(id),
  email_invitado character varying,
  nombre_invitado character varying,
  id_direccion integer REFERENCES public.direcciones_cliente(id),
  estado character varying DEFAULT 'pendiente'::character varying, -- ('pendiente', 'confirmado', 'entregado')
  origen character varying DEFAULT 'web',
  fecha_pedido timestamp without time zone DEFAULT now(),
  fecha_entrega date,
  hora_entrega time without time zone,
  subtotal numeric,
  descuento numeric DEFAULT 0,
  total numeric,
  anticipo numeric DEFAULT 0,
  restante numeric,
  observaciones text -- Notas del maestro pastelero
);

CREATE TABLE public.detalle_pedido (
  id_detalle integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido integer REFERENCES public.pedidos(id_pedido) ON DELETE CASCADE,
  id_variante integer REFERENCES public.producto_variantes(id_variante),
  cantidad integer NOT NULL,
  precio_unitario numeric NOT NULL,
  dedicatoria text,
  observaciones_cliente text
);

CREATE TABLE public.diseno_pastel (
  id_diseno integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_detalle_pedido integer REFERENCES public.detalle_pedido(id_detalle),
  pisos integer DEFAULT 1,
  tipo_base character varying,
  sabor character varying,
  descripcion text,
  mensaje text,
  imagen_referencia text, -- (Bucket upload para el diseño del cliente)
  fecha_registro timestamp without time zone DEFAULT now()
);

-- 7. TABLA: PAGOS
CREATE TABLE public.pagos (
  id_pago integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido integer REFERENCES public.pedidos(id_pedido),
  metodo_pago character varying CHECK (metodo_pago IN ('tarjeta', 'transferencia', 'efectivo', 'paypal')),
  estado_pago character varying DEFAULT 'pendiente'::character varying,
  monto numeric NOT NULL,
  referencia text,
  comprobante_url text, -- Storage Bucket
  fecha timestamp without time zone DEFAULT now()
);

-- Habilitar RLS para tablas de inventario (solo vista para usuarios anónimos)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Catálogo disponible para todo el público" ON public.productos FOR SELECT USING (activo = true);
ALTER TABLE public.producto_variantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Variantes disponibles para el público" ON public.producto_variantes FOR SELECT USING (activo = true);

-- 8. ACTUALIZACIONES DE LEALTAD
ALTER TABLE public.perfiles_cliente ADD COLUMN puntos integer DEFAULT 0;

-- ==============================================================================
-- 9. MÓDULOS DE SISTEMA EMPRESARIAL (ERP) MONARCA
-- ==============================================================================

-- 9.1 INVENTARIO DE MATERIA PRIMA (Ingredientes)
CREATE TABLE public.erp_ingredientes (
  id_ingrediente integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre character varying NOT NULL,
  unidad_medida character varying NOT NULL, -- ej. 'g', 'ml', 'pz'
  costo_promedio numeric DEFAULT 0,
  stock_actual numeric DEFAULT 0,
  stock_minimo numeric DEFAULT 0,
  activo boolean DEFAULT true
);

-- 9.2 RECETAS (Ingeniería de Menú / BOM)
CREATE TABLE public.erp_recetas (
  id_receta integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_producto integer REFERENCES public.productos(id_producto) ON DELETE CASCADE,
  descripcion_preparacion text,
  pdf_url text, -- Storage Bucket URL
  creado_en timestamp without time zone DEFAULT now()
);

-- Relación: Qué ingredientes y cuánta cantidad lleva cada receta base
CREATE TABLE public.erp_receta_ingredientes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_receta integer REFERENCES public.erp_recetas(id_receta) ON DELETE CASCADE,
  id_ingrediente integer REFERENCES public.erp_ingredientes(id_ingrediente),
  cantidad numeric NOT NULL -- Cantidad en la unidad de medida del ingrediente
);

-- 9.3 PRODUCCIÓN (Lotes y Caducidades)
CREATE TABLE public.erp_lotes_produccion (
  id_lote integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_variante integer REFERENCES public.producto_variantes(id_variante),
  cantidad_producida integer NOT NULL,
  fecha_produccion timestamp without time zone DEFAULT now(),
  fecha_caducidad date,
  estado character varying DEFAULT 'completado', -- 'preparacion', 'completado', 'merma'
  id_responsable uuid REFERENCES public.perfiles_cliente(id)
);

-- 9.4 MOVIMIENTOS DE INVENTARIO (Kardex / Ledger)
CREATE TABLE public.erp_movimientos_inventario (
  id_movimiento integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_ingrediente integer REFERENCES public.erp_ingredientes(id_ingrediente),
  id_variante integer REFERENCES public.producto_variantes(id_variante),
  tipo_movimiento character varying NOT NULL, -- 'entrada', 'salida', 'merma', 'ajuste'
  cantidad numeric NOT NULL,
  referencia text, -- ej. "Lote #5", "Compra Factura #9"
  fecha timestamp without time zone DEFAULT now()
);

-- 9.5 FINANZAS Y ESTADOS DE CUENTA
CREATE TABLE public.erp_finanzas (
  id_registro integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_pedido integer REFERENCES public.pedidos(id_pedido),
  tipo character varying NOT NULL, -- 'ingreso', 'egreso'
  categoria character varying, -- 'venta', 'pago_proveedor', 'servicios', 'nomina'
  monto numeric NOT NULL,
  metodo character varying,
  descripcion text,
  fecha timestamp without time zone DEFAULT now()
);
