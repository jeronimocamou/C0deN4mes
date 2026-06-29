-- Adds a Spanish word pack and per-room language selection.
-- Run in the Supabase SQL editor. Idempotent / safe to re-run.

-- 1. Each game remembers which language it was created with.
alter table games add column if not exists language text not null default 'en';

-- 2. Tag word packs with a language; existing pack(s) become English.
alter table word_packs add column if not exists language text not null default 'en';
update word_packs set language = 'en' where language is null;

-- 3. Insert the Spanish pack, matching the existing `words` column type
--    (text[] vs jsonb) and including a name only if that column exists.
do $$
declare
  col_type  text;
  has_name  boolean;
  es text[] := array[
    'perro','gato','caballo','vaca','oveja','cerdo','gallina','pato','conejo','ratón',
    'león','tigre','oso','lobo','zorro','ciervo','elefante','jirafa','mono','serpiente',
    'cocodrilo','tortuga','rana','pez','tiburón','ballena','delfín','pulpo','cangrejo','araña',
    'abeja','mariposa','hormiga','águila','búho','paloma','pingüino','camello','burro','gallo',
    'sol','luna','estrella','cielo','nube','lluvia','nieve','viento','fuego','agua',
    'tierra','mar','río','lago','montaña','bosque','desierto','playa','isla','volcán',
    'cueva','roca','arena','flor','árbol','hoja','semilla','hierba','rayo','tormenta',
    'mesa','silla','cama','puerta','ventana','llave','reloj','libro','papel','lápiz',
    'pluma','espejo','vela','lámpara','botella','vaso','plato','cuchara','tenedor','cuchillo',
    'martillo','clavo','cuerda','escalera','rueda','motor','máquina','teléfono','cámara','guitarra',
    'tambor','campana','corona','anillo','collar','sombrero','zapato','guante','paraguas','maleta',
    'casa','escuela','iglesia','castillo','puente','torre','faro','granja','mercado','tienda',
    'banco','hospital','hotel','teatro','museo','parque','jardín','calle','plaza','molino',
    'pan','queso','huevo','carne','fruta','manzana','naranja','plátano','uva','limón',
    'fresa','sandía','tomate','cebolla','ajo','maíz','arroz','sopa','miel','chocolate',
    'café','leche','vino','pastel','galleta','azúcar','sal','mantequilla','helado','pizza',
    'cabeza','ojo','nariz','boca','oreja','diente','lengua','mano','dedo','brazo',
    'pierna','pie','corazón','hueso','pelo','rodilla','hombro','codo','espalda','cuello',
    'rey','reina','soldado','médico','maestro','ladrón','pirata','fantasma','dragón','bruja',
    'ángel','gigante','robot','mapa','tesoro','bandera','espada','escudo','flecha','arco',
    'bomba','cohete','avión','barco','tren','coche','bicicleta','globo','cometa','pelota'
  ];
  words_val text;
  cols text := 'language, is_default, words';
  vals text;
begin
  -- Skip if a Spanish pack is already present
  if exists (select 1 from word_packs where language = 'es') then
    raise notice 'Spanish word pack already exists — skipping insert';
    return;
  end if;

  select data_type into col_type
    from information_schema.columns
   where table_name = 'word_packs' and column_name = 'words';

  select exists (
    select 1 from information_schema.columns
     where table_name = 'word_packs' and column_name = 'name'
  ) into has_name;

  if col_type = 'ARRAY' then
    words_val := quote_literal(es::text) || '::text[]';
  else
    words_val := 'to_jsonb(' || quote_literal(es::text) || '::text[])';
  end if;

  vals := quote_literal('es') || ', false, ' || words_val;

  if has_name then
    cols := 'name, ' || cols;
    vals := quote_literal('Español') || ', ' || vals;
  end if;

  execute format('insert into word_packs (%s) values (%s)', cols, vals);
end $$;
